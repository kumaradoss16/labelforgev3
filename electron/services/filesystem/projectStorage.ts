/**
 * LabelForge Desktop - Project Storage Service
 * Handles atomic serialization, deserialization, migration, and checksum verification of .lforge packages
 */

import path from 'path';
import fs from 'fs';
import { fileManager } from './fileManager';
import { recentProjects } from './recentFiles';
import { ProjectError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { LForgePackage, computeDocumentChecksum } from '../../../src/types/lforge';
import { migrateLForgePackage } from '../../../src/services/lforgeMigration';

export type { LForgePackage };

export class ProjectStorageService {
  /**
   * Loads and validates a .lforge project file with SHA-256 checksum verification
   */
  public async loadProject(filePath: string): Promise<LForgePackage> {
    logger.info('ProjectStorageService', `Loading project from ${filePath}`);
    const content = await fileManager.readFile(filePath);

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

    // Recompute and update manifest checksum to ensure consistency
    pkg.manifest.checksum = computeDocumentChecksum(pkg.document);

    // Register in recent files
    recentProjects.addRecent(filePath, pkg.manifest.name || pkg.document.name || path.basename(filePath));

    return pkg;
  }

  /**
   * Performs Atomic Save (.tmp -> .lforge, backup .bak) with SHA-256 checksum calculation
   */
  public async saveProject(filePath: string, pkg: LForgePackage): Promise<void> {
    logger.info('ProjectStorageService', `Executing atomic project save to ${filePath}`);

    if (!pkg || !pkg.document) {
      throw new ProjectError('Cannot save empty project payload', { path: filePath });
    }

    // Recompute canonical SHA-256 checksum on document before writing
    const checksum = computeDocumentChecksum(pkg.document);

    const finalizedPkg: LForgePackage = {
      format: 'lforge',
      schemaVersion: 2,
      manifest: {
        format: 'LabelForge Package',
        extension: '.lforge',
        schemaVersion: 2,
        producerVersion: 'LabelForge Studio 3.0.0 Enterprise',
        templateId: pkg.manifest?.templateId || pkg.document.id || `lft-${Date.now()}`,
        name: pkg.manifest?.name || pkg.document.name || path.basename(filePath, '.lforge'),
        createdAt: pkg.manifest?.createdAt || pkg.document.created || new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        author: pkg.manifest?.author || pkg.document.author || 'LabelForge Engineer',
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
      document: {
        ...pkg.document,
        modified: new Date().toISOString()
      },
      assets: pkg.assets || {},
      previews: pkg.previews || {}
    };

    const jsonString = JSON.stringify(finalizedPkg, null, 2);

    // Atomic Save Workflow:
    // 1. Write to target.lforge.tmp
    // 2. Validate temp file can be parsed back
    // 3. Backup existing target.lforge to target.lforge.bak
    // 4. Atomic rename target.lforge.tmp to target.lforge
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.bak`;

    try {
      await fileManager.writeFile(tempPath, jsonString);

      // Read back and verify integrity of written temp file
      const tempContent = await fileManager.readFile(tempPath);
      const tempParsed = JSON.parse(tempContent);
      if (!tempParsed.manifest || tempParsed.manifest.checksum !== checksum) {
        throw new Error('Integrity verification failed on temporary file write');
      }

      // Create backup if target file already exists
      if (fs.existsSync(filePath)) {
        try {
          fs.copyFileSync(filePath, backupPath);
        } catch (backupErr: any) {
          logger.warn('ProjectStorageService', `Could not create backup file: ${backupErr.message}`);
        }
      }

      // Atomic overwrite
      fs.renameSync(tempPath, filePath);

      // Register in recent projects
      recentProjects.addRecent(filePath, finalizedPkg.manifest.name);
      logger.info('ProjectStorageService', `Project saved & verified successfully at ${filePath}`);
    } catch (err: any) {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
      logger.error('ProjectStorageService', `Atomic save failed: ${err.message}`);
      throw new ProjectError(`Failed to save project file: ${err.message}`, { path: filePath });
    }
  }
}

export const projectStorage = new ProjectStorageService();
