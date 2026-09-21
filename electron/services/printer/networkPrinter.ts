/**
 * LabelForge Desktop - Network Raw TCP Socket Printer Adapter
 * Directly sends raw printer command streams (ZPL, TSPL, EPL) to network barcode printers over port 9100
 */

import net from 'net';
import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { logger } from '../../utils/logger';

export class NetworkPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    // Network printers are typically registered via settings or DNS-SD
    return [];
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    const host = request.networkHost;
    const port = request.networkPort || 9100;
    const payload = request.rawPayload;

    if (!host) {
      return {
        success: false,
        error: {
          code: 'ERR_NO_HOST',
          message: 'Network printer host IP or hostname was not specified'
        }
      };
    }

    if (!payload) {
      return {
        success: false,
        error: {
          code: 'ERR_NO_PAYLOAD',
          message: 'Raw printer payload (ZPL/TSPL) is empty'
        }
      };
    }

    logger.info('NetworkPrinterAdapter', `Connecting to raw thermal socket ${host}:${port}...`);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let bytesWritten = 0;
      let hasFinished = false;

      socket.setTimeout(8000);

      socket.connect(port, host, () => {
        logger.info('NetworkPrinterAdapter', `Connected to ${host}:${port}. Streaming payload...`);
        const buffer = Buffer.from(payload, 'utf-8');
        bytesWritten = buffer.length;

        socket.write(buffer, () => {
          logger.info('NetworkPrinterAdapter', `Successfully sent ${bytesWritten} bytes to ${host}:${port}`);
          socket.end();
        });
      });

      socket.on('close', () => {
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: true,
            jobId: `net-${Date.now()}`,
            bytesWritten
          });
        }
      });

      socket.on('timeout', () => {
        logger.error('NetworkPrinterAdapter', `Socket timed out connecting to ${host}:${port}`);
        socket.destroy();
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: false,
            error: {
              code: 'ERR_SOCKET_TIMEOUT',
              message: `Connection timed out to network printer at ${host}:${port}`
            }
          });
        }
      });

      socket.on('error', (err: any) => {
        logger.error('NetworkPrinterAdapter', `Socket error communicating with ${host}:${port}: ${err.message}`);
        socket.destroy();
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: false,
            error: {
              code: 'ERR_SOCKET_ERROR',
              message: `Network communication error: ${err.message}`
            }
          });
        }
      });
    });
  }

  public async testPrint(host: string, protocol: 'zpl' | 'tspl' = 'zpl'): Promise<PrintJobResponse> {
    const rawPayload = protocol === 'tspl'
      ? 'SIZE 4,2\nGAP 0.12,0\nCLS\nTEXT 50,50,"3",0,1,1,"LabelForge TSPL Network Test"\nPRINT 1\n'
      : '^XA\n^FO50,50^ADN,36,20^FDLabelForge ZPL Network Test^FS\n^XZ\n';

    return this.print({
      printerName: `Network Thermal (${host})`,
      printerType: 'network',
      networkHost: host,
      networkPort: 9100,
      rawPayload
    });
  }
}

export const networkPrinter = new NetworkPrinterAdapter();
