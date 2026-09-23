import { describe, it, expect } from 'vitest';
import { createLForgePackage, parseAndValidateLForgePackage } from '../services/lforgePackage';
import { LabelDocument } from '../types/label';

const sampleDoc: LabelDocument = {
  id: 'doc-100',
  schemaVersion: '2.0.0',
  name: 'Checksum Verification Label',
  author: 'Engineer',
  created: '2026-09-22T10:00:00.000Z',
  modified: '2026-09-22T10:00:00.000Z',
  metadata: {
    version: 1,
    status: 'published'
  },
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
      name: 'Label Header',
      x: 10,
      y: 10,
      width: 50,
      height: 10,
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 1,
      text: 'PALLET IDENTIFIER',
      style: {
        fontFamily: 'Inter',
        fontSize: 12
      }
    }
  ]
};

describe('.lforge Package Integrity & Checksum Verification', () => {
  it('creates package with deterministic SHA-256 checksum', () => {
    const pkg = createLForgePackage(sampleDoc);
    expect(pkg.format).toBe('lforge');
    expect(pkg.schemaVersion).toBe(2);
    expect(pkg.manifest.checksum).toMatch(/^sha256-[0-9a-f]{64}$/);
  });

  it('verifies valid package successfully', () => {
    const pkg = createLForgePackage(sampleDoc);
    const jsonStr = JSON.stringify(pkg);
    const res = parseAndValidateLForgePackage(jsonStr);

    expect(res.success).toBe(true);
    expect(res.document?.name).toBe('Checksum Verification Label');
    expect(res.package?.manifest.checksum).toBe(pkg.manifest.checksum);
  });

  it('detects checksum mismatch when document is tampered', () => {
    const pkg = createLForgePackage(sampleDoc);
    // Tamper with document payload after checksum calculation
    pkg.document.name = 'TAMPERED NAME';
    const tamperedJson = JSON.stringify(pkg);

    const res = parseAndValidateLForgePackage(tamperedJson);
    expect(res.success).toBe(false);
    expect(res.code).toBe('CHECKSUM_MISMATCH');
    expect(res.error).toContain('checksum failed validation');
  });

  it('rejects path traversal characters in template metadata', () => {
    const pkg = createLForgePackage(sampleDoc);
    pkg.document.name = '../../etc/passwd';
    const jsonStr = JSON.stringify(pkg);

    const res = parseAndValidateLForgePackage(jsonStr);
    expect(res.success).toBe(false);
    expect(res.code).toBe('SECURITY_VIOLATION');
  });
});
