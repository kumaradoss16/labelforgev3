/**
 * LabelForge Desktop - Project Storage Service
 * Handles serialization, deserialization, and integrity validation of .lforge packages
 */

import path from 'path';
import { fileManager } from './fileManager';
import { recentProjects } from './recentFiles';
import { ProjectError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface LForgeManifest {
  format: 'LabelForge Package';
  extension: '.lforge';
  schemaVersion: string;
  templateId: string;
  name: string;
  checksum: string;
  createdAt: string;
  modifiedAt: string;
  author: string;
  producerVersion: string;
}

export interface LForgePackage {
  manifest: LForgeManifest;
  document: any;
  assets?: Record<string, string>;
  previews?: Record<string, any>;
}

export class ProjectStorageService {
  public async loadProject(filePath: string): Promise<LForgePackage> {
    logger.info('ProjectStorageService', `Loading project from ${filePath}`);
    const content = await fileManager.readFile(filePath);

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (err: any) {
      throw new ProjectError(`Project file is not valid JSON: ${err.message}`, { path: filePath });
    }

    // Verify it is a valid LabelForge Package
    if (!parsed.manifest || parsed.manifest.format !== 'LabelForge Package') {
      // Check if it's a legacy or raw LabelDocument
      if (parsed.dimensions && Array.isArray(parsed.objects)) {
        logger.warn('ProjectStorageService', 'Converting legacy raw label document to .lforge package');
        const legacyDoc = parsed;
        const pkg: LForgePackage = {
          manifest: {
            format: 'LabelForge Package',
            extension: '.lforge',
            schemaVersion: '2.0.0',
            templateId: legacyDoc.id || `legacy-${Date.now()}`,
            name: legacyDoc.name || path.basename(filePath, '.lforge'),
            checksum: 'legacy-import',
            createdAt: legacyDoc.created || new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            author: legacyDoc.author || 'User',
            producerVersion: 'LabelForge Desktop 3.0.0'
          },
          document: legacyDoc
        };
        recentProjects.addRecent(filePath, pkg.manifest.name);
        return pkg;
      }

      throw new ProjectError('File is missing valid LabelForge manifest or document structure', { path: filePath });
    }

    if (!parsed.document || !parsed.document.dimensions || !Array.isArray(parsed.document.objects)) {
      throw new ProjectError('LabelForge document definition is incomplete or corrupted', { path: filePath });
    }

    // Add to recent projects
    recentProjects.addRecent(filePath, parsed.manifest.name || parsed.document.name);
    return parsed as LForgePackage;
  }

  public async saveProject(filePath: string, pkg: LForgePackage): Promise<void> {
    logger.info('ProjectStorageService', `Saving project to ${filePath}`);

    if (!pkg || !pkg.document) {
      throw new ProjectError('Cannot save empty project payload', { path: filePath });
    }

    // Update modified timestamp and producer
    const updatedPkg: LForgePackage = {
      ...pkg,
      manifest: {
        ...pkg.manifest,
        format: 'LabelForge Package',
        extension: '.lforge',
        schemaVersion: '2.0.0',
        modifiedAt: new Date().toISOString(),
        producerVersion: 'LabelForge Desktop 3.0.0'
      }
    };

    const jsonString = JSON.stringify(updatedPkg, null, 2);
    await fileManager.writeFile(filePath, jsonString);

    // Register in recent projects
    recentProjects.addRecent(filePath, updatedPkg.manifest.name || updatedPkg.document.name);
    logger.info('ProjectStorageService', `Project successfully saved to ${filePath}`);
  }
}

export const projectStorage = new ProjectStorageService();
