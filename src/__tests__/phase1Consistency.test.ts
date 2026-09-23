import { describe, it, expect } from 'vitest';
import { PrinterProfile } from '../types/printer';
import { resolveIPCPrinterType } from '../services/printerLanguageMapper';
import { extractNetworkHostPort } from '../services/printQueueManager';

describe('Phase 1 Consistency & Protocol Routing Pass', () => {
  const sbplPrinter: any = {
    id: 'prn-sato-1',
    name: 'SATO CL4NX Plus',
    displayName: 'Warehouse SATO Thermal',
    language: 'SBPL',
    connection: 'usb',
    address: 'USB001',
    dpi: 203,
    status: 'ONLINE',
    isDefault: false
  };

  const cpclMobilePrinter: any = {
    id: 'prn-zebra-mobile',
    name: 'Zebra QLn420',
    displayName: 'Forklift Mobile Printer',
    language: 'CPCL',
    connection: 'usb',
    address: 'USB002',
    dpi: 203,
    status: 'ONLINE',
    isDefault: false
  };

  const networkPrinter: any = {
    id: 'prn-net-1',
    name: 'Network Zebra',
    displayName: 'Shipping Network Zebra',
    language: 'ZPL',
    connection: 'network',
    address: '192.168.1.180:9100',
    dpi: 203,
    status: 'ONLINE',
    isDefault: false
  };

  it('1.1: Correctly maps SBPL, CPCL, and string languages to IPC printer types', () => {
    expect(resolveIPCPrinterType(sbplPrinter)).toBe('sbpl');
    expect(resolveIPCPrinterType(cpclMobilePrinter)).toBe('cpcl');
    expect(resolveIPCPrinterType('DPL')).toBe('dpl');
    expect(resolveIPCPrinterType(networkPrinter)).toBe('network');
  });

  it('1.2: Correctly extracts network host and port from printer profile address', () => {
    const net1 = extractNetworkHostPort(networkPrinter.address);
    expect(net1.host).toBe('192.168.1.180');
    expect(net1.port).toBe(9100);
  });
});
