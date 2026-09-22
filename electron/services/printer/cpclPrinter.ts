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
    return [
      {
        id: 'cpcl-qln420',
        name: 'Zebra QLn420 (CPCL)',
        displayName: 'Zebra QLn420 / ZQ630 Mobile (CPCL)',
        type: 'network',
        isDefault: false,
        status: 0,
        description: 'CPCL Mobile Direct Thermal Printer',
        host: '127.0.0.1',
        port: 9100,
        dpi: 203,
        protocolsSupported: ['tspl', 'zpl']
      }
    ];
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
    return await this.print({
      printerName,
      printerType: 'network',
      rawPayload: testCpcl,
      copies: 1
    });
  }
}

export const cpclPrinter = new CpclPrinterAdapter();
