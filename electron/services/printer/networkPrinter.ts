/**
 * LabelForge Desktop - Network Raw TCP Socket Printer Adapter
 * Securely transmits raw thermal payloads (ZPL, TSPL, EPL, CPCL, SBPL, DPL) over TCP port 9100 / custom port
 * Includes robust SSRF and IP obfuscation protection
 */

import net from 'net';
import { PrinterAdapter, PrinterDefinition, PrintJobRequest, PrintJobResponse } from './printerAdapter';
import { logger } from '../../utils/logger';

// Standard Regex Patterns
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const HOSTNAME_REGEX = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;

/**
 * Parses numeric/hex/octal/decimal IP representations to standard IPv4 dotted decimal
 */
function normalizeToIPv4(host: string): string | null {
  const clean = host.trim().toLowerCase();

  // Hex representation: e.g. 0x7f000001
  if (/^0x[0-9a-f]{8}$/.test(clean)) {
    const num = parseInt(clean, 16);
    return `${(num >> 24) & 255}.${(num >> 16) & 255}.${(num >> 8) & 255}.${num & 255}`;
  }

  // Pure integer / dword representation: e.g. 2130706433
  if (/^\d{8,10}$/.test(clean)) {
    const num = parseInt(clean, 10);
    if (num >= 0 && num <= 4294967295) {
      return `${(num >>> 24) & 255}.${(num >>> 16) & 255}.${(num >>> 8) & 255}.${num & 255}`;
    }
  }

  // Octal dotted notation: e.g. 0177.0.0.1
  if (/^0[0-7]{1,3}\.0[0-7]{1,3}\.0[0-7]{1,3}\.0[0-7]{1,3}$/.test(clean)) {
    const parts = clean.split('.').map(p => parseInt(p, 8));
    return parts.join('.');
  }

  if (IPV4_REGEX.test(clean)) {
    return clean;
  }

  return null;
}

/**
 * Validates network printer target host/port and blocks SSRF / malicious targets
 */
