/**
 * LabelForge Desktop - Native Windows Dialog IPC Handlers
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import { logger } from '../../utils/logger';

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:open-file', async (_event, options: any = {}) => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const defaultFilters = [
      { name: 'LabelForge Project (*.lforge)', extensions: ['lforge'] },
      { name: 'JSON Document (*.json)', extensions: ['json'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ];

    try {
      const result = await dialog.showOpenDialog(win, {
        title: options.title || 'Open LabelForge Project',
        defaultPath: options.defaultPath,
        filters: options.filters || defaultFilters,
        properties: ['openFile']
      });

      if (result.canceled || !result.filePaths.length) {
        return { canceled: true };
      }

      const filePath = result.filePaths[0];
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');

      return {
        canceled: false,
        filePath,
        fileContent
      };
    } catch (err: any) {
      logger.error('DialogHandlers', `openFile failed: ${err.message}`);
      return { canceled: true, error: err.message };
    }
  });

  ipcMain.handle('dialog:save-file', async (_event, options: any = {}) => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const defaultFilters = [
      { name: 'LabelForge Project (*.lforge)', extensions: ['lforge'] },
      { name: 'JSON Document (*.json)', extensions: ['json'] }
    ];

    try {
      const result = await dialog.showSaveDialog(win, {
        title: options.title || 'Save LabelForge Project As',
        defaultPath: options.defaultPath || 'UntitledLabel.lforge',
        filters: options.filters || defaultFilters
      });

      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }

      return {
        canceled: false,
        filePath: result.filePath
      };
    } catch (err: any) {
      logger.error('DialogHandlers', `saveFile failed: ${err.message}`);
      return { canceled: true, error: err.message };
    }
  });

  ipcMain.handle('dialog:select-folder', async () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    try {
      const result = await dialog.showOpenDialog(win, {
        title: 'Select Destination Folder',
        properties: ['openDirectory', 'createDirectory']
      });

      if (result.canceled || !result.filePaths.length) {
        return { canceled: true };
      }

      return {
        canceled: false,
        folderPath: result.filePaths[0]
      };
    } catch (err: any) {
      logger.error('DialogHandlers', `selectFolder failed: ${err.message}`);
      return { canceled: true, error: err.message };
    }
  });

  ipcMain.handle('dialog:message-box', async (_event, options: any = {}) => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    try {
      const result = await dialog.showMessageBox(win, {
        type: options.type || 'info',
        title: options.title || 'LabelForge Studio',
        message: options.message || '',
        buttons: options.buttons || ['OK']
      });
      return { response: result.response };
    } catch (err: any) {
      logger.error('DialogHandlers', `showMessageBox failed: ${err.message}`);
      return { response: 0 };
    }
  });
}
