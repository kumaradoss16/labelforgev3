/**
 * LabelForge Desktop - Filesystem IPC Handlers
 */

import { ipcMain } from 'electron';
import { fileManager } from '../../services/filesystem/fileManager';
import { validateFilePath } from '../../utils/validation';

export function registerFileHandlers(): void {
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    const valid = validateFilePath(filePath, []);
    return await fileManager.readFile(valid);
  });

  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    const valid = validateFilePath(filePath, []);
    await fileManager.writeFile(valid, content);
    return { success: true };
  });

  ipcMain.handle('file:exists', async (_event, filePath: string) => {
    try {
      const valid = validateFilePath(filePath, []);
      return fileManager.fileExists(valid);
    } catch {
      return false;
    }
  });
}
