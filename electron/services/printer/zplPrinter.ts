/**
 * LabelForge Desktop - ZPL Direct Printer Adapter
 * Handles Zebra ZPL II command generation and dispatch
 */

import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { networkPrinter } from './networkPrinter';
import { windowsPrinter } from './windowsPrinter';
import { logger } from '../../utils/logger';

export class ZplPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    const winPrinters = await windowsPrinter.discover();
    // Filter printers whose name contains ZDesigner, Zebra, or ZPL
    return winPrinters.filter(p => /zebra|zdesigner|zpl/i.test(p.name));
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    logger.info('ZplPrinterAdapter', `Processing ZPL print request for ${request.printerName}`);

    if (request.networkHost) {
      return networkPrinter.print(request);
    }

    // Default to windows spooler
    return windowsPrinter.print(request);
  }

  public async testPrint(printerName: string): Promise<PrintJobResponse> {
    const testZpl = '^XA\n^LH0,0\n^FO50,50^A0N,40,30^FDLabelForge Enterprise ZPL^FS\n^FO50,110^BCN,70,Y,N,N\n^FDTEST-ZPL-12345^FS\n^XZ\n';
    return this.print({
      printerName,
      printerType: 'zpl',
      copies: 1,
      rawPayload: testZpl
    });
  }
}

export const zplPrinter = new ZplPrinterAdapter();
