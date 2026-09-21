/**
 * LabelForge Desktop - Application IPC Handlers
 */

import { ipcMain, app } from 'electron';
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
}
