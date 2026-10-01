import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

let mockDnsLookupAddress = '127.0.0.1';
let mockDnsLookupError: Error | null = null;

const mockConnect = vi.fn();
const mockWrite = vi.fn();
const mockEnd = vi.fn();
const mockSetTimeout = vi.fn();
const mockDestroy = vi.fn();

class MockSocket extends EventEmitter {
  public setTimeout = mockSetTimeout;
  public connect = mockConnect.mockImplementation((port: number, host: string, cb?: () => void) => {
    if (cb) setTimeout(cb, 0);
    return this;
  });
  public write = mockWrite.mockImplementation((data: any, cb?: () => void) => {
    if (cb) setTimeout(cb, 0);
    return true;
  });
  public end = mockEnd.mockImplementation(() => {
    setTimeout(() => this.emit('close'), 0);
    return this;
  });
  public destroy = mockDestroy.mockImplementation(() => {
    setTimeout(() => this.emit('close'), 0);
    return this;
  });
}

vi.mock('dns', () => {
  const lookupFn = vi.fn((host: string, options: any, callback: any) => {
    const cb = typeof options === 'function' ? options : callback;
    if (mockDnsLookupError) {
      cb(mockDnsLookupError, null);
    } else {
      cb(null, mockDnsLookupAddress, 4);
    }
  });

  return {
    default: {
      lookup: lookupFn
    },
    lookup: lookupFn
  };
});

vi.mock('net', () => {
  function MockSocketConstructor() {
    return new MockSocket();
  }
  return {
    default: {
      Socket: MockSocketConstructor
    },
    Socket: MockSocketConstructor
  };
});

import { NetworkPrinterAdapter } from '../../electron/services/printer/networkPrinter';

describe('DNS Rebinding & Host Resolution SSRF Protection', () => {
  let adapter: NetworkPrinterAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDnsLookupAddress = '127.0.0.1';
    mockDnsLookupError = null;
    adapter = new NetworkPrinterAdapter();
  });

  it('blocks DNS rebinding when external hostname resolves to loopback IP (127.0.0.1)', async () => {
    mockDnsLookupAddress = '127.0.0.1';

    const result = await adapter.print({
      printerName: 'Network Zebra',
      printerType: 'zpl',
      rawPayload: '^XA^FDTest^FS^XZ',
      networkHost: 'printer.evil-corp.example',
      networkPort: 9100
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('ERR_DNS_REBINDING_BLOCKED');
    expect(result.error?.message).toContain('SSRF/DNS Rebinding blocked');
    expect(result.error?.message).toContain('127.0.0.1');

    // socket.connect must NEVER be called
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('blocks DNS rebinding when external hostname resolves to cloud metadata IP (169.254.169.254)', async () => {
    mockDnsLookupAddress = '169.254.169.254';

    const result = await adapter.print({
      printerName: 'Network Zebra',
      printerType: 'zpl',
      rawPayload: '^XA^FDTest^FS^XZ',
      networkHost: 'printer.evil-corp.example',
      networkPort: 9100
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ERR_DNS_REBINDING_BLOCKED');
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('connects directly to the validated resolved IP (not re-resolving hostname) when resolving to legitimate LAN IP', async () => {
    const resolvedLanIp = '192.168.1.50';
    mockDnsLookupAddress = resolvedLanIp;

    const result = await adapter.print({
      printerName: 'Network Zebra',
      printerType: 'zpl',
      rawPayload: '^XA^FDTest^FS^XZ',
      networkHost: 'printer.valid-domain.local',
      networkPort: 9100
    });

    expect(result.success).toBe(true);

    // CRITICAL: socket.connect must be called with the validated resolvedIp, NOT the original hostname
    expect(mockConnect).toHaveBeenCalledTimes(1);
    const [connectPort, connectHost] = mockConnect.mock.calls[0];
    expect(connectPort).toBe(9100);
    expect(connectHost).toBe(resolvedLanIp);
    expect(connectHost).not.toBe('printer.valid-domain.local');
  });

  it('handles DNS resolution failure gracefully', async () => {
    mockDnsLookupError = new Error('ENOTFOUND printer.unresolvable.example');

    const result = await adapter.print({
      printerName: 'Network Zebra',
      printerType: 'zpl',
      rawPayload: '^XA^FDTest^FS^XZ',
      networkHost: 'printer.unresolvable.example',
      networkPort: 9100
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('ERR_DNS_RESOLUTION_FAILED');
    expect(mockConnect).not.toHaveBeenCalled();
  });
});
