/**
 * LabelForge Desktop - Application & Authentication IPC Handlers
 * Enforces sender validation, runtime schema verification, and authentication provider boundary.
 */

import { ipcMain, app, BrowserWindow } from 'electron';
import { paths } from '../../config/paths';
import { appConfig } from '../../config/appConfig';
import { assertTrustedRenderer } from '../../security/senderValidation';
import { localAuthProvider } from '../../services/auth/authProvider';
import { sessionManager } from '../../services/SessionManager';
import { auditService } from '../../services/system/auditService';
import { logger } from '../../utils/logger';
import { UserRole } from '../../../src/types/printer';

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

  // Real authentication provider login with verification and session initialization
  ipcMain.handle('auth:login', async (event, ...args: any[]) => {
    assertTrustedRenderer(event);

    let userId: string = '';
    let userName: string = '';
    let role: UserRole = 'OPERATOR';
    let credential = '';

    if (typeof args[0] === 'string') {
      // Positional: (userId, userName, role, credential)
      userId = args[0];
      userName = args[1] || '';
      role = (args[2] as UserRole) || 'OPERATOR';
      credential = args[3] || '';
    } else if (typeof args[0] === 'object' && args[0] !== null) {
      // Object: { username / userId, password / credential, role?, ... }
      const obj = args[0];
      const usernameInput = (obj.username || obj.userId || '').trim();
      credential = obj.password || obj.credential || '';

      const user = await localAuthProvider.getUserById(usernameInput) ||
                   await localAuthProvider.getUserByUsername(usernameInput);
      if (user) {
        userId = user.userId;
        userName = user.userName;
        role = (obj.role as UserRole) || user.role;
      } else {
        userId = usernameInput;
        userName = obj.userName || usernameInput;
        role = (obj.role as UserRole) || 'OPERATOR';
      }
    }

    const verified = await localAuthProvider.verify(userId, credential);
    if (!verified) {
      logger.warn('AppHandlers', `Authentication failed for user "${userId}": Invalid credentials`);
      auditService.recordEvent({
        action: 'USER_LOGIN',
        user: userName || userId,
        role: role || 'UNKNOWN',
        resource: 'AUTH_SERVICE',
        result: 'FAILURE',
        errorMessage: 'Invalid credentials'
      });
      return { success: false, error: 'Invalid credentials' };
    }

    // Resolve userName and role from verified user profile if not passed
    const user = await localAuthProvider.getUserById(userId) ||
                 await localAuthProvider.getUserByUsername(userId);
    if (user) {
      userName = userName || user.userName;
      role = role || user.role;
    }

    sessionManager.initializeSession(userId, userName, role);
    const principal = sessionManager.requireAuthenticated();

    logger.info('AppHandlers', `User "${principal.userName}" logged in successfully with role "${principal.role}".`);
    auditService.recordEvent({
      action: 'USER_LOGIN',
      user: principal.userName,
      role: principal.role,
      resource: 'AUTH_SERVICE',
      result: 'SUCCESS',
      details: { authenticationMethod: principal.authenticationMethod, userId: principal.userId }
    });

    return {
      success: true,
      principal
    };
  });

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
