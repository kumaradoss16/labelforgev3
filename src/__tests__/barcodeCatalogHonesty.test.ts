import { describe, it, expect } from 'vitest';
import { BARCODE_CATALOG, getBwipBcid, render1DBarcodeSvg } from '../services/barcodeEngine';

describe('Phase 2: Barcode Catalog Honesty & Renderer Routing', () => {
  it('2.1 & 2.2 & 2.3: every SUPPORTED catalog symbology renders dedicated SVG without CODE128 fallback', () => {
    const supportedSymbologies = BARCODE_CATALOG.filter(item => item.status === 'SUPPORTED');

    expect(supportedSymbologies.length).toBeGreaterThan(15);

    supportedSymbologies.forEach(info => {
      const bwipBcid = getBwipBcid(info.id);
      const res = render1DBarcodeSvg(
        info.id as any,
        info.defaultData,
        { symbology: info.id as any, humanReadable: true } as any,
        50,
        25
      );

      expect(res.svgContent, `Symbology "${info.id}" failed to generate SVG`).toBeTruthy();
      expect(res.svgContent).toContain('<svg');

      if (bwipBcid) {
        // Must NOT fall back to JsBarcode default CODE128 if bwip-js is available
        expect(res.svgContent, `Symbology "${info.id}" fell back to generic CODE128`).not.toContain('CODE128');
      }
    });
  });

  it('2.2: industrial2of5 maps to bwip-js industrial2of5 bcid', () => {
    expect(getBwipBcid('industrial2of5')).toBe('industrial2of5');
  });

  it('2.3: dun14 maps to bwip-js itf14 bcid', () => {
    expect(getBwipBcid('dun14')).toBe('itf14');
  });

  it('2.4: no catalog symbology claims SUPPORTED status without dedicated renderer mapping', () => {
    BARCODE_CATALOG.forEach(info => {
      if (info.status === 'SUPPORTED') {
        const bwipBcid = getBwipBcid(info.id);
        const isStandard1D = ['code128', 'code39', 'code93', 'ean13', 'ean8', 'upca', 'upce', 'itf14', 'codabar', 'qr'].includes(info.id);
        expect(Boolean(bwipBcid || isStandard1D), `Symbology "${info.id}" claims SUPPORTED but lacks dedicated renderer`).toBe(true);
      }
    });
  });
});
