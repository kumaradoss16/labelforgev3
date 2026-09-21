import { describe, it, expect } from 'vitest';
import { createLForgePackage, parseAndValidateLForgePackage } from '../services/lforgePackage';
import { isDesktopApp } from '../services/desktopBridge';

describe('LabelForge Desktop Services', () => {
  it('correctly detects desktop environment vs web fallback', () => {
    expect(isDesktopApp()).toBe(false); // in standard Node/jsdom test runner
  });

  it('generates valid .lforge package with cryptographic checksum', () => {
    const mockDoc: any = {
      id: 'doc-test-01',
      name: 'Test Hazardous Goods Shipping Label',
      dimensions: { width: 100, height: 150, unit: 'mm' },
      objects: [
        {
          id: 'barcode-1',
          type: 'barcode',
          x: 10,
          y: 20,
          width: 50,
          height: 25,
          value: '00123456789012345675'
        }
      ]
    };

    const pkg = createLForgePackage(mockDoc);
    expect(pkg.manifest.format).toBe('LabelForge Package');
    expect(pkg.manifest.extension).toBe('.lforge');
    expect(pkg.manifest.checksum).toBeDefined();
    expect(pkg.document.name).toBe('Test Hazardous Goods Shipping Label');

    const serialized = JSON.stringify(pkg);
    const parsed = parseAndValidateLForgePackage(serialized);
    expect(parsed.success).toBe(true);
    expect(parsed.document?.id).toBe('doc-test-01');
    expect(parsed.document?.objects.length).toBe(1);
  });
});
