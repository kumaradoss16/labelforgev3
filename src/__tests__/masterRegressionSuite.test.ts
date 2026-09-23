import { describe, it, expect } from 'vitest';
import { createLForgePackage, parseAndValidateLForgePackage } from '../services/lforgePackage';
import { resolveIPCPrinterType } from '../services/printerLanguageMapper';
import { generateDataMatrixSvg, generatePostal4StateSvg, calculateGS1Modulo10 } from '../services/barcodeEngine';
import { parseCsvText, evaluateExpression } from '../services/dataBinding';
import { computeIntelligentSnap } from '../services/intelligentSnapEngine';
import { validateNetworkDestination } from '../../electron/services/printer/networkPrinter';
import { normalizePath, toPlatformAgnosticPath } from '../services/pathUtils';
import { LabelDocument } from '../types/label';

const sampleDoc: LabelDocument = {
  id: 'doc-regression-1',
  schemaVersion: '2.0.0',
  name: 'Regression Test Label',
  author: 'Engineer',
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  metadata: { version: 1, status: 'draft' },
  dimensions: {
    width: 100,
    height: 150,
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
      id: 'txt-1',
      type: 'text',
      name: 'Shipping Header',
      x: 10,
      y: 10,
      width: 50,
      height: 10,
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 1,
      text: 'PALLET HEADER',
      style: { fontFamily: 'Inter', fontSize: 12 }
    }
  ]
};

describe('LabelForge V3 Master Audit Regression Suite (Phases 1-6)', () => {
  describe('Phase 1: Project Storage & File Integrity', () => {
    it('1.1 & 1.2: SHA-256 Checksum generation and verification works accurately', () => {
      const pkg = createLForgePackage(sampleDoc);
      expect(pkg.format).toBe('lforge');
      expect(pkg.manifest.checksum).toMatch(/^sha256-[a-f0-9]{64}$/);

      const jsonStr = JSON.stringify(pkg);
      const validated = parseAndValidateLForgePackage(jsonStr);
      expect(validated.success).toBe(true);
      expect(validated.document?.name).toBe('Regression Test Label');
    });

    it('1.3: Detects tampered content and rejects checksum mismatch', () => {
      const pkg = createLForgePackage(sampleDoc);
      pkg.document.name = 'TAMPERED NAME';
      const tamperedJson = JSON.stringify(pkg);

      const res = parseAndValidateLForgePackage(tamperedJson);
      expect(res.success).toBe(false);
      expect(res.code).toBe('CHECKSUM_MISMATCH');
    });
  });

  describe('Phase 2: Printing Correctness & Protocol Routing', () => {
    it('2.1: Case-insensitively routes all thermal & GDI printer languages to IPC printer types', () => {
      expect(resolveIPCPrinterType('windows-gdi')).toBe('windows');
      expect(resolveIPCPrinterType('ZPL')).toBe('zpl');
      expect(resolveIPCPrinterType('tspl')).toBe('tspl');
      expect(resolveIPCPrinterType('EPL')).toBe('epl');
      expect(resolveIPCPrinterType('cpcl')).toBe('cpcl');
      expect(resolveIPCPrinterType('sbpl')).toBe('sbpl');
      expect(resolveIPCPrinterType('DPL')).toBe('dpl');
    });
  });

  describe('Phase 3: Barcode Symbology Correctness', () => {
    it('3.1: DataMatrix ECC 200 generates valid vector SVG', () => {
      const svg = generateDataMatrixSvg('01006141419999961726091410LOT88121SN10029', 40, 40);
      expect(svg).toContain('<svg');
      expect(svg.includes('<path') || svg.includes('<rect')).toBe(true);
    });

    it('3.2: Postal 4-State generates USPS Intelligent Mail SVG', () => {
      const svg = generatePostal4StateSvg('01234567890123456789', 50, 15, '#000000', 'usps-imb');
      expect(svg).toContain('<svg');
    });

    it('GS1 Modulo 10 check digit calculation', () => {
      expect(calculateGS1Modulo10('590123412345')).toBe(7);
    });
  });

  describe('Phase 4: BarTender & Data Binding Integrity', () => {
    it('4.1: Path normalization removes Windows drive letters and standardizes slashes', () => {
      expect(normalizePath('C:\\BarTender\\Templates\\test.btw')).toBe('C:/BarTender/Templates/test.btw');
      expect(toPlatformAgnosticPath('C:\\BarTender\\Templates\\test.btw')).toBe('/BarTender/Templates/test.btw');
    });

    it('4.3: RFC 4180 CSV parser handles quotes and commas correctly', () => {
      const csv = `SKU,Description\nSKU-100,"Box, Large Heavy Duty"`;
      const parsed = parseCsvText(csv);
      expect(parsed.records[0].Description).toBe('Box, Large Heavy Duty');
    });
  });

  describe('Phase 5: Intelligent Canvas Snap Engine', () => {
    it('5.1: Snaps to sibling center and edge alignment lines', () => {
      const result = computeIntelligentSnap({
        draggedObj: { id: 'obj1', x: 10.2, y: 20, width: 30, height: 20 } as any,
        otherObjects: [{ id: 'obj2', x: 10, y: 50, width: 30, height: 20, visible: true } as any],
        canvasWidthMm: 100,
        canvasHeightMm: 100,
        thresholdMm: 1.5,
        enabled: true,
      });
      expect(result.hasSnappedX).toBe(true);
      expect(result.x).toBe(10);
    });
  });

  describe('Phase 6: SSRF & Network Security', () => {
    it('6.1: Blocks loopbacks, decimal obfuscated IPs, and metadata targets', () => {
      expect(validateNetworkDestination('127.0.0.1', 9100).valid).toBe(false);
      expect(validateNetworkDestination('0x7f000001', 9100).valid).toBe(false);
      expect(validateNetworkDestination('169.254.169.254', 9100).valid).toBe(false);
      expect(validateNetworkDestination('192.168.1.50', 9100).valid).toBe(true);
    });
  });
});
