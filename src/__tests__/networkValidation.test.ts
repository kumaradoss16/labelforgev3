import { describe, it, expect } from 'vitest';
import { validateNetworkDestination } from '../../electron/services/printer/networkPrinter';

describe('Network Printer Destination Validation & SSRF Security', () => {
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

  describe('6.1 SSRF & Obfuscated IP Protection', () => {
    it('blocks loopback IP 127.0.0.1', () => {
      const val = validateNetworkDestination('127.0.0.1', 9100);
      expect(val.valid).toBe(false);
      expect(val.error).toContain('Loopback');
    });

    it('blocks hex obfuscated loopback IP 0x7f000001', () => {
      const val = validateNetworkDestination('0x7f000001', 9100);
      expect(val.valid).toBe(false);
      expect(val.error).toContain('Loopback');
    });

    it('blocks decimal obfuscated loopback IP 2130706433', () => {
      const val = validateNetworkDestination('2130706433', 9100);
      expect(val.valid).toBe(false);
      expect(val.error).toContain('Loopback');
    });

    it('blocks IPv6 loopback ::1 and bracketed [::1]', () => {
      const val1 = validateNetworkDestination('::1', 9100);
      expect(val1.valid).toBe(false);
      expect(val1.error).toContain('Loopback IPv6');

      const val2 = validateNetworkDestination('[::1]', 9100);
      expect(val2.valid).toBe(false);
      expect(val2.error).toContain('Loopback IPv6');
    });

    it('blocks cloud metadata IP 169.254.169.254', () => {
      const val = validateNetworkDestination('169.254.169.254', 9100);
      expect(val.valid).toBe(false);
      expect(val.error).toContain('Cloud metadata');
    });

    it('blocks localhost domain name', () => {
      const val = validateNetworkDestination('localhost', 9100);
      expect(val.valid).toBe(false);
      expect(val.error).toContain('Localhost');
    });
  });
});
