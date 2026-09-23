/**
 * LabelForge Desktop - Windows Spooler Printer Adapter
 * Supports both RAW Thermal Spooling (winspool.drv) and GDI/PDF Chromium printing
 */

import { BrowserWindow } from 'electron';
import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { windowsRawSpooler } from './windowsRawSpooler';
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
          protocolsSupported: ['raw', 'raster', 'pdf'] as Array<'raw' | 'raster' | 'pdf'>
        };
      });
    } catch (err: any) {
      logger.error('WindowsPrinterAdapter', `Failed to query Windows printers: ${err.message}`);
      return [];
    }
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    logger.info('WindowsPrinterAdapter', `Processing Windows print request for "${request.printerName}" (${request.printerType})`);

    // Rule 1: If rawPayload exists (ZPL, TSPL, EPL, CPCL, SBPL, DPL), send via Windows RAW Spooler!
    if (request.rawPayload && typeof request.rawPayload === 'string' && request.rawPayload.trim().length > 0) {
      logger.info('WindowsPrinterAdapter', `Dispatching RAW thermal payload to Windows spooler queue for ${request.printerName}...`);
      const rawRes = await windowsRawSpooler.printRaw(request.printerName, request.rawPayload, request.jobName || 'LabelForge RAW Job');

      if (rawRes.success) {
        return {
          success: true,
          jobId: rawRes.jobId,
          bytesWritten: rawRes.bytesWritten
        };
      } else {
        return {
          success: false,
          error: {
            code: rawRes.errorCode || 'ERR_RAW_PRINT_FAILED',
            message: rawRes.errorMessage || 'RAW print spooling failed'
          }
        };
      }
    }

    // Rule 2: Non-RAW GDI/PDF printing via webContents.print()
    logger.info('WindowsPrinterAdapter', `Dispatching GDI/raster job to Chromium spooler for ${request.printerName}`);
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
              logger.error('WindowsPrinterAdapter', `GDI Print failed: ${failureReason}`);
              resolve({
                success: false,
                error: {
                  code: 'ERR_SPOOLER_FAILURE',
                  message: failureReason || 'Windows print spooler rejected GDI job'
                }
              });
            } else {
              logger.info('WindowsPrinterAdapter', 'GDI Spooler job dispatched successfully');
              resolve({
                success: true,
                jobId: `spool-${Date.now()}`
              });
            }
          }
        );
      });
    } catch (err: any) {
      logger.error('WindowsPrinterAdapter', `Exception during GDI printing: ${err.message}`);
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
    const testZpl = '^XA\n^LH0,0\n^FO50,50^A0N,40,30^FDLabelForge Enterprise Hardware Test^FS\n^FO50,110^BCN,70,Y,N,N\n^FDTEST-RAW-12345^FS\n^XZ\n';
    return this.print({
      printerName,
      printerType: 'windows',
      copies: 1,
      jobName: 'LabelForge Hardware Test Page',
      rawPayload: testZpl
    });
  }
}

export const windowsPrinter = new WindowsPrinterAdapter();
