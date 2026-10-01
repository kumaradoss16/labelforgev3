/**
 * LabelForge Production Security - Authentication & Session Boundary Test Suite (P0-1)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAuthenticationProvider, verifyPassword, hashPassword } from '../../electron/services/auth/authProvider';
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
      const identity = await authProvider.authenticate({
        username: 'operator',
        password: 'OperatorPass2026!'
      });

      expect(identity).toBeDefined();
      expect(identity.userId).toBe('usr-op-03');
      expect(identity.userName).toBe('Warehouse Operator');
      expect(identity.role).toBe('OPERATOR');
      expect(identity.authenticationMethod).toBe('LOCAL');
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
      for (let i = 0; i < 5; i++) {
        try {
          await authProvider.authenticate({ username: 'viewer', password: 'BadPassword' });
        } catch {
          // Expected authentication failure in order to trigger lockout threshold
        }
      }

      // 6th attempt should be blocked by temporary account lockout
      await expect(
        authProvider.authenticate({ username: 'viewer', password: 'ViewerPass2026!' })
      ).rejects.toThrow(/Account temporarily locked/);
    });
  });

  describe('SessionManager & Principal Resolution', () => {
    it('fails closed when no session exists', () => {
      expect(sessionManager.getAuthenticatedPrincipal()).toBeNull();
      expect(() => sessionManager.requireAuthenticatedPrincipal()).toThrow(AuthenticationRequiredError);
    });

    it('creates authenticated session with unique cryptographically random session token', async () => {
      const identity = await authProvider.authenticate({
        username: 'manager',
        password: 'ManagerSecurePass2026!'
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
      const identity = await authProvider.authenticate({
        username: 'operator',
        password: 'OperatorPass2026!'
      });

      // Session with negative TTL (already expired)
      sessionManager.createAuthenticatedSession(identity, -1000);

      expect(sessionManager.getAuthenticatedPrincipal()).toBeNull();
      expect(() => sessionManager.requireAuthenticatedPrincipal()).toThrow(SessionExpiredError);
    });

    it('invalidates active session upon explicit logout', async () => {
      const identity = await authProvider.authenticate({
        username: 'admin',
        password: 'AdminSecurePass2026!'
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
      const opValid = await authProvider.verify('usr-op-03', 'OperatorPass2026!');
      expect(opValid).toBe(true);

      const opByName = await authProvider.verify('operator', 'OperatorPass2026!');
      expect(opByName).toBe(true);

      const adminValid = await authProvider.verify('admin', 'AdminSecurePass2026!');
      expect(adminValid).toBe(true);

      const invalid = await authProvider.verify('usr-op-03', 'WrongPassword!');
      expect(invalid).toBe(false);

      const nonExistent = await authProvider.verify('fake-user-id', 'SomePass!');
      expect(nonExistent).toBe(false);
    });

    it('allows getSessionPrincipal and permission checks when session is initialized', async () => {
      const { initializeSession, getSessionPrincipal } = await import('../../electron/utils/auth');

      // Initialize session
      const principal = initializeSession('usr-op-03', 'Warehouse Operator', 'OPERATOR');
      expect(principal.role).toBe('OPERATOR');

      const current = getSessionPrincipal();
      expect(current.role).toBe('OPERATOR');
      expect(checkPermission(current.role, PRIVILEGED_ACTIONS.PRINT)).toBe(true);
      expect(checkPermission(current.role, PRIVILEGED_ACTIONS.TEST_PRINT)).toBe(true);
    });
  });
});
