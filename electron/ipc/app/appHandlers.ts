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
}
