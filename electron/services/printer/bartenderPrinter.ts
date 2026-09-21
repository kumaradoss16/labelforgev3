/**
 * LabelForge Desktop - BarTender Integration Adapter
 * Connects to BarTender REST Print Server API (Enterprise Automation)
 */

import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { logger } from '../../utils/logger';

export class BarTenderPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    return [
      {
        id: 'bartender-srv-01',
        name: 'BarTender Print Server',
        displayName: 'BarTender Enterprise Automation Server',
        type: 'bartender',
        isDefault: false,
        status: 1,
        description: 'BarTender REST Web Print Service (Port 5159)',
        protocolsSupported: ['pdf', 'raster']
      }
    ];
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    const host = request.networkHost || 'localhost';
    const port = request.networkPort || 5159;
    const url = `http://${host}:${port}/BarTender/API/v1/Print`;

    logger.info('BarTenderPrinterAdapter', `Dispatching BarTender print job to ${url}`);

    const payload = {
      template: request.bartenderTemplate || 'StandardLabel.btw',
      printer: request.printerName,
      copies: request.copies || 1,
      values: request.bartenderPayload || {}
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('BarTenderPrinterAdapter', `BarTender API returned error: ${response.status} ${errorText}`);
        return {
          success: false,
          error: {
            code: `ERR_BARTENDER_${response.status}`,
            message: `BarTender Print Server error: ${errorText}`
          }
        };
      }

      const result = await response.json();
      logger.info('BarTenderPrinterAdapter', 'BarTender print job successfully queued', result);

      return {
        success: true,
        jobId: result.jobId || `bt-${Date.now()}`
      };
    } catch (err: any) {
      logger.error('BarTenderPrinterAdapter', `Failed to connect to BarTender server: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'ERR_BARTENDER_CONNECTION',
          message: `Unable to connect to BarTender server at ${url}: ${err.message}`
        }
      };
    }
  }

  public async testPrint(printerName: string): Promise<PrintJobResponse> {
    return this.print({
      printerName,
      printerType: 'bartender',
      copies: 1,
      bartenderTemplate: 'TestHardware.btw'
    });
  }
}

export const bartenderPrinter = new BarTenderPrinterAdapter();
