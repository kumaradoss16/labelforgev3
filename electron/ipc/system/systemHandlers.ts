/**
 * LabelForge Desktop - System & Settings IPC Handlers
 */

import { ipcMain } from 'electron';
import fs from 'fs';
import { systemService } from '../../services/system/systemInfo';
import { paths } from '../../config/paths';
import { logger } from '../../utils/logger';

export function registerSystemHandlers(): void {
  ipcMain.handle('system:get-info', async () => {
    return systemService.getInfo();
  });

  ipcMain.handle('settings:get', async () => {
    const file = paths.getSettingsFilePath();
    if (!fs.existsSync(file)) {
      return {
        measurementUnit: 'mm',
        defaultDpi: 300,
        darkness: 15,
        printSpeed: 4,
        autoSaveIntervalSec: 60,
        autoPreflightCheck: true
      };
    }

    try {
      const content = fs.readFileSync(file, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      logger.error('SystemHandlers', 'Failed to read settings file', err);
      return {};
    }
  });

  ipcMain.handle('settings:set', async (_event, newSettings: any) => {
    const file = paths.getSettingsFilePath();
    try {
      let current = {};
      if (fs.existsSync(file)) {
        current = JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
      const updated = { ...current, ...newSettings };
      fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf-8');
      logger.info('SystemHandlers', 'Settings saved successfully');
      return updated;
    } catch (err) {
      logger.error('SystemHandlers', 'Failed to save settings', err);
      throw err;
    }
  });
}
