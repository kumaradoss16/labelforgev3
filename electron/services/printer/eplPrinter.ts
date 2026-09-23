/**
 * LabelForge Desktop - EPL Printer Adapter
 * Protocol handler for Eltron Programming Language (EPL / EPL2)
 */

import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { networkPrinter } from './networkPrinter';
import { windowsPrinter } from './windowsPrinter';
import { logger } from '../../utils/logger';

export class EplPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter(p => /epl|eltron|2844|zebra/i.test(p.name));
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    logger.info('EplPrinterAdapter', `Dispatching EPL job to ${request.printerName}`);
    if (request.networkHost) {
      return await networkPrinter.print(request);
    }
    return await windowsPrinter.print(request);
  }

  public async testPrint(printerName: string): Promise<PrintJobResponse> {
    const testEpl = 'N\nq400\nQ200,24\nA50,50,0,4,1,1,N,"LABELFORGE EPL TEST OK"\nP1,1\n';
    const isIpHost = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(printerName);
    return await this.print({
      printerName,
      printerType: isIpHost ? 'network' : 'epl',
      networkHost: isIpHost ? printerName : undefined,
      rawPayload: testEpl,
      copies: 1
    });
  }
}

export const eplPrinter = new EplPrinterAdapter();