export function validateNetworkDestination(host?: string, port?: number): { valid: boolean; error?: string } {
  if (!host || typeof host !== 'string' || host.trim() === '') {
    return { valid: false, error: 'Network printer host IP or hostname is required' };
  }

  let cleanHost = host.trim().toLowerCase();

  // Strip brackets from IPv6 host if present (e.g. [::1])
  if (cleanHost.startsWith('[') && cleanHost.endsWith(']')) {
    cleanHost = cleanHost.slice(1, -1);
  }

  // Command injection / path traversal prevention
  if (/[;&|`<>\$\\]/.test(cleanHost) || cleanHost.includes('..')) {
    return { valid: false, error: 'Invalid characters detected in printer hostname or IP address' };
  }

  // Block IPv6 Loopbacks
  if (cleanHost === '::1' || cleanHost === '0:0:0:0:0:0:0:1' || cleanHost.startsWith('::ffff:127.')) {
    return { valid: false, error: 'Restricted network destination: Loopback IPv6 addresses are not permitted.' };
  }

  // Normalize potential numeric/hex/octal IP
  const normalizedIPv4 = normalizeToIPv4(cleanHost);
  const ipToCheck = normalizedIPv4 || cleanHost;

  // If host consists purely of digits and dots, it MUST be a valid IPv4 address
  if (/^[\d\.]+$/.test(cleanHost)) {
    if (!IPV4_REGEX.test(ipToCheck)) {
      return { valid: false, error: `Invalid IP address or hostname format: "${cleanHost}"` };
    }
  }

  // Check IPv4 SSRF Targets
  if (IPV4_REGEX.test(ipToCheck)) {

    const octets = ipToCheck.split('.').map(Number);

    // 0.0.0.0 / 8
    if (octets[0] === 0) {
      return { valid: false, error: 'Restricted network destination: 0.0.0.0 network is not a valid printer target.' };
    }

    // Loopback 127.0.0.0 / 8
    if (octets[0] === 127) {
      return { valid: false, error: 'Restricted network destination: Loopback 127.0.0.0/8 addresses are not permitted.' };
    }

    // Cloud Metadata Services: 169.254.169.254, 169.254.169.250
    if (octets[0] === 169 && octets[1] === 254 && octets[2] === 169) {
      return { valid: false, error: 'Restricted network destination: Cloud metadata endpoint (169.254.169.x) is strictly blocked.' };
    }

    // Multicast 224.0.0.0 / 4
    if (octets[0] >= 224 && octets[0] <= 239) {
      return { valid: false, error: 'Restricted network destination: Multicast addresses are not valid printer targets.' };
    }

    // Limited Broadcast 255.255.255.255
    if (ipToCheck === '255.255.255.255') {
      return { valid: false, error: 'Restricted network destination: Broadcast address is not a valid printer target.' };
    }
  } else {
    // Check hostname format
    if (!HOSTNAME_REGEX.test(cleanHost)) {
      return { valid: false, error: `Invalid IP address or hostname format: "${cleanHost}"` };
    }

    // Block explicit localhost names
    if (cleanHost === 'localhost' || cleanHost.endsWith('.localhost')) {
      return { valid: false, error: 'Restricted network destination: Localhost is not a valid network printer target.' };
    }
  }

  const numericPort = port !== undefined ? Number(port) : 9100;
  if (isNaN(numericPort) || !Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
    return { valid: false, error: `Invalid TCP port number ${port}. Port must be between 1 and 65535.` };
  }

  return { valid: true };
}

export class NetworkPrinterAdapter implements PrinterAdapter {
  public async discover(): Promise<PrinterDefinition[]> {
    return [];
  }

  public async print(request: PrintJobRequest): Promise<PrintJobResponse> {
    const host = request.networkHost;
    const port = request.networkPort || 9100;
    const payload = request.rawPayload;

    // Validate network host and port
    const destVal = validateNetworkDestination(host, port);
    if (!destVal.valid) {
      return {
        success: false,
        error: {
          code: 'ERR_INVALID_NETWORK_DEST',
          message: destVal.error || 'Invalid network destination'
        }
      };
    }

    if (!payload || (typeof payload === 'string' && payload.trim() === '')) {
      return {
        success: false,
        error: {
          code: 'ERR_NO_PAYLOAD',
          message: 'Raw printer payload (ZPL/TSPL/EPL) is empty'
        }
      };
    }

    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf-8');

    // Max payload check (20 MB safety limit)
    if (buffer.length > 20 * 1024 * 1024) {
      return {
        success: false,
        error: {
          code: 'ERR_PAYLOAD_TOO_LARGE',
          message: `Printer payload size (${(buffer.length / 1024 / 1024).toFixed(1)}MB) exceeds maximum 20MB socket limit.`
        }
      };
    }

    logger.info('NetworkPrinterAdapter', `Connecting to RAW socket at ${host}:${port} (${buffer.length} bytes)...`);

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let bytesWritten = 0;
      let hasFinished = false;

      const timeoutMs = request.timeoutMs || 8000;
      socket.setTimeout(timeoutMs);

      socket.connect(port, host!, () => {
        logger.info('NetworkPrinterAdapter', `Connected to ${host}:${port}. Streaming payload...`);

        socket.write(buffer, () => {
          bytesWritten = buffer.length;
          logger.info('NetworkPrinterAdapter', `Transmitted ${bytesWritten} bytes to ${host}:${port}`);
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
        logger.error('NetworkPrinterAdapter', `Connection timed out connecting to ${host}:${port}`);
        socket.destroy();
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: false,
            error: {
              code: 'ERR_SOCKET_TIMEOUT',
              message: `Connection timed out to network printer at ${host}:${port} (Timeout: ${timeoutMs}ms)`
            }
          });
        }
      });

      socket.on('error', (err: any) => {
        logger.error('NetworkPrinterAdapter', `Socket error for ${host}:${port}: ${err.message}`);
        socket.destroy();
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: false,
            error: {
              code: 'ERR_SOCKET_ERROR',
              message: `Network communication error to ${host}:${port}: ${err.message}`
            }
          });
        }
      });
    });
  }

  public async testPrint(host: string, protocol: string = 'zpl'): Promise<PrintJobResponse> {
    const proto = (protocol || 'zpl').toLowerCase();
    let rawPayload = '^XA\n^FO50,50^ADN,36,20^FDLabelForge ZPL Network Test^FS\n^XZ\n';

    if (proto === 'tspl') {
      rawPayload = 'SIZE 4,2\nGAP 0.12,0\nCLS\nTEXT 50,50,"3",0,1,1,"LabelForge TSPL Network Test"\nPRINT 1\n';
    } else if (proto === 'epl') {
      rawPayload = '\nN\nA50,50,0,3,1,1,N,"LabelForge EPL Network Test"\nP1\n';
    }

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
