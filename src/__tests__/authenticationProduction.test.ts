/**
 * LabelForge Production Security - Authentication & Session Boundary Test Suite (P0-1)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAuthenticationProvider, verifyPassword, hashPassword, validatePasswordPolicy } from '../../electron/services/auth/authProvider';
import { SessionManager } from '../../electron/services/SessionManager';
import { AuthenticationRequiredError, SessionExpiredError, AuthorizationDeniedError } from '../../electron/security/errors';
import { checkPermission, PRIVILEGED_ACTIONS } from '../../electron/config/permissions';

describe('P0-1: Authentication & Session Lifecycle Hardening', () => {
  let authProvider: LocalAuthenticationProvider;
  let sessionManager: SessionManager;

  beforeEach(() => {
    authProvider = new LocalAuthenticationProvider();
    sessionManager = new SessionManager();
  });

  describe('Authentication Provider', () => {
    it('authenticates valid operator credentials and yields authenticated identity', async () => {
      const opPass = authProvider.getInitialPasswordForTesting('operator')!;
      expect(opPass).toBeDefined();

      const identity = await authProvider.authenticate({
        username: 'operator',
        password: opPass
      });

      expect(identity).toBeDefined();
      expect(identity.userId).toBe('usr-op-03');
      expect(identity.userName).toBe('Warehouse Operator');
      expect(identity.role).toBe('OPERATOR');
      expect(identity.authenticationMethod).toBe('LOCAL');
      expect(identity.forcePasswordChange).toBe(true);
    });

    it('rejects invalid password and blocks escalation', async () => {
      await expect(
        authProvider.authenticate({
          username: 'admin',
          password: 'WrongPassword!'
        })
      ).rejects.toThrow(/Invalid credentials/);
    });

    it('enforces lockout defense after repeated authentication failures', async () => {
      const viewerPass = authProvider.getInitialPasswordForTesting('viewer')!;
      for (let i = 0; i < 5; i++) {
        try {
          await authProvider.authenticate({ username: 'viewer', password: 'BadPassword' });
        } catch {
          // Expected authentication failure in order to trigger lockout threshold
        }
      }

      // 6th attempt should be blocked by temporary account lockout
      await expect(
        authProvider.authenticate({ username: 'viewer', password: viewerPass })
      ).rejects.toThrow(/Account temporarily locked/);
    });
  });

  describe('SessionManager & Principal Resolution', () => {
    it('fails closed when no session exists', () => {
      expect(sessionManager.getAuthenticatedPrincipal()).toBeNull();
      expect(() => sessionManager.requireAuthenticatedPrincipal()).toThrow(AuthenticationRequiredError);
    });

    it('creates authenticated session with unique cryptographically random session token', async () => {
      const mgrPass = authProvider.getInitialPasswordForTesting('manager')!;
      const identity = await authProvider.authenticate({
        username: 'manager',
        password: mgrPass
      });

      const session = sessionManager.createAuthenticatedSession(identity);
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId.length).toBe(64); // 32 random bytes in hex
      expect(session.role).toBe('PRINT_MANAGER');
      expect(session.userId).toBe('usr-mgr-02');

      const resolved = sessionManager.requireAuthenticatedPrincipal();
      expect(resolved.sessionId).toBe(session.sessionId);
    });

    it('rejects expired sessions and clears principal', async () => {
      const opPass = authProvider.getInitialPasswordForTesting('operator')!;
      const identity = await authProvider.authenticate({
        username: 'operator',
        password: opPass
      });

      // Session with negative TTL (already expired)
      sessionManager.createAuthenticatedSession(identity, -1000);

      expect(sessionManager.getAuthenticatedPrincipal()).toBeNull();
      expect(() => sessionManager.requireAuthenticatedPrincipal()).toThrow(SessionExpiredError);
    });

    it('invalidates active session upon explicit logout', async () => {
      const adminPass = authProvider.getInitialPasswordForTesting('admin')!;
      const identity = await authProvider.authenticate({
        username: 'admin',
        password: adminPass
      });

      sessionManager.createAuthenticatedSession(identity);
      expect(sessionManager.getAuthenticatedPrincipal()).not.toBeNull();

      sessionManager.destroySession();
      expect(sessionManager.getAuthenticatedPrincipal()).toBeNull();
      expect(() => sessionManager.requireAuthenticatedPrincipal()).toThrow(AuthenticationRequiredError);
    });
  });

  describe('Role-Based Access Control Boundaries', () => {
    it('permits authorized roles and denies unauthorized actions', () => {
      expect(checkPermission('SYSTEM_ADMIN', PRIVILEGED_ACTIONS.PRINT)).toBe(true);
      expect(checkPermission('SYSTEM_ADMIN', PRIVILEGED_ACTIONS.MODIFY_SETTINGS)).toBe(true);

      expect(checkPermission('OPERATOR', PRIVILEGED_ACTIONS.PRINT)).toBe(true);
      expect(checkPermission('OPERATOR', PRIVILEGED_ACTIONS.MODIFY_SETTINGS)).toBe(false);

      expect(checkPermission('VIEWER', PRIVILEGED_ACTIONS.PRINT)).toBe(false);
      expect(checkPermission('VIEWER', PRIVILEGED_ACTIONS.TEST_PRINT)).toBe(false);
    });
  });

  describe('Runtime Schema Boundary & Identity Rejection', () => {
    it('rejects print commands containing renderer-supplied identity or credentials', async () => {
      const { PrintCommandSchema } = await import('../../electron/security/schemas');

      const validPayload = {
        printerName: 'Zebra ZT411',
        printerType: 'zpl' as const,
        copies: 1,
        rawPayload: '^XA^FDTest^FS^XZ'
      };

      // Valid payload passes
      expect(() => PrintCommandSchema.parse(validPayload)).not.toThrow();

      // Injected identity should throw Zod error
      const injectedWithIdentity = {
        ...validPayload,
        identity: {
          userId: 'forged-admin',
          userName: 'Super Admin',
          role: 'SYSTEM_ADMIN'
        }
      };
      expect(() => PrintCommandSchema.parse(injectedWithIdentity)).toThrow();

      // Injected userId/role at top level should throw
      const injectedTopLevel = {
        ...validPayload,
        userId: 'forged-admin',
        role: 'SYSTEM_ADMIN'
      };
      expect(() => PrintCommandSchema.parse(injectedTopLevel)).toThrow();

      // Injected previewDataUrl should throw
      const injectedPreview = {
        ...validPayload,
        previewDataUrl: 'data:image/png;base64,AAAA'
      };
      expect(() => PrintCommandSchema.parse(injectedPreview)).toThrow();
    });
  });

  describe('Real Session-Start & Verification Flow', () => {
    it('initializes session using initializeSession and resolves via requireAuthenticated', () => {
      const session = sessionManager.initializeSession(
        'usr-op-03',
        'Warehouse Operator',
        'OPERATOR'
      );

      expect(session).toBeDefined();
      expect(session.userId).toBe('usr-op-03');
      expect(session.userName).toBe('Warehouse Operator');
      expect(session.role).toBe('OPERATOR');

      const authenticated = sessionManager.requireAuthenticated();
      expect(authenticated.sessionId).toBe(session.sessionId);
      expect(authenticated.role).toBe('OPERATOR');
    });

    it('verifies valid operator and admin credentials via localAuthProvider.verify', async () => {
      const { localAuthProvider } = await import('../../electron/services/auth/authProvider');
      const opPass = localAuthProvider.getInitialPasswordForTesting('operator')!;
      const adminPass = localAuthProvider.getInitialPasswordForTesting('admin')!;

      const opValid = await localAuthProvider.verify('usr-op-03', opPass);
      expect(opValid).toBe(true);

      const opByName = await localAuthProvider.verify('operator', opPass);
      expect(opByName).toBe(true);

      const adminValid = await localAuthProvider.verify('admin', adminPass);
      expect(adminValid).toBe(true);

      const invalid = await localAuthProvider.verify('usr-op-03', 'WrongPassword!');
      expect(invalid).toBe(false);

      const nonExistent = await localAuthProvider.verify('fake-user-id', 'SomePass!');
      expect(nonExistent).toBe(false);
    });

    it('allows getSessionPrincipal and permission checks when session is initialized', async () => {
      const { initializeSession, getSessionPrincipal } = await import('../../electron/utils/auth');

      // Initialize session without forcePasswordChange
      const principal = initializeSession('usr-op-03', 'Warehouse Operator', 'OPERATOR', false);
      expect(principal.role).toBe('OPERATOR');

      const current = getSessionPrincipal();
      expect(current.role).toBe('OPERATOR');
      expect(checkPermission(current.role, PRIVILEGED_ACTIONS.PRINT)).toBe(true);
      expect(checkPermission(current.role, PRIVILEGED_ACTIONS.TEST_PRINT)).toBe(true);
    });
  });

  describe('C1: Privilege Escalation & Login Role Boundary Hardening', () => {
    it('rejects login requests containing client-injected role field via LoginCredentialsSchema (.strict)', async () => {
      const { handleAuthLogin } = await import('../../electron/ipc/app/appHandlers');
      const { localAuthProvider } = await import('../../electron/services/auth/authProvider');
      const mockEvent = {
        senderFrame: { url: 'http://localhost:3000' }
      };

      const opPass = localAuthProvider.getInitialPasswordForTesting('operator')!;

      // Injected role field - LoginCredentialsSchema is strict and rejects extra keys
      const maliciousPayload = {
        username: 'operator',
        password: opPass,
        role: 'SYSTEM_ADMIN'
      };

      const res = await handleAuthLogin(mockEvent, maliciousPayload);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid login request format');
    });

    it('rejects positional arguments and enforces object-form schema strictly', async () => {
      const { handleAuthLogin } = await import('../../electron/ipc/app/appHandlers');
      const mockEvent = {
        senderFrame: { url: 'http://localhost:3000' }
      };

      // Calling with positional string arguments
      const res = await (handleAuthLogin as any)(
        mockEvent,
        'usr-op-03',
        'Warehouse Operator',
        'SYSTEM_ADMIN',
        'somePass'
      );
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid login request format');
    });

    it('derives session role strictly from verified user identity, never from caller', async () => {
      const { handleAuthLogin } = await import('../../electron/ipc/app/appHandlers');
      const { localAuthProvider } = await import('../../electron/services/auth/authProvider');
      const mockEvent = {
        senderFrame: { url: 'http://localhost:3000' }
      };

      const opPass = localAuthProvider.getInitialPasswordForTesting('operator')!;
      const res = await handleAuthLogin(mockEvent, {
        username: 'operator',
        password: opPass
      });

      expect(res.success).toBe(true);
      expect(res.principal).toBeDefined();
      expect(res.principal?.role).toBe('OPERATOR');
      expect(res.principal?.userId).toBe('usr-op-03');
    });
  });

  describe('C2: Password Security, Force Rotation & Policy Enforcement', () => {
    it('generates random initial passwords at startup with forcePasswordChange set to true', async () => {
      const { localAuthProvider } = await import('../../electron/services/auth/authProvider');

      const opPass = localAuthProvider.getInitialPasswordForTesting('operator');
      const adminPass = localAuthProvider.getInitialPasswordForTesting('admin');
      const mgrPass = localAuthProvider.getInitialPasswordForTesting('manager');
      const viewerPass = localAuthProvider.getInitialPasswordForTesting('viewer');

      expect(opPass).toBeDefined();
      expect(opPass!.length).toBeGreaterThanOrEqual(12);
      expect(adminPass).toBeDefined();
      expect(mgrPass).toBeDefined();
      expect(viewerPass).toBeDefined();

      // Ensure each account has a unique, non-trivial random password
      const set = new Set([opPass, adminPass, mgrPass, viewerPass]);
      expect(set.size).toBe(4);

      const opUser = await localAuthProvider.getUserByUsername('operator');
      expect(opUser?.forcePasswordChange).toBe(true);
    });

    it('prevents privileged actions (print and test print) when forcePasswordChange is true', async () => {
      const { initializeSession, getSessionPrincipal } = await import('../../electron/utils/auth');

      // Initialize session with forcePasswordChange: true
      const principal = initializeSession('usr-op-03', 'Warehouse Operator', 'OPERATOR', true);
      expect(principal.forcePasswordChange).toBe(true);

      const current = getSessionPrincipal();
      expect(current.forcePasswordChange).toBe(true);

      // Verify that printerHandlers blocks printing when forcePasswordChange is true
      const { handlePrinterPrint, handlePrinterTest } = await import('../../electron/ipc/printer/printerHandlers');
      const mockEvent = { senderFrame: { url: 'http://localhost:3000' } };

      const printResult = await handlePrinterPrint(mockEvent, {
        printerName: 'Zebra ZT411',
        printerType: 'zpl',
        copies: 1,
        rawPayload: '^XA^FDTest^FS^XZ'
      });

      expect(printResult.success).toBe(false);
      expect(printResult.error?.code).toBe('ERR_PASSWORD_CHANGE_REQUIRED');

      const testResult = await handlePrinterTest(mockEvent, 'Zebra ZT411', 'zpl');
      expect(testResult.success).toBe(false);
      expect(testResult.error?.code).toBe('ERR_PASSWORD_CHANGE_REQUIRED');
    });

    it('changePassword rejects incorrect old password', async () => {
      const res = await authProvider.changePassword('operator', 'WrongOldPassword!', 'NewSecretPass2026!');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Incorrect existing password');
    });

    it('changePassword rejects weak new passwords that fail password policy', async () => {
      const opPass = authProvider.getInitialPasswordForTesting('operator')!;

      // Short password (< 8 chars)
      const resShort = await authProvider.changePassword('operator', opPass, 'Short1!');
      expect(resShort.success).toBe(false);
      expect(resShort.error).toContain('at least 8 characters');

      // Missing number or symbol
      const resNoSymbol = await authProvider.changePassword('operator', opPass, 'NoNumberOrSymbol');
      expect(resNoSymbol.success).toBe(false);
      expect(resNoSymbol.error).toContain('uppercase, lowercase, and a number or symbol');
    });

    it('changePassword rejects new password identical to old password', async () => {
      const opPass = authProvider.getInitialPasswordForTesting('operator')!;
      const resIdentical = await authProvider.changePassword('operator', opPass, opPass);
      expect(resIdentical.success).toBe(false);
      expect(resIdentical.error).toContain('cannot be identical');
    });

    it('changePassword successfully updates password, clears forcePasswordChange, and allows privileged actions', async () => {
      const { localAuthProvider } = await import('../../electron/services/auth/authProvider');
      const { handleAuthLogin, handleAuthChangePassword } = await import('../../electron/ipc/app/appHandlers');
      const { handlePrinterPrint } = await import('../../electron/ipc/printer/printerHandlers');

      const opPass = localAuthProvider.getInitialPasswordForTesting('operator')!;
      const newSecurePass = 'NewComplexPassword2026!';
      const mockEvent = { senderFrame: { url: 'http://localhost:3000' } };

      // Change password via IPC handler
      const changeResult = await handleAuthChangePassword(mockEvent, {
        userId: 'usr-op-03',
        oldPassword: opPass,
        newPassword: newSecurePass
      });
      expect(changeResult.success).toBe(true);

      // Verify old password no longer works
      const oldVerify = await localAuthProvider.verify('operator', opPass);
      expect(oldVerify).toBe(false);

      // Verify new password works
      const newVerify = await localAuthProvider.verify('operator', newSecurePass);
      expect(newVerify).toBe(true);

      // Verify user record now has forcePasswordChange: false
      const updatedUser = await localAuthProvider.getUserByUsername('operator');
      expect(updatedUser?.forcePasswordChange).toBe(false);

      // Login with new password
      const loginRes = await handleAuthLogin(mockEvent, {
        username: 'operator',
        password: newSecurePass
      });

      expect(loginRes.success).toBe(true);
      expect(loginRes.requiresPasswordChange).toBe(false);
      expect(loginRes.principal?.forcePasswordChange).toBe(false);

      // Verify print action now proceeds (not blocked by password rotation gate)
      const printResult = await handlePrinterPrint(mockEvent, {
        printerName: 'Zebra ZT411',
        printerType: 'zpl',
        copies: 1,
        rawPayload: '^XA^FDTest^FS^XZ'
      });

      // Does not throw ERR_PASSWORD_CHANGE_REQUIRED
      expect(printResult.error?.code).not.toBe('ERR_PASSWORD_CHANGE_REQUIRED');
    });
  });
});
