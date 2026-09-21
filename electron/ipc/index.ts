/**
 * LabelForge Desktop - IPC Master Registration
 */

import { registerAppHandlers } from './app/appHandlers';
import { registerDialogHandlers } from './dialog/dialogHandlers';
import { registerProjectHandlers } from './projects/projectHandlers';
import { registerPrinterHandlers } from './printer/printerHandlers';
import { registerFileHandlers } from './files/fileHandlers';
import { registerSystemHandlers } from './system/systemHandlers';
import { logger } from '../utils/logger';

export function registerAllIpcHandlers(): void {
  logger.info('IPC', 'Registering all IPC channels...');
  registerAppHandlers();
  registerDialogHandlers();
  registerProjectHandlers();
  registerPrinterHandlers();
  registerFileHandlers();
  registerSystemHandlers();
  logger.info('IPC', 'All IPC channels registered successfully');
}
