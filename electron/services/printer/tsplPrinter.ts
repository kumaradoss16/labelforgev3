/**
 * LabelForge Desktop - TSPL Direct Printer Adapter
 * Handles TSC/Citizen TSPL command streams
 */

import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { networkPrinter } from './networkPrinter';
import { windowsPrinter } from './windowsPrinter';
import { logger } from '../../utils/logger';

export class TsplPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter(p => /tsc|citizen|godex|tspl/i.test(p.name));
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    logger.info('TsplPrinterAdapter', `Processing TSPL print request for ${request.printerName}`);

    if (request.networkHost) {
      return networkPrinter.print(request);
    }

    return windowsPrinter.print(request);
  }

  public async testPrint(printerName: string): Promise<PrintJobResponse> {
    const testTspl = 'SIZE 4,2\nGAP 0.12,0\nCLS\nTEXT 40,40,"3",0,1,1,"LabelForge Enterprise TSPL"\nBARCODE 40,100,"128",60,1,0,2,2,"TSPL-67890"\nPRINT 1\n';
    return this.print({
      printerName,
      printerType: 'tspl',
      copies: 1,
      rawPayload: testTspl
    });
  }
}

export const tsplPrinter = new TsplPrinterAdapter();
