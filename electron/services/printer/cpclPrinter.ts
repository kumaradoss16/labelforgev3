/**
 * LabelForge Desktop - CPCL Printer Adapter
 * Protocol handler for Zebra / Comtec Mobile Printers (CPCL)
 */

import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { networkPrinter } from './networkPrinter';
import { windowsPrinter } from './windowsPrinter';
import { logger } from '../../utils/logger';

export class CpclPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter(p => /cpcl|mobile|qln|zq/i.test(p.name));
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    logger.info('CpclPrinterAdapter', `Dispatching CPCL job to ${request.printerName}`);
    if (request.networkHost) {
      return await networkPrinter.print(request);
    }
    return await windowsPrinter.print(request);
  }

  public async testPrint(printerName: string): Promise<PrintJobResponse> {
    const testCpcl = '! 0 200 200 210 1\nTEXT 7 0 20 20 LABELFORGE CPCL TEST OK\nFORM\nPRINT\n';
    const isIpHost = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(printerName);
    return await this.print({
      printerName,
      printerType: isIpHost ? 'network' : 'cpcl',
      networkHost: isIpHost ? printerName : undefined,
      rawPayload: testCpcl,
      copies: 1
    });
  }
}

export const cpclPrinter = new CpclPrinterAdapter();
