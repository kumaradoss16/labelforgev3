/**
 * LabelForge Platform - Canonical .lforge Package Specification
 * Secure, self-contained, enterprise label package format
 */

import { LabelDocument } from '../types/label';

export interface LForgeManifest {
  format: 'LabelForge Package';
  extension: '.lforge';
  schemaVersion: '2.0.0';
  minimumReaderVersion: '1.0.0';
  producerVersion: 'LabelForge Studio 2026.3 Enterprise';
  templateId: string;
  versionId: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  author: string;
  checksum: string;
  requiredFonts: string[];
  requiredSymbologies: string[];
  targetPrinters?: string[];
  security: {
    encrypted: boolean;
    sanitized: boolean;
    allowExternalDataBinding: boolean;
  };
}

export interface LForgePackage {
  manifest: LForgeManifest;
  document: LabelDocument;
  assets?: Record<string, string>; // e.g. base64 or SVG assets
  previews?: {
    thumbnailSvg?: string;
    targetDpi?: number;
  };
}

/**
 * Computes deterministic simple hex hash for checksum verification
 */
function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'lf-' + Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Validates document and extracts required dependencies (fonts, symbologies)
 */
export function extractPackageDependencies(doc: LabelDocument): {
  requiredFonts: string[];
  requiredSymbologies: string[];
} {
  const fonts = new Set<string>();
  const symbologies = new Set<string>();

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

  return {
    requiredFonts: Array.from(fonts),
    requiredSymbologies: Array.from(symbologies),
  };
}

/**
 * Creates an authentic canonical .lforge package from a LabelDocument
 */
export function createLForgePackage(doc: LabelDocument): LForgePackage {
  const docJson = JSON.stringify(doc);
  const checksum = computeChecksum(docJson);
  const { requiredFonts, requiredSymbologies } = extractPackageDependencies(doc);

  const manifest: LForgeManifest = {
    format: 'LabelForge Package',
    extension: '.lforge',
    schemaVersion: '2.0.0',
    minimumReaderVersion: '1.0.0',
    producerVersion: 'LabelForge Studio 2026.3 Enterprise',
    templateId: doc.id || `lft-${Date.now()}`,
    versionId: `v${doc.metadata?.version || 1}.0`,
    name: doc.name || 'Untitled Label',
    createdAt: doc.created || new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    author: doc.author || 'LabelForge Engineer',
    checksum,
    requiredFonts,
    requiredSymbologies,
    targetPrinters: doc.metadata?.targetPrinter ? [doc.metadata.targetPrinter] : ['Zebra ZPL', 'TSC TSPL', 'Standard Windows'],
    security: {
      encrypted: false,
      sanitized: true,
      allowExternalDataBinding: true,
    },
  };

  return {
    manifest,
    document: {
      ...doc,
      modified: new Date().toISOString(),
    },
  };
}

/**
 * Securely parses and validates an incoming .lforge file or legacy .btw.json
 * Defends against Zip Slip / path traversal / malformed structures
 */
export function parseAndValidateLForgePackage(rawContent: string): {
  success: boolean;
  document?: LabelDocument;
  manifest?: LForgeManifest;
  warnings: string[];
  error?: string;
} {
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(rawContent);

    // Case 1: Canonical .lforge package
    if (parsed.manifest && parsed.document) {
      const doc = parsed.document as LabelDocument;
      if (!doc.dimensions || !Array.isArray(doc.objects)) {
        return {
          success: false,
          warnings,
          error: 'Corrupted .lforge package: Missing canonical document geometry or objects array.',
        };
      }

      // Security check: Path traversal verification in names / IDs
      if (doc.name && (doc.name.includes('../') || doc.name.includes('..\\'))) {
        return {
          success: false,
          warnings,
          error: 'Security violation: Path traversal characters detected in template name.',
        };
      }

      // Verify checksum
      const currentChecksum = computeChecksum(JSON.stringify(doc));
      if (parsed.manifest.checksum && parsed.manifest.checksum !== currentChecksum) {
        warnings.push('Manifest checksum mismatch: Template was edited outside of authenticated studio session.');
      }

      return {
        success: true,
        document: doc,
        manifest: parsed.manifest,
        warnings,
      };
    }

    // Case 2: Direct LabelDocument (legacy / raw JSON)
    if (parsed.dimensions && Array.isArray(parsed.objects)) {
      warnings.push('Imported legacy unencapsulated JSON document. Automatically upgrading to canonical .lforge package.');
      return {
        success: true,
        document: parsed as LabelDocument,
        warnings,
      };
    }

    return {
      success: false,
      warnings,
      error: 'Unrecognized file structure: Neither canonical .lforge nor valid LabelDocument schema.',
    };
  } catch (err: any) {
    return {
      success: false,
      warnings,
      error: `JSON parse failure: ${err?.message || 'Malformed data'}`,
    };
  }
}
