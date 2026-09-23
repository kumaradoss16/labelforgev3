/**
 * LabelForge Desktop - Project Storage Service
 * Handles atomic serialization, deserialization, migration, and checksum verification of .lforge packages
 */

import path from 'path';
import { recentProjects } from './recentFiles';
import { atomicFileReplace } from './atomicFileReplaceService';
import { ProjectError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { LForgePackage, computeDocumentChecksum } from '../../../src/types/lforge';
import { migrateLForgePackage } from '../../../src/services/lforgeMigration';
import { LabelDocument, LabelObject } from '../../../src/types/label';

export type { LForgePackage };

export class ProjectStorageService {
  /**
   * Loads and validates a .lforge project file with SHA-256 checksum verification
   */
  public async loadProject(filePath: string): Promise<LForgePackage> {
    logger.info('ProjectStorageService', `Loading project from ${filePath}`);
    
    let content: string;
    try {
      const fs = await import('fs');
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err: any) {
      throw new ProjectError(`Failed to read project file: ${err.message}`, { path: filePath });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err: any) {
      throw new ProjectError(`Project file is not valid JSON: ${err.message}`, { path: filePath });
    }

    // Run schema migration to transform legacy or v1 formats into canonical v2 package
    let pkg: LForgePackage;
    try {
      pkg = migrateLForgePackage(parsed);
    } catch (err: any) {
      throw new ProjectError(`Project schema migration failed: ${err.message}`, { path: filePath });
    }

    // Verify SHA-256 Checksum if present in original manifest
    if (parsed.manifest && parsed.manifest.checksum && parsed.manifest.checksum !== 'checksum-pending' && parsed.manifest.checksum !== 'legacy-import') {
      const computedChecksum = computeDocumentChecksum(pkg.document);
      if (parsed.manifest.checksum !== computedChecksum) {
        logger.error('ProjectStorageService', `Checksum mismatch for ${filePath}. Claimed: ${parsed.manifest.checksum}, Computed: ${computedChecksum}`);
        throw new ProjectError('CHECKSUM_MISMATCH: The project file checksum does not match its payload. It may have been modified or corrupted.', {
          path: filePath,
          claimed: parsed.manifest.checksum,
          computed: computedChecksum
        });
      }
    }

    // Register in recent files
    recentProjects.addRecent(filePath, pkg.manifest.name || pkg.document.name || path.basename(filePath));

    return pkg;
  }

  /**
   * Performs Atomic Save with exact pipeline order:
   * 1. Normalize document
   * 2. Update document.modified
   * 3. Normalize objects
   * 4. Compute SHA-256 checksum on finalized document
   * 5. Build manifest with computed checksum
   * 6. Write via AtomicFileReplaceService
   * 7. Read back and verify written file checksum against payload
   * 8. Commit
   */
  public async saveProject(filePath: string, pkg: LForgePackage): Promise<void> {
    logger.info('ProjectStorageService', `Executing atomic project save to ${filePath}`);

    if (!pkg || !pkg.document) {
      throw new ProjectError('Cannot save empty project payload', { path: filePath });
    }

    // Step 1 & 3: Normalize objects
    const normalizedObjects = (pkg.document.objects || []).map((obj: any) => ({
      ...obj,
      rotation: typeof obj.rotation === 'number' ? obj.rotation : 0,
      visible: obj.visible !== false,
      locked: Boolean(obj.locked),
      opacity: typeof obj.opacity === 'number' ? obj.opacity : 1,
      zIndex: typeof obj.zIndex === 'number' ? obj.zIndex : 1
    }));

    // Step 1 & 2: Normalize document and update modified timestamp
    const finalizedDoc: LabelDocument = {
      ...pkg.document,
      schemaVersion: '2.0.0',
      objects: normalizedObjects as LabelObject[],
      created: pkg.document.created || new Date().toISOString(),
      modified: new Date().toISOString()
    };

    // Step 4: Compute canonical SHA-256 checksum on FINALIZED document payload
    const checksum = computeDocumentChecksum(finalizedDoc);

    // Step 5: Build manifest with exact checksum
    const finalizedPkg: LForgePackage = {
      format: 'lforge',
      schemaVersion: 2,
      manifest: {
        format: 'LabelForge Package',
        extension: '.lforge',
        schemaVersion: 2,
        producerVersion: 'LabelForge Studio 3.0.0 Enterprise',
        templateId: pkg.manifest?.templateId || finalizedDoc.id || `lft-${Date.now()}`,
        name: pkg.manifest?.name || finalizedDoc.name || path.basename(filePath, '.lforge'),
        createdAt: pkg.manifest?.createdAt || finalizedDoc.created,
        modifiedAt: finalizedDoc.modified,
        author: pkg.manifest?.author || finalizedDoc.author || 'LabelForge Engineer',
        checksum,
        requiredFonts: pkg.manifest?.requiredFonts || ['Inter'],
        requiredSymbologies: pkg.manifest?.requiredSymbologies || [],
        targetPrinters: pkg.manifest?.targetPrinters || ['Zebra ZPL', 'TSC TSPL'],
        security: pkg.manifest?.security || {
          encrypted: false,
          sanitized: true,
          allowExternalDataBinding: true
        }
      },
      document: finalizedDoc,
      assets: pkg.assets || {},
      previews: pkg.previews || {}
    };

    const jsonString = JSON.stringify(finalizedPkg, null, 2);

    // Step 6, 7, 8: Write to disk via AtomicFileReplaceService with verification
    try {
      await atomicFileReplace.writeAtomic({
        content: jsonString,
        targetPath: filePath,
        createBackup: true,
        verifyFn: (readBackContent) => {
          const str = typeof readBackContent === 'string' ? readBackContent : readBackContent.toString('utf-8');
          const tempParsed = JSON.parse(str);
          
          if (!tempParsed.manifest || !tempParsed.document) {
            throw new Error('Read-back verification failed: missing manifest or document structure');
          }

          // Verify written manifest checksum matches computed checksum
          if (tempParsed.manifest.checksum !== checksum) {
            throw new Error(`Read-back manifest checksum mismatch: ${tempParsed.manifest.checksum} vs expected ${checksum}`);
          }

          // Verify computing checksum directly on read-back document matches manifest checksum
          const recomputedOnReadBack = computeDocumentChecksum(tempParsed.document);
          if (recomputedOnReadBack !== checksum) {
            throw new Error(`Read-back document checksum mismatch: computed ${recomputedOnReadBack} vs claimed ${checksum}`);
          }
        }
      });

      // Register in recent projects
      recentProjects.addRecent(filePath, finalizedPkg.manifest.name);
      logger.info('ProjectStorageService', `Project saved & verified successfully at ${filePath}`);
    } catch (err: any) {
      logger.error('ProjectStorageService', `Atomic save failed: ${err.message}`);
      throw new ProjectError(`Failed to save project file: ${err.message}`, { path: filePath });
    }
  }
}

export const projectStorage = new ProjectStorageService();
