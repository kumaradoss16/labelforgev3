/**
 * LabelForge Desktop - Windows Spooler Printer Adapter
 * Queries Windows OS printer queue and dispatches spooler jobs via Electron
 */

import { BrowserWindow } from 'electron';
import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { logger } from '../../utils/logger';

export class WindowsPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    logger.info('WindowsPrinterAdapter', 'Querying Windows Spooler printers...');
    try {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!win) {
        logger.warn('WindowsPrinterAdapter', 'No active BrowserWindow available for printer query');
        return [];
      }

      const printers = await win.webContents.getPrintersAsync();
      return printers.map(p => {
        const raw = p as any;
        return {
          id: `win-${p.name}`,
          name: p.name,
          displayName: p.displayName || p.name,
          type: 'windows' as const,
          isDefault: Boolean(raw.isDefault),
          status: typeof raw.status === 'number' ? raw.status : 0,
          description: p.description || 'Windows OS Installed Printer',
          protocolsSupported: ['raster', 'pdf'] as Array<'raster' | 'pdf'>
        };
      });
    } catch (err: any) {
      logger.error('WindowsPrinterAdapter', `Failed to query Windows printers: ${err.message}`);
      return [];
    }
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    logger.info('WindowsPrinterAdapter', `Dispatching spooler job to ${request.printerName}`, { copies: request.copies });
    try {
      const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!win) {
        return {
          success: false,
          error: {
            code: 'ERR_NO_WINDOW',
            message: 'No active window available to dispatch print job'
          }
        };
      }

      return new Promise((resolve) => {
        win.webContents.print(
          {
            silent: false,
            printBackground: true,
            deviceName: request.printerName,
            copies: request.copies || 1,
            margins: { marginType: 'none' }
          },
          (success, failureReason) => {
            if (!success) {
              logger.error('WindowsPrinterAdapter', `Print failed: ${failureReason}`);
              resolve({
                success: false,
                error: {
                  code: 'ERR_SPOOLER_FAILURE',
                  message: failureReason || 'Windows print spooler rejected job'
                }
              });
            } else {
              logger.info('WindowsPrinterAdapter', 'Spooler job dispatched successfully');
              resolve({
                success: true,
                jobId: `spool-${Date.now()}`
              });
            }
          }
        );
      });
    } catch (err: any) {
      logger.error('WindowsPrinterAdapter', `Exception during printing: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'ERR_SPOOLER_EXCEPTION',
          message: err.message
        }
      };
    }
  }

  public async testPrint(printerName: string): Promise<PrintJobResponse> {
    logger.info('WindowsPrinterAdapter', `Executing test print on ${printerName}`);
    return this.print({
      printerName,
      printerType: 'windows',
      copies: 1,
      jobName: 'LabelForge Hardware Test Page'
    });
  }
}

export const windowsPrinter = new WindowsPrinterAdapter();
