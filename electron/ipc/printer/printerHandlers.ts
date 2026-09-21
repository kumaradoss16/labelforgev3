/**
 * LabelForge Desktop - Printer IPC Handlers
 * Dispatches print jobs to Windows Spooler, Thermal Raw Sockets, and BarTender
 */

import { ipcMain } from 'electron';
import { windowsPrinter } from '../../services/printer/windowsPrinter';
import { networkPrinter } from '../../services/printer/networkPrinter';
import { zplPrinter } from '../../services/printer/zplPrinter';
import { tsplPrinter } from '../../services/printer/tsplPrinter';
import { bartenderPrinter } from '../../services/printer/bartenderPrinter';
import { PrintJobRequest, PrinterDefinition } from '../../services/printer/printerAdapter';
import { validatePrintRequest } from '../../utils/validation';
import { logger } from '../../utils/logger';

export function registerPrinterHandlers(): void {
  // Discover / List Available Printers
  ipcMain.handle('printer:list', async (): Promise<PrinterDefinition[]> => {
    logger.info('PrinterHandlers', 'Querying printers list');
    try {
      const winPrinters = await windowsPrinter.discover();
      const btPrinters = await bartenderPrinter.discover();

      return [...winPrinters, ...btPrinters];
    } catch (err: any) {
      logger.error('PrinterHandlers', `Failed to list printers: ${err.message}`);
      return [];
    }
  });

  // Get Default Printer
  ipcMain.handle('printer:default', async (): Promise<PrinterDefinition | null> => {
    const all = await windowsPrinter.discover();
    return all.find(p => p.isDefault) || all[0] || null;
  });

  // Print Label Request
  ipcMain.handle('printer:print', async (_event, request: PrintJobRequest) => {
    logger.info('PrinterHandlers', `Received print request for ${request.printerName} (${request.printerType})`);

    try {
      validatePrintRequest(request);

      switch (request.printerType) {
        case 'network':
          return await networkPrinter.print(request);
        case 'zpl':
          return await zplPrinter.print(request);
        case 'tspl':
          return await tsplPrinter.print(request);
        case 'bartender':
          return await bartenderPrinter.print(request);
        case 'windows':
        default:
          return await windowsPrinter.print(request);
      }
    } catch (err: any) {
      logger.error('PrinterHandlers', `Print job failed: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'ERR_PRINT_FAILED',
          message: err.message
        }
      };
    }
  });

  // Test Print
  ipcMain.handle('printer:test', async (_event, printerName: string, protocol: string = 'zpl') => {
    logger.info('PrinterHandlers', `Test print triggered for ${printerName} with protocol ${protocol}`);
    try {
      if (protocol === 'tspl') {
        return await tsplPrinter.testPrint(printerName);
      } else if (protocol === 'bartender') {
        return await bartenderPrinter.testPrint(printerName);
      } else if (protocol === 'spooler') {
        return await windowsPrinter.testPrint(printerName);
      } else {
        return await zplPrinter.testPrint(printerName);
      }
    } catch (err: any) {
      logger.error('PrinterHandlers', `Test print failed: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'ERR_TEST_PRINT_FAILED',
          message: err.message
        }
      };
    }
  });
}
