import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { projectStorage } from '../../electron/services/filesystem/projectStorage';
import { createLForgePackage } from '../services/lforgePackage';
import { LabelDocument } from '../types/label';

describe('Phase 1.3 Integration Tests — ProjectStorageService.saveProject()', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labelforge-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const testDoc: LabelDocument = {
    id: 'doc-integ-001',
    schemaVersion: '2.0.0',
    name: 'Pharma Packaging Serialized Label',
    author: 'Compliance Lead',
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
      dpi: 300,
      orientation: 'portrait',
      marginLeft: 0,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0
    },
    objects: [
      {
        id: 'bc-datamatrix-1',
        type: 'datamatrix',
        name: 'GS1 DataMatrix Serialization',
        x: 10,
        y: 10,
        width: 30,
        height: 30,
        rotation: 0,
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 1,
        value: '(01)00312345678906(21)SER998877(17)281231',
        barcodeStyle: {
          symbology: 'gs1-datamatrix',
          humanReadable: true,
          humanReadableFont: 'Arial',
          humanReadableSize: 8,
          humanReadablePosition: 'bottom',
          moduleWidth: 0.5,
          quietZone: true,
          quietZoneSize: 2,
          color: '#000000',
          backgroundColor: '#ffffff'
        }
      }
    ]
  };

  it('saves a brand new .lforge project file and reopens it cleanly without CHECKSUM_MISMATCH', async () => {
    const pkg = createLForgePackage(testDoc);
    const targetPath = path.join(tempDir, 'brand_new_label.lforge');

    await projectStorage.saveProject(targetPath, pkg);

    expect(fs.existsSync(targetPath)).toBe(true);

    // Reopen and verify round-trip
    const reloaded = await projectStorage.loadProject(targetPath);
    expect(reloaded.manifest.name).toBe('Pharma Packaging Serialized Label');
    expect(reloaded.document.id).toBe('doc-integ-001');
    expect(reloaded.document.objects.length).toBe(1);
    expect(reloaded.manifest.checksum).toBeDefined();
  });

  it('overwrites an existing .lforge file atomically and maintains checksum validity', async () => {
    const targetPath = path.join(tempDir, 'overwrite_label.lforge');

    // First save
    const pkg1 = createLForgePackage(testDoc);
    await projectStorage.saveProject(targetPath, pkg1);

    // Modify document and save again
    const updatedDoc: LabelDocument = {
      ...testDoc,
      name: 'Pharma Packaging Serialized Label v2'
    };
    const pkg2 = createLForgePackage(updatedDoc);
    await projectStorage.saveProject(targetPath, pkg2);

    // Load and verify updated content
    const reloaded = await projectStorage.loadProject(targetPath);
    expect(reloaded.manifest.name).toBe('Pharma Packaging Serialized Label v2');
    expect(reloaded.document.name).toBe('Pharma Packaging Serialized Label v2');
  });

  it('detects on-disk file corruption or external tampering and throws CHECKSUM_MISMATCH', async () => {
    const targetPath = path.join(tempDir, 'tamper_label.lforge');
    const pkg = createLForgePackage(testDoc);
    await projectStorage.saveProject(targetPath, pkg);

    // Tamper with file content on disk (change document name without updating checksum)
    const rawOnDisk = fs.readFileSync(targetPath, 'utf-8');
    const parsedOnDisk = JSON.parse(rawOnDisk);
    parsedOnDisk.document.name = 'UNAUTHORIZED EXTERNAL TAMPERING';
    fs.writeFileSync(targetPath, JSON.stringify(parsedOnDisk, null, 2), 'utf-8');

    // Attempting to load tampered file must fail with CHECKSUM_MISMATCH error
    await expect(projectStorage.loadProject(targetPath)).rejects.toThrow('CHECKSUM_MISMATCH');
  });
});
