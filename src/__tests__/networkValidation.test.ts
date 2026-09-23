import { describe, it, expect } from 'vitest';
import { validateNetworkDestination } from '../../electron/services/printer/networkPrinter';

describe('Network Printer Destination Validation', () => {
  it('accepts valid IPv4 address and port', () => {
    const val = validateNetworkDestination('192.168.1.120', 9100);
    expect(val.valid).toBe(true);
  });

  it('accepts valid hostname', () => {
    const val = validateNetworkDestination('zebra-zt410.corp.internal', 9100);
    expect(val.valid).toBe(true);
  });

  it('rejects empty host', () => {
    const val = validateNetworkDestination('', 9100);
    expect(val.valid).toBe(false);
    expect(val.error).toContain('host IP or hostname is required');
  });

  it('rejects invalid IP format', () => {
    const val = validateNetworkDestination('256.300.1.1', 9100);
    expect(val.valid).toBe(false);
    expect(val.error).toContain('Invalid IP address or hostname format');
  });

  it('rejects malicious command injection characters in host', () => {
    const val = validateNetworkDestination('192.168.1.1; rm -rf /', 9100);
    expect(val.valid).toBe(false);
    expect(val.error).toContain('Invalid characters detected');
  });

  it('rejects invalid port numbers out of range', () => {
    const valLow = validateNetworkDestination('192.168.1.10', 0);
    expect(valLow.valid).toBe(false);

    const valHigh = validateNetworkDestination('192.168.1.10', 70000);
    expect(valHigh.valid).toBe(false);
  });
});
