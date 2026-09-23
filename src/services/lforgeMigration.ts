/**
 * LabelForge Package Migration Manager
 * Versioned schema transformations for .lforge package definitions
 */

import { LForgePackage } from '../types/lforge';
import { LabelDocument } from '../types/label';

export function migrateLForgePackage(pkg: any): LForgePackage {
  if (!pkg) {
    throw new Error('Cannot migrate empty package');
  }

  // Handle legacy unencapsulated document
  if (pkg.dimensions && Array.isArray(pkg.objects) && !pkg.manifest) {
    const legacyDoc = pkg as LabelDocument;
    return {
      format: 'lforge',
      schemaVersion: 2,
      manifest: {
        format: 'LabelForge Package',
        extension: '.lforge',
        schemaVersion: 2,
        producerVersion: 'LabelForge Studio 3.0.0 Migration',
        templateId: legacyDoc.id || `lft-${Date.now()}`,
        name: legacyDoc.name || 'Migrated Label',
        createdAt: legacyDoc.created || new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        author: legacyDoc.author || 'Design Engineer',
        checksum: 'checksum-pending',
        requiredFonts: ['Inter', 'Arial'],
        requiredSymbologies: ['Code128'],
        security: {
          encrypted: false,
          sanitized: true,
          allowExternalDataBinding: true
        }
      },
      document: {
        ...legacyDoc,
        schemaVersion: '2.0.0'
      }
    };
  }

  // Handle v1 package
  let document: LabelDocument = pkg.document;

  if (!document || !document.dimensions || !Array.isArray(document.objects)) {
    throw new Error('Invalid or corrupted document schema in package');
  }

  // Ensure all objects have required default properties
  const migratedObjects = document.objects.map((obj: any) => {
    return {
      ...obj,
      rotation: typeof obj.rotation === 'number' ? obj.rotation : 0,
      visible: obj.visible !== false,
      locked: Boolean(obj.locked)
    };
  });

  document = {
    ...document,
    objects: migratedObjects,
    schemaVersion: '2.0.0'
  };

  const manifest = {
    format: 'LabelForge Package' as const,
    extension: '.lforge' as const,
    schemaVersion: 2,
    producerVersion: 'LabelForge Studio 3.0.0',
    templateId: pkg.manifest?.templateId || document.id || `lft-${Date.now()}`,
    name: pkg.manifest?.name || document.name || 'Untitled Label',
    createdAt: pkg.manifest?.createdAt || document.created || new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    author: pkg.manifest?.author || document.author || 'Design Engineer',
    checksum: pkg.manifest?.checksum || 'checksum-pending',
    requiredFonts: Array.isArray(pkg.manifest?.requiredFonts) ? pkg.manifest.requiredFonts : ['Inter'],
    requiredSymbologies: Array.isArray(pkg.manifest?.requiredSymbologies) ? pkg.manifest.requiredSymbologies : [],
    targetPrinters: pkg.manifest?.targetPrinters || ['Zebra ZPL', 'TSC TSPL'],
    security: {
      encrypted: Boolean(pkg.manifest?.security?.encrypted),
      sanitized: true,
      allowExternalDataBinding: Boolean(pkg.manifest?.security?.allowExternalDataBinding ?? true)
    }
  };

  return {
    format: 'lforge',
    schemaVersion: 2,
    manifest,
    document,
    assets: pkg.assets || {},
    previews: pkg.previews || {}
  };
}
