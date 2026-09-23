import { describe, it, expect } from 'vitest';
import { generateZplFromDocument } from '../services/zplGenerator';
import { generateTsplFromDocument } from '../services/tsplGenerator';
import { generateEplFromDocument } from '../services/eplGenerator';
import { generateCpclFromDocument } from '../services/cpclGenerator';
import { generateSbplFromDocument } from '../services/sbplGenerator';
import { generateDplFromDocument } from '../services/dplGenerator';
import { generatePrinterCode, UnsupportedPrinterLanguageError } from '../services/printerCodeGenerator';
import { LabelDocument } from '../types/label';

const sampleDoc: LabelDocument = {
  id: 'test-doc-001',
  schemaVersion: '2.0.0',
  name: 'Test Logistics Label',
  author: 'Engineer',
  created: '2026-09-22T10:00:00.000Z',
  modified: '2026-09-22T10:00:00.000Z',
  metadata: {
    version: 1,
    status: 'published'
  },
  dimensions: {
    width: 101.6,
    height: 152.4,
    unit: 'mm',
    dpi: 203,
    orientation: 'portrait',
    marginLeft: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0
  },
  objects: [
    {
      id: 'text-1',
      type: 'text',
      name: 'Title Text',
      x: 10,
      y: 10,
      width: 80,
      height: 15,
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 1,
      text: 'CONFIDENTIAL SHIPMENT',
      style: { fontFamily: 'Arial', fontSize: 16, fontWeight: 'bold' }
    },
    {
      id: 'barcode-1',
      type: 'barcode',
      name: 'Main Barcode',
      x: 10,
      y: 30,
      width: 80,
      height: 25,
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 2,
      value: 'TEST-12345678',
      barcodeStyle: {
        symbology: 'code128',
        humanReadable: true,
        humanReadableFont: 'Arial',
        humanReadableSize: 10,
        humanReadablePosition: 'bottom',
        moduleWidth: 0.3,
        quietZone: true,
        quietZoneSize: 3,
        color: '#000000',
        backgroundColor: '#ffffff'
      }
    }
  ]
};

describe('Golden Tests for Thermal Printer Language Generators', () => {
  it('generates deterministic ZPL payload with ^XA and ^XZ markers', () => {
    const zpl = generateZplFromDocument(sampleDoc);
    expect(zpl).toContain('^XA');
    expect(zpl).toContain('^XZ');
    expect(zpl).toContain('CONFIDENTIAL SHIPMENT');
    expect(zpl).toContain('TEST-12345678');
  });

  it('generates deterministic TSPL payload with SIZE and PRINT markers', () => {
    const tspl = generateTsplFromDocument(sampleDoc);
    expect(tspl).toContain('SIZE');
    expect(tspl).toContain('PRINT');
    expect(tspl).toContain('CONFIDENTIAL SHIPMENT');
    expect(tspl).toContain('TEST-12345678');
  });

  it('generates deterministic EPL payload with N and P1 markers', () => {
    const epl = generateEplFromDocument(sampleDoc);
    expect(epl).toContain('N');
    expect(epl).toContain('P1');
    expect(epl).toContain('CONFIDENTIAL SHIPMENT');
  });

  it('generates deterministic CPCL payload with ! and PRINT markers', () => {
    const cpcl = generateCpclFromDocument(sampleDoc);
    expect(cpcl).toContain('!');
    expect(cpcl).toContain('PRINT');
  });

  it('generates deterministic SBPL payload with ESC commands', () => {
    const sbpl = generateSbplFromDocument(sampleDoc);
    expect(sbpl).toContain('\x1BA');
    expect(sbpl).toContain('\x1BZ');
  });

  it('generates deterministic DPL payload with SOH/STX control characters', () => {
    const dpl = generateDplFromDocument(sampleDoc);
    expect(dpl).toContain('\x01D');
    expect(dpl).toContain('\x02L');
  });

  it('exhaustive dispatcher routes correct language and throws on unsupported', () => {
    expect(generatePrinterCode('ZPL', sampleDoc)).toContain('^XA');
    expect(generatePrinterCode('TSPL', sampleDoc)).toContain('SIZE');
    expect(generatePrinterCode('EPL', sampleDoc)).toContain('N');
    expect(generatePrinterCode('CPCL', sampleDoc)).toContain('!');
    expect(generatePrinterCode('SBPL', sampleDoc)).toContain('\x1BA');
    expect(generatePrinterCode('DPL', sampleDoc)).toContain('\x01D');

    expect(() => generatePrinterCode('UNKNOWN_LANG', sampleDoc)).toThrow(UnsupportedPrinterLanguageError);
  });
});
