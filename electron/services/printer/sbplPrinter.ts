/**
 * LabelForge Desktop - SBPL Printer Adapter
 * Protocol handler for SATO Barcode Printer Language (SBPL)
 */

import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { networkPrinter } from './networkPrinter';
import { windowsPrinter } from './windowsPrinter';
import { logger } from '../../utils/logger';

export class SbplPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter(p => /sato|sbpl|cl4nx|pw4/i.test(p.name));
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    logger.info('SbplPrinterAdapter', `Dispatching SBPL job to ${request.printerName}`);
    if (request.networkHost) {
      return await networkPrinter.print(request);
    }
    return await windowsPrinter.print(request);
  }

  public async testPrint(printerName: string): Promise<PrintJobResponse> {
    const ESC = '\x1B';
    const testSbpl = `${ESC}A${ESC}A1${ESC}H0050${ESC}V0050${ESC}L0202${ESC}MLABELFORGE SATO SBPL TEST OK${ESC}Q1${ESC}Z`;
    const isIpHost = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(printerName);
    return await this.print({
      printerName,
      printerType: isIpHost ? 'network' : 'sbpl',
      networkHost: isIpHost ? printerName : undefined,
      rawPayload: testSbpl,
      copies: 1
    });
  }
}

export const sbplPrinter = new SbplPrinterAdapter();
