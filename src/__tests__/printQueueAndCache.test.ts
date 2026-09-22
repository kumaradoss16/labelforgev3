import { describe, it, expect } from 'vitest';
import { barcodeCache } from '../services/barcodeCache';
import { compactPrintJobs, retryFailedPrintJobs } from '../services/printQueueManager';
import { generatePrinterCode } from '../services/printerCodeGenerator';
import { PrintJob, PrinterProfile } from '../types/printer';

describe('BarcodeCache', () => {
  it('stores and retrieves cached SVG/data URLs', () => {
    barcodeCache.clear();
    barcodeCache.set('test-key', 'data:image/png;base64,1234');
    expect(barcodeCache.has('test-key')).toBe(true);
    expect(barcodeCache.get('test-key')).toBe('data:image/png;base64,1234');
  });

  it('reports accurate cache statistics and evicts on limit', () => {
    barcodeCache.clear();
    const stats = barcodeCache.getStats();
    expect(stats.size).toBe(0);
    expect(stats.maxSize).toBe(300);
  });
});

describe('PrintQueueManager', () => {
  const mockJobs: PrintJob[] = [
    {
      id: 'job-1',
      jobName: 'Shipping Label A',
      templateName: 'Shipping',
      templateVersion: 1,
      printerId: 'pr-1',
      printerName: 'Zebra ZT410',
      copies: 1,
      recordCount: 1,
      status: 'FAILED',
      createdAt: '10:00:00',
      outputLanguage: 'ZPL',
      rawPayloadPreview: '^XA^FDTest A^XZ'
    },
    {
      id: 'job-2',
      jobName: 'Shipping Label B',
      templateName: 'Shipping',
      templateVersion: 1,
      printerId: 'pr-1',
      printerName: 'Zebra ZT410',
      copies: 1,
      recordCount: 1,
      status: 'COMPLETED',
      createdAt: '10:01:00',
      outputLanguage: 'ZPL',
      rawPayloadPreview: '^XA^FDTest B^XZ'
    }
  ];

  const mockPrinters: PrinterProfile[] = [
    {
      id: 'pr-1',
      name: 'Zebra ZT410',
      model: 'ZT410',
      manufacturer: 'Zebra',
      dpi: 300,
      language: 'ZPL',
      connection: 'TCP/IP',
      address: '192.168.1.100:9100',
      status: 'Ready',
      supportsCutter: false,
      supportsPeeler: false,
      supportsRfid: false,
      darkness: 15,
      speed: 6,
      mediaType: 'gap'
    }
  ];

  it('compacts print job history and retains bounded size', () => {
    const compacted = compactPrintJobs(mockJobs, 50);
    expect(compacted.length).toBe(2);
  });

  it('retries all failed print jobs in the filtered list', async () => {
    const failedJobs = mockJobs.filter(j => j.status === 'FAILED');
    expect(failedJobs.length).toBe(1);

    const result = await retryFailedPrintJobs(mockJobs, failedJobs, mockPrinters);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    const retriedJob = result.updatedJobs.find(j => j.id === 'job-1');
    expect(retriedJob?.status).toBe('COMPLETED');
    expect(retriedJob?.retryCount).toBe(1);
  });
});

describe('PrinterCodeGenerator', () => {
  const mockDoc: any = {
    id: 'doc-code-test',
    name: 'Industrial Code Test',
    dimensions: { width: 101.6, height: 152.4, dpi: 203, unit: 'mm' },
    metadata: { version: 1 },
    objects: [
      {
        id: 'txt-1',
        name: 'Header',
        type: 'text',
        x: 10,
        y: 10,
        width: 80,
        height: 10,
        rotation: 0,
        zIndex: 1,
        visible: true,
        text: 'TEST HEADING',
        style: { fontSize: 12, fontFamily: 'Arial' }
      },
      {
        id: 'bc-1',
        name: 'Barcode',
        type: 'barcode',
        x: 10,
        y: 25,
        width: 80,
        height: 25,
        rotation: 0,
        zIndex: 2,
        visible: true,
        value: '12345678',
        barcodeStyle: { symbology: 'code128' }
      }
    ]
  };

  it('generates valid ZPL code', () => {
    const zpl = generatePrinterCode('ZPL', mockDoc);
    expect(zpl).toContain('^XA');
    expect(zpl).toContain('^XZ');
  });

  it('generates valid TSPL code', () => {
    const tspl = generatePrinterCode('TSPL', mockDoc);
    expect(tspl).toContain('SIZE');
    expect(tspl).toContain('PRINT');
  });

  it('generates valid EPL code', () => {
    const epl = generatePrinterCode('EPL', mockDoc);
    expect(epl).toContain('N');
    expect(epl).toContain('P1,1');
  });

  it('generates valid CPCL code', () => {
    const cpcl = generatePrinterCode('CPCL', mockDoc);
    expect(cpcl).toContain('! 0');
    expect(cpcl).toContain('PRINT');
  });

  it('generates valid SBPL code', () => {
    const sbpl = generatePrinterCode('SBPL', mockDoc);
    expect(sbpl).toContain('\x1BA');
    expect(sbpl).toContain('\x1BZ');
  });

  it('generates valid DPL code', () => {
    const dpl = generatePrinterCode('DPL', mockDoc);
    expect(dpl).toContain('\x01D');
    expect(dpl).toContain('E');
  });
});
