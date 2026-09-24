/**
 * LabelForge Desktop - Application IPC Handlers
 */

import { ipcMain, app, BrowserWindow } from 'electron';
import { paths } from '../../config/paths';
import { appConfig } from '../../config/appConfig';

export function registerAppHandlers(): void {
  ipcMain.handle('app:get-info', async () => {
    return {
      version: appConfig.version,
      name: appConfig.productName,
      platform: process.platform,
      isPackaged: app.isPackaged,
      appDataPath: paths.getUserDataDir()
    };
  });

  ipcMain.handle('app:quit', async () => {
    app.quit();
  });

  // Frameless Window Control Handlers
  ipcMain.handle('window:minimize', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });

  ipcMain.handle('window:toggle-maximize', async (event) => {
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
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    return win.isMaximized();
  });

  ipcMain.handle('window:close', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });

  // Secure Auth IPC Sessions
  ipcMain.handle('auth:get-session', async () => {
    const { getSessionPrincipal } = await import('../../utils/auth');
    return getSessionPrincipal();
  });

  ipcMain.handle('auth:update-role', async (_event, role: string, credentialToken?: string) => {
    const { setSessionPrincipal, getSessionPrincipal } = await import('../../utils/auth');
    const validRoles = ['SYSTEM_ADMIN', 'PRINT_MANAGER', 'OPERATOR', 'VIEWER'];
    const targetRole = String(role || '').toUpperCase();
    if (!validRoles.includes(targetRole)) {
      return { success: false, error: 'Invalid user role requested' };
    }

    // Role switcher verification
    const requiredToken = targetRole === 'SYSTEM_ADMIN' ? 'admin@lf3' 
                        : targetRole === 'PRINT_MANAGER' ? 'manager@lf3'
                        : targetRole === 'OPERATOR' ? 'operator@lf3'
                        : '';

    if (requiredToken && credentialToken !== requiredToken) {
      return { success: false, error: 'Authorization failed. Invalid security credential.' };
    }

    const nameMap: Record<string, string> = {
      SYSTEM_ADMIN: 'System Administrator',
      PRINT_MANAGER: 'Print Operations Manager',
      OPERATOR: 'Warehouse Operator',
      VIEWER: 'Guest Operator',
    };
    const idMap: Record<string, string> = {
      SYSTEM_ADMIN: 'usr-admin-01',
      PRINT_MANAGER: 'usr-mgr-02',
      OPERATOR: 'usr-op-03',
      VIEWER: 'usr-guest-04',
    };
    const emailMap: Record<string, string> = {
      SYSTEM_ADMIN: 'admin@labelforge.internal',
      PRINT_MANAGER: 'manager@labelforge.internal',
      OPERATOR: 'operator@labelforge.internal',
      VIEWER: 'guest@labelforge.internal',
    };

    const current = getSessionPrincipal();
    const updated = {
      userId: idMap[targetRole],
      userName: nameMap[targetRole],
      email: emailMap[targetRole],
      role: targetRole,
      authenticatedAt: Date.now(),
      sessionId: `sess-${Date.now()}`
    };

    setSessionPrincipal(updated);
    return { success: true, principal: updated };
  });
}
