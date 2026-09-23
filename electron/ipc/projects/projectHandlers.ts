/**
 * LabelForge Desktop - Project Management IPC Handlers
 * Handles Open, Save, Save As, and Recent projects
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { projectStorage, LForgePackage } from '../../services/filesystem/projectStorage';
import { recentProjects } from '../../services/filesystem/recentFiles';
import { validateFilePath } from '../../utils/validation';
import { logger } from '../../utils/logger';

import { paths } from '../../config/paths';

export function registerProjectHandlers(): void {
  // Create New Project
  ipcMain.handle('project:create', async () => {
    logger.info('ProjectHandlers', 'New project requested');
    return { success: true };
  });

  // Open Project (either from specific filePath or via native Windows Open Dialog)
  ipcMain.handle('project:open', async (_event, filePath?: string) => {
    try {
      let targetPath = filePath;
      let isDialog = false;

      if (!targetPath) {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        const res = await dialog.showOpenDialog(win, {
          title: 'Open LabelForge Project',
          filters: [
            { name: 'LabelForge Projects (*.lforge)', extensions: ['lforge'] },
            { name: 'JSON Projects (*.json)', extensions: ['json'] },
            { name: 'All Files (*.*)', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (res.canceled || !res.filePaths.length) {
          return { success: false, error: 'Canceled by user' };
        }
        targetPath = res.filePaths[0];
        isDialog = true;
      }

      // Enforce path containment strictly if direct renderer call; skip for user dialogue selection
      const validPath = validateFilePath(
        targetPath,
        ['.lforge', '.json'],
        isDialog ? undefined : paths.getAllowedRoots()
      );
      const pkg = await projectStorage.loadProject(validPath);

      return {
        success: true,
        package: pkg,
        filePath: validPath
      };
    } catch (err: any) {
      logger.error('ProjectHandlers', `Failed to open project: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  });

  // Save Project
  ipcMain.handle('project:save', async (_event, projectData: LForgePackage, filePath?: string) => {
    try {
      let targetPath = filePath;
      let isDialog = false;

      if (!targetPath) {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        const res = await dialog.showSaveDialog(win, {
          title: 'Save LabelForge Project',
          defaultPath: `${projectData?.manifest?.name || 'Untitled'}.lforge`,
          filters: [{ name: 'LabelForge Project (*.lforge)', extensions: ['lforge'] }]
        });

        if (res.canceled || !res.filePath) {
          return { success: false, error: 'Canceled by user' };
        }
        targetPath = res.filePath;
        isDialog = true;
      }

      // Enforce path containment strictly if direct renderer call; skip for user dialogue selection
      const validPath = validateFilePath(
        targetPath,
        ['.lforge', '.json'],
        isDialog ? undefined : paths.getAllowedRoots()
      );
      await projectStorage.saveProject(validPath, projectData);

      return {
        success: true,
        filePath: validPath
      };
    } catch (err: any) {
      logger.error('ProjectHandlers', `Failed to save project: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  });

  // Save As Project (always opens native Windows Save dialog)
  ipcMain.handle('project:save-as', async (_event, projectData: LForgePackage) => {
    try {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      const res = await dialog.showSaveDialog(win, {
        title: 'Save LabelForge Project As',
        defaultPath: `${projectData?.manifest?.name || 'Untitled'}.lforge`,
        filters: [{ name: 'LabelForge Project (*.lforge)', extensions: ['lforge'] }]
      });

      if (res.canceled || !res.filePath) {
        return { success: false, error: 'Canceled by user' };
      }

      // Always skips root containment for user-initiated dialog selections
      const validPath = validateFilePath(res.filePath, ['.lforge', '.json']);
      await projectStorage.saveProject(validPath, projectData);

      return {
        success: true,
        filePath: validPath
      };
    } catch (err: any) {
      logger.error('ProjectHandlers', `Failed to save-as project: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  });

  // Recent Projects
  ipcMain.handle('project:recent', async () => {
    return recentProjects.getRecent();
  });

  ipcMain.handle('project:clear-recent', async () => {
    recentProjects.clearRecent();
    return { success: true };
  });
}
