/**
 * LabelForge Desktop - DPL Printer Adapter
 * Protocol handler for Datamax Programming Language (DPL)
 */

import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { networkPrinter } from './networkPrinter';
import { windowsPrinter } from './windowsPrinter';
import { logger } from '../../utils/logger';

export class DplPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter(p => /datamax|dpl|honeywell|oneil/i.test(p.name));
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    logger.info('DplPrinterAdapter', `Dispatching DPL job to ${request.printerName}`);
    if (request.networkHost) {
      return await networkPrinter.print(request);
    }
    return await windowsPrinter.print(request);
  }

  public async testPrint(printerName: string): Promise<PrintJobResponse> {
    const SOH = '\x01';
    const STX = '\x02';
    const testDpl = `${SOH}D${STX}LD11121100000500050LABELFORGE DPL TEST OK\r\nQ0001\r\nE\r\n`;
    const isIpHost = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(printerName);
    return await this.print({
      printerName,
      printerType: isIpHost ? 'network' : 'dpl',
      networkHost: isIpHost ? printerName : undefined,
      rawPayload: testDpl,
      copies: 1
    });
  }
}

export const dplPrinter = new DplPrinterAdapter();
