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
    return [
      {
        id: 'sbpl-cl4nx',
        name: 'SATO CL4NX Plus (SBPL)',
        displayName: 'SATO CL4NX Plus Industrial (SBPL)',
        type: 'network',
        isDefault: false,
        status: 0,
        description: 'SATO SBPL Industrial Thermal Printer',
        host: '127.0.0.1',
        port: 9100,
        dpi: 300,
        protocolsSupported: ['zpl']
      }
    ];
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
    return await this.print({
      printerName,
      printerType: 'network',
      rawPayload: testSbpl,
      copies: 1
    });
  }
}

export const sbplPrinter = new SbplPrinterAdapter();
