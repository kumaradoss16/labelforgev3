/**
 * LabelForge Desktop - Restricted Filesystem IPC Handlers
 * Enforces domain-specific access with path traversal prevention
 */

import { ipcMain } from 'electron';
import { fileManager } from '../../services/filesystem/fileManager';
import { validateFilePath } from '../../utils/validation';

export function registerFileHandlers(): void {
  // Domain-restricted file exists check
  ipcMain.handle('file:exists', async (_event, filePath: string) => {
    try {
      if (!filePath || typeof filePath !== 'string') return false;
      const valid = validateFilePath(filePath, ['.lforge', '.json', '.prn', '.txt']);
      return fileManager.fileExists(valid);
    } catch {
      return false;
    }
  });
}
