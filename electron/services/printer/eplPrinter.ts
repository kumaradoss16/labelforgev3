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
    return [
      {
        id: 'epl-lp2844',
        name: 'Zebra LP 2844 (EPL)',
        displayName: 'Zebra LP 2844 / TLP 2844 (EPL-2)',
        type: 'network',
        isDefault: false,
        status: 0,
        description: 'EPL-2 Direct Thermal Desktop Printer',
        host: '127.0.0.1',
        port: 9100,
        dpi: 203,
        protocolsSupported: ['epl']
      }
    ];
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
    return await this.print({
      printerName,
      printerType: 'network',
      rawPayload: testEpl,
      copies: 1
    });
  }
}

export const eplPrinter = new EplPrinterAdapter();
