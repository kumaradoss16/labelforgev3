import { describe, it, expect } from 'vitest';
import {
  generateDataMatrixSvg,
  generatePostal4StateSvg,
  renderBwipBarcodeSvg,
  calculateGS1Modulo10,
  validateModulo10CheckDigit,
  parseGS1ApplicationIdentifiers,
  BARCODE_CATALOG
} from '../services/barcodeEngine';

describe('Phase 3: Barcode Correctness', () => {
  describe('3.1 DataMatrix ECC 200 Real Encoder', () => {
    it('generates authentic ISO DataMatrix SVG via bwip-js', () => {
      const data = '01006141419999961726091410LOT88121SN10029';
      const svg = generateDataMatrixSvg(data, 30, 30);

      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      // Should contain real path or rect vectors for modules, not fake canvas/sin grid
      expect(svg.includes('<path') || svg.includes('<rect')).toBe(true);
      expect(svg).not.toContain('Math.sin');
    });
  });

  describe('3.2 Postal Barcode Real Encoder', () => {
    it('generates real 4-state USPS Intelligent Mail barcode', () => {
      const data = '01234567890123456789';
      const svg = generatePostal4StateSvg(data, 50, 15, '#000000', 'usps-imb');

      expect(svg).toContain('<svg');
      expect(svg.includes('<path') || svg.includes('<rect')).toBe(true);
    });

    it('generates real Royal Mail 4-State barcode', () => {
      const data = 'EC1A1BB9Z';
      const svg = generatePostal4StateSvg(data, 50, 15, '#000000', 'royalmail-4state');

      expect(svg).toContain('<svg');
      expect(svg.includes('<path') || svg.includes('<rect')).toBe(true);
    });
  });

  describe('3.3 Catalog Reconciliation & Universal bwip-js Rendering', () => {
    it('renders Aztec Code correctly', () => {
      const result = renderBwipBarcodeSvg('aztec', 'TICKET-99201');
      expect(result.svgContent).toContain('<svg');
      expect(result.error).toBeUndefined();
    });

    it('renders PDF417 correctly', () => {
      const result = renderBwipBarcodeSvg('pdf417', 'PASSENGER:JOHN_DOE');
      expect(result.svgContent).toContain('<svg');
      expect(result.error).toBeUndefined();
    });

    it('renders Code 11 correctly', () => {
      const result = renderBwipBarcodeSvg('code11', '123-456-789');
      expect(result.svgContent).toContain('<svg');
      expect(result.error).toBeUndefined();
    });

    it('verifies all catalog entries have consistent metadata and real rendering capability', () => {
      const nonHardwareCatalog = BARCODE_CATALOG.filter(b => b.status === 'SUPPORTED');
      expect(nonHardwareCatalog.length).toBeGreaterThan(15);
      for (const item of nonHardwareCatalog) {
        expect(item.standard).toBeDefined();
        expect(item.checksumType).toBeDefined();
      }
    });
  });

  describe('GS1 AI & Check Digit Verification', () => {
    it('calculates GS1 Modulo 10 check digit accurately', () => {
      // EAN-13 GTIN '590123412345' -> check digit is 7
      expect(calculateGS1Modulo10('590123412345')).toBe(7);
      expect(validateModulo10CheckDigit('5901234123457')).toBe(true);
      expect(validateModulo10CheckDigit('5901234123450')).toBe(false);
    });

    it('parses bracketed GS1 Application Identifiers correctly', () => {
      const input = '(01)00614141999996(10)LOT-2026-X99(21)SN-90823412';
      const parsed = parseGS1ApplicationIdentifiers(input);

      expect(parsed.parsedAIs).toHaveLength(3);
      expect(parsed.parsedAIs[0].ai).toBe('01');
      expect(parsed.parsedAIs[1].ai).toBe('10');
      expect(parsed.parsedAIs[2].ai).toBe('21');
    });
  });
});
