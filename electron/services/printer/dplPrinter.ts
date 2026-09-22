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
    return [
      {
        id: 'dpl-iclass',
        name: 'Datamax I-4212e (DPL)',
        displayName: 'Datamax I-Class Mark II (DPL)',
        type: 'network',
        isDefault: false,
        status: 0,
        description: 'Datamax-O\'Neil DPL Industrial Printer',
        host: '127.0.0.1',
        port: 9100,
        dpi: 203,
        protocolsSupported: ['tspl']
      }
    ];
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
    return await this.print({
      printerName,
      printerType: 'network',
      rawPayload: testDpl,
      copies: 1
    });
  }
}

export const dplPrinter = new DplPrinterAdapter();
