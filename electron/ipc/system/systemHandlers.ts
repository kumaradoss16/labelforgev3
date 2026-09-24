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
    if (!newSettings || typeof newSettings !== 'object') {
      throw new Error('Invalid settings object structure');
    }

    // Strict prototype pollution prevention
    const badKeys = ['__proto__', 'constructor', 'prototype'];
    const sanitizeObj = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      const clean: any = Array.isArray(obj) ? [] : {};
      for (const key of Object.keys(obj)) {
        if (badKeys.includes(key)) continue;
        const val = obj[key];
        clean[key] = (typeof val === 'object') ? sanitizeObj(val) : val;
      }
      return clean;
    };

    const sanitizedSettings = sanitizeObj(newSettings);
    const file = paths.getSettingsFilePath();
    try {
      let current: any = {};
      if (fs.existsSync(file)) {
        current = JSON.parse(fs.readFileSync(file, 'utf-8'));
      }

      // Merge and validate keys
      const updated: any = {
        measurementUnit: sanitizedSettings.measurementUnit === 'in' ? 'in' : 'mm',
        defaultDpi: [203, 300, 600].includes(Number(sanitizedSettings.defaultDpi)) ? Number(sanitizedSettings.defaultDpi) : (current.defaultDpi || 300),
        darkness: typeof sanitizedSettings.darkness === 'number' && sanitizedSettings.darkness >= 1 && sanitizedSettings.darkness <= 30 ? sanitizedSettings.darkness : (current.darkness || 15),
        printSpeed: typeof sanitizedSettings.printSpeed === 'number' && sanitizedSettings.printSpeed >= 1 && sanitizedSettings.printSpeed <= 12 ? sanitizedSettings.printSpeed : (current.printSpeed || 4),
        autoSaveIntervalSec: typeof sanitizedSettings.autoSaveIntervalSec === 'number' && sanitizedSettings.autoSaveIntervalSec >= 5 && sanitizedSettings.autoSaveIntervalSec <= 3600 ? sanitizedSettings.autoSaveIntervalSec : (current.autoSaveIntervalSec || 60),
        autoPreflightCheck: typeof sanitizedSettings.autoPreflightCheck === 'boolean' ? sanitizedSettings.autoPreflightCheck : (current.autoPreflightCheck !== false)
      };

      fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf-8');
      logger.info('SystemHandlers', 'Settings saved successfully');
      return updated;
    } catch (err: any) {
      logger.error('SystemHandlers', 'Failed to save settings: ' + err.message);
      throw err;
    }
  });
}
