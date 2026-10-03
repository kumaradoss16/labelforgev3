/**
 * LabelForge Desktop - Application & Authentication IPC Handlers
 * Enforces sender validation, runtime schema verification, and authentication provider boundary.
 */

import { ipcMain, app, BrowserWindow } from 'electron';
import { paths } from '../../config/paths';
import { appConfig } from '../../config/appConfig';
import { assertTrustedRenderer } from '../../security/senderValidation';
import { LoginCredentialsSchema, ChangePasswordSchema } from '../../security/schemas';
import { localAuthProvider } from '../../services/auth/authProvider';
import { sessionManager } from '../../services/SessionManager';
import { auditService } from '../../services/system/auditService';
import { logger } from '../../utils/logger';
import { UserRole } from '../../../src/types/printer';

// Real authentication provider login with strict schema validation and verified identity mapping
export async function handleAuthLogin(event: any, rawCredentials: unknown) {
  assertTrustedRenderer(event);

  const parsed = LoginCredentialsSchema.safeParse(rawCredentials);
  if (!parsed.success) {
    logger.warn('AppHandlers', 'Rejected malformed login request');
    return { success: false, error: 'Invalid login request format' };
  }
  const { username, password } = parsed.data;

  const user = await localAuthProvider.getUserByUsername(username);
  if (!user) {
    logger.warn('AppHandlers', `Authentication failed: unknown user "${username}"`);
    auditService.recordEvent({
      action: 'USER_LOGIN',
      user: username,
      role: 'UNKNOWN',
      resource: 'AUTH_SERVICE',
      result: 'FAILURE',
      errorMessage: 'Unknown user'
    });
    return { success: false, error: 'Invalid credentials' };
  }

  const verified = await localAuthProvider.verify(user.userId, password || '');
  if (!verified) {
    logger.warn('AppHandlers', `Authentication failed for user "${username}": invalid credentials`);
    auditService.recordEvent({
      action: 'USER_LOGIN',
      user: user.userName,
      role: user.role,
      resource: 'AUTH_SERVICE',
      result: 'FAILURE',
      errorMessage: 'Invalid credentials'
    });
    return { success: false, error: 'Invalid credentials' };
  }

  // role ALWAYS comes from the verified identity record — never from the request
  const principal = sessionManager.initializeSession(
    user.userId,
    user.userName,
    user.role,
    user.forcePasswordChange
  );

  logger.info('AppHandlers', `User "${principal.userName}" logged in successfully with role "${principal.role}".`);
  auditService.recordEvent({
    action: 'USER_LOGIN',
    user: principal.userName,
    role: principal.role,
    resource: 'AUTH_SERVICE',
    result: 'SUCCESS',
    details: { authenticationMethod: user.authenticationMethod, userId: principal.userId }
  });

  return {
    success: true,
    principal,
    requiresPasswordChange: Boolean(user.forcePasswordChange)
  };
}

// Password rotation handler with policy enforcement
export async function handleAuthChangePassword(event: any, rawPayload: unknown) {
  assertTrustedRenderer(event);

  const parsed = ChangePasswordSchema.safeParse(rawPayload);
  if (!parsed.success) {
    logger.warn('AppHandlers', 'Rejected malformed change-password request');
    return { success: false, error: 'Invalid password change request format' };
  }

  const { userId, oldPassword, newPassword } = parsed.data;
  const result = await localAuthProvider.changePassword(userId, oldPassword, newPassword);

  if (!result.success) {
    auditService.recordEvent({
      action: 'PASSWORD_CHANGE',
      user: userId,
      role: 'UNKNOWN',
      resource: 'AUTH_SERVICE',
      result: 'FAILURE',
      errorMessage: result.error || 'Password change failed'
    });
    return result;
  }

  sessionManager.clearPasswordChangeRequirement(userId);

  const user = await localAuthProvider.getUserById(userId);
  auditService.recordEvent({
    action: 'PASSWORD_CHANGE',
    user: user?.userName || userId,
    role: user?.role || 'OPERATOR',
    resource: 'AUTH_SERVICE',
    result: 'SUCCESS',
    details: { userId }
  });

  return { success: true };
}

export function registerAppHandlers(): void {
  ipcMain.handle('app:get-info', async (event) => {
    assertTrustedRenderer(event);
    return {
      version: appConfig.version,
      name: appConfig.productName,
      platform: process.platform,
      isPackaged: app.isPackaged,
      appDataPath: paths.getUserDataDir()
    };
  });

  ipcMain.handle('app:quit', async (event) => {
    assertTrustedRenderer(event);
    app.quit();
  });

  // Frameless Window Control Handlers
  ipcMain.handle('window:minimize', async (event) => {
    assertTrustedRenderer(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });

  ipcMain.handle('window:toggle-maximize', async (event) => {
    assertTrustedRenderer(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    } else {
      win.maximize();
      return true;
    }
  });

  ipcMain.handle('window:is-maximized', async (event) => {
    assertTrustedRenderer(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    return win.isMaximized();
  });

  ipcMain.handle('window:close', async (event) => {
    assertTrustedRenderer(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win && !win.isDestroyed()) {
      win.close();
    }
  });

  // --------------------------------------------------------------------------
  // AUTHENTICATION IPC
  // --------------------------------------------------------------------------

  ipcMain.handle('auth:login', handleAuthLogin);
  ipcMain.handle('auth:change-password', handleAuthChangePassword);

  // Explicit session logout
  ipcMain.handle('auth:logout', async (event) => {
    assertTrustedRenderer(event);
    const principal = sessionManager.getAuthenticatedPrincipal();
    if (principal) {
      auditService.recordEvent({
        action: 'USER_LOGOUT',
        user: principal.userName,
        role: principal.role,
        resource: 'AUTH_SERVICE',
        result: 'SUCCESS'
      });
    }
    sessionManager.destroySession();
    return { success: true };
  });

  // Retrieve current active principal
  ipcMain.handle('auth:get-session', async (event) => {
    assertTrustedRenderer(event);
    const principal = sessionManager.getAuthenticatedPrincipal();
    if (!principal) return null;

    return {
      sessionId: principal.sessionId,
      userId: principal.userId,
      userName: principal.userName,
      role: principal.role,
      authenticatedAt: principal.authenticatedAt,
      expiresAt: principal.expiresAt
    };
  });

  // Prohibit renderer from self-assigning or changing roles
  ipcMain.handle('auth:update-role', async (event) => {
    assertTrustedRenderer(event);
    return {
      success: false,
      error: 'SECURITY_VIOLATION: Renderer cannot self-assign or escalate roles. Authentication required.'
    };
  });
}
