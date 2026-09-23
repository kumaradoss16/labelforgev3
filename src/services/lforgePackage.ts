/**
 * LabelForge Platform - Canonical .lforge Package Specification & Utilities
 */

import { LabelDocument, LabelObject } from '../types/label';
import { LForgeManifest, LForgePackage, computeDocumentChecksum } from '../types/lforge';
import { migrateLForgePackage } from './lforgeMigration';

export type { LForgeManifest, LForgePackage };
export { computeDocumentChecksum };

/**
 * Validates document and extracts required dependencies (fonts, symbologies)
 */
export function extractPackageDependencies(doc: LabelDocument): {
  requiredFonts: string[];
  requiredSymbologies: string[];
} {
  const fonts = new Set<string>();
  const symbologies = new Set<string>();

  if (doc && Array.isArray(doc.objects)) {
    for (const obj of doc.objects) {
      if (obj.type === 'text' || obj.type === 'rich-text') {
        const textObj = obj as any;
        if (textObj.style?.fontFamily) {
          fonts.add(textObj.style.fontFamily);
        }
      } else if (obj.type === 'barcode' || obj.type === 'qrcode' || obj.type === 'datamatrix') {
        const barcodeObj = obj as any;
        if (barcodeObj.barcodeStyle?.symbology) {
          symbologies.add(barcodeObj.barcodeStyle.symbology);
        }
      }
    }
  }

  return {
    requiredFonts: Array.from(fonts),
    requiredSymbologies: Array.from(symbologies),
  };
}

/**
 * Creates an authentic canonical .lforge package from a LabelDocument
 * Normalizes object schema and computes SHA-256 checksum on exact document
 */
export function createLForgePackage(doc: LabelDocument): LForgePackage {
  const normalizedObjects = (doc.objects || []).map((obj: any) => ({
    ...obj,
    rotation: typeof obj.rotation === 'number' ? obj.rotation : 0,
    visible: obj.visible !== false,
    locked: Boolean(obj.locked),
    opacity: typeof obj.opacity === 'number' ? obj.opacity : 1,
    zIndex: typeof obj.zIndex === 'number' ? obj.zIndex : 1
  }));

  // 1. Finalize document modifications first
  const finalizedDoc: LabelDocument = {
    ...doc,
    schemaVersion: '2.0.0',
    objects: normalizedObjects as LabelObject[],
    created: doc.created || new Date().toISOString(),
    modified: new Date().toISOString()
  };

  // 2. Compute checksum on finalized document payload
  const checksum = computeDocumentChecksum(finalizedDoc);
  const { requiredFonts, requiredSymbologies } = extractPackageDependencies(finalizedDoc);

  const manifest: LForgeManifest = {
    format: 'LabelForge Package',
    extension: '.lforge',
    schemaVersion: 2,
    producerVersion: 'LabelForge Studio 3.0.0 Enterprise',
    templateId: finalizedDoc.id || `lft-${Date.now()}`,
    name: finalizedDoc.name || 'Untitled Label',
    createdAt: finalizedDoc.created,
    modifiedAt: finalizedDoc.modified,
    author: finalizedDoc.author || 'LabelForge Engineer',
    checksum,
    requiredFonts,
    requiredSymbologies,
    targetPrinters: finalizedDoc.metadata?.targetPrinter ? [finalizedDoc.metadata.targetPrinter] : ['Zebra ZPL', 'TSC TSPL', 'Standard Windows'],
    security: {
      encrypted: false,
      sanitized: true,
      allowExternalDataBinding: true,
    },
  };

  return {
    format: 'lforge',
    schemaVersion: 2,
    manifest,
    document: finalizedDoc
  };
}

/**
 * Securely parses and validates an incoming .lforge file or legacy .json payload
 * Checks structural schema integrity and verifies document checksum
 */
export function parseAndValidateLForgePackage(rawContent: string): {
  success: boolean;
  package?: LForgePackage;
  document?: LabelDocument;
  manifest?: LForgeManifest;
  warnings: string[];
  code?: string;
  error?: string;
} {
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(rawContent);
    const pkg = migrateLForgePackage(parsed);

    // Security check: Path traversal verification in names
    if (pkg.document.name && (pkg.document.name.includes('../') || pkg.document.name.includes('..\\'))) {
      return {
        success: false,
        warnings,
        code: 'SECURITY_VIOLATION',
        error: 'Security violation: Path traversal characters detected in project metadata.',
      };
    }

    // Verify SHA-256 checksum
    const computedChecksum = computeDocumentChecksum(pkg.document);
    if (parsed.manifest?.checksum && parsed.manifest.checksum !== 'checksum-pending' && parsed.manifest.checksum !== 'legacy-import' && parsed.manifest.checksum !== computedChecksum) {
      return {
        success: false,
        warnings,
        code: 'CHECKSUM_MISMATCH',
        error: `The project file checksum failed validation. The file may have been modified or corrupted. Claimed: ${parsed.manifest.checksum}, Computed: ${computedChecksum}`,
      };
    }

    // Assign final valid checksum to manifest
    pkg.manifest.checksum = computedChecksum;

    return {
      success: true,
      package: pkg,
      document: pkg.document,
      manifest: pkg.manifest,
      warnings,
    };
  } catch (err: any) {
    return {
      success: false,
      warnings,
      code: 'PARSE_FAILURE',
      error: `JSON parse failure: ${err?.message || 'Malformed data'}`,
    };
  }
}
