/**
 * LabelForge Desktop - BarTender Integration Adapter
 * Connects to BarTender REST Print Server API (Enterprise / Automation Edition)
 * Performs real health discovery and endpoint verification
 */

import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { logger } from '../../utils/logger';

export interface BarTenderServerConfig {
  enabled: boolean;
  baseUrl: string; // e.g. "http://localhost:5159"
  timeoutMs: number;
  authToken?: string;
}

let activeBarTenderConfig: BarTenderServerConfig = {
  enabled: true,
  baseUrl: 'http://127.0.0.1:5159',
  timeoutMs: 8000
};

export function validateBarTenderUrl(urlString: string): { valid: boolean; error?: string } {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string' };
  }

  try {
    const parsed = new URL(urlString.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: 'Invalid URL scheme. Only HTTP and HTTPS are permitted.' };
    }

    const host = parsed.hostname.toLowerCase();
    
    // Validate bad characters to prevent SSRF parameter injection
    if (/[;&|`<>\$\\]/.test(host) || host.includes('\0')) {
      return { valid: false, error: 'Unsafe characters detected in server hostname' };
    }

    // SSRF checks on known forbidden IP blocks
    if (host === '169.254.169.254' || host === '169.254.169.250') {
      return { valid: false, error: 'Restricted network destination: Cloud metadata endpoint strictly blocked.' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: 'Malformed URL: ' + err.message };
  }
}

export function updateBarTenderConfig(newConfig: Partial<BarTenderServerConfig>) {
  if (newConfig.baseUrl) {
    const check = validateBarTenderUrl(newConfig.baseUrl);
    if (!check.valid) {
      throw new Error(`Invalid BarTender URL Configuration: ${check.error}`);
    }
  }
  activeBarTenderConfig = { ...activeBarTenderConfig, ...newConfig };
}

export class BarTenderPrinterAdapter implements PrinterAdapter {
  /**
   * Queries real BarTender REST service endpoint to verify availability
   * Does NOT report fake static printers if server is unreachable
   */
  public async discover(): Promise<PrinterDefinition[]> {
    if (!activeBarTenderConfig.enabled) {
      return [];
    }

    const check = validateBarTenderUrl(activeBarTenderConfig.baseUrl);
    if (!check.valid) {
      logger.error('BarTenderPrinterAdapter', `Blocked discovery due to invalid baseUrl: ${check.error}`);
      return [];
    }

    const healthUrl = `${activeBarTenderConfig.baseUrl.replace(/\/+$/, '')}/BarTender/API/v1/Health`;

    try {
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (activeBarTenderConfig.authToken) {
        headers['Authorization'] = `Bearer ${activeBarTenderConfig.authToken}`;
      }

      const res = await fetch(healthUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(3000)
      });

      if (res.ok) {
        logger.info('BarTenderPrinterAdapter', `Verified active BarTender REST server at ${healthUrl}`);
        return [
          {
            id: 'bartender-rest-server',
            name: 'BarTender Enterprise Automation Server',
            displayName: 'BarTender REST Print Service (Online)',
            type: 'bartender',
            isDefault: false,
            status: 1, // Ready
            description: `Verified BarTender REST Server at ${activeBarTenderConfig.baseUrl}`,
            protocolsSupported: ['pdf', 'raster']
          }
        ];
      }
    } catch (err: any) {
      logger.info('BarTenderPrinterAdapter', `BarTender server offline/unreachable at ${healthUrl}: ${err.message}`);
    }

    return [];
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    const check = validateBarTenderUrl(activeBarTenderConfig.baseUrl);
    if (!check.valid) {
      return {
        success: false,
        error: {
          code: 'ERR_INVALID_BARTENDER_URL',
          message: `Blocked print dispatch due to invalid BarTender server base URL: ${check.error}`
        }
      };
    }

    const baseUrl = activeBarTenderConfig.baseUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/BarTender/API/v1/Print`;

    logger.info('BarTenderPrinterAdapter', `Dispatching BarTender print job to ${url}`);

    const payload = {
      template: request.bartenderTemplate || 'StandardLabel.btw',
      printer: request.printerName,
      copies: request.copies || 1,
      values: request.bartenderPayload || {}
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (activeBarTenderConfig.authToken) {
        headers['Authorization'] = `Bearer ${activeBarTenderConfig.authToken}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(activeBarTenderConfig.timeoutMs || 10000)
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('BarTenderPrinterAdapter', `BarTender API error: ${response.status} ${errorText}`);
        return {
          success: false,
          error: {
            code: `ERR_BARTENDER_${response.status}`,
            message: `BarTender Print Server returned HTTP ${response.status}: ${errorText}`
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
      logger.error('BarTenderPrinterAdapter', `Failed to connect to BarTender server at ${url}: ${err.message}`);
      return {
        success: false,
        error: {
          code: 'ERR_BARTENDER_CONNECTION',
          message: `Unable to reach BarTender server at ${url}: ${err.message}`
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
