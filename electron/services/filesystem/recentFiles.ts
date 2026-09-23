/**
 * LabelForge Desktop - Recent Projects Service
 * Manages persisted history of recently accessed label projects in AppData
 */

import fs from 'fs';
import path from 'path';
import { paths } from '../../config/paths';
import { appConfig } from '../../config/appConfig';
import { logger } from '../../utils/logger';

export interface RecentProjectEntry {
  filePath: string;
  fileName: string;
  lastOpened: string;
  labelName?: string;
}

export class RecentProjectsService {
  private getStoragePath(): string {
    return paths.getRecentFilePath();
  }

  private ensureDirExists(file: string) {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
  }

  public getRecent(): RecentProjectEntry[] {
    const file = this.getStoragePath();
    if (!fs.existsSync(file)) {
      return [];
    }

    try {
      const raw = fs.readFileSync(file, 'utf-8');
      const list: RecentProjectEntry[] = JSON.parse(raw);

      // Filter out files that no longer exist on disk
      const existing = list.filter(item => {
        try {
          return fs.existsSync(item.filePath);
        } catch {
          return false;
        }
      });

      return existing.slice(0, appConfig.maxRecentProjects);
    } catch (err) {
      logger.error('RecentProjectsService', 'Failed to read recent projects', err);
      return [];
    }
  }

  public addRecent(filePath: string, labelName?: string): void {
    try {
      const storagePath = this.getStoragePath();
      this.ensureDirExists(storagePath);

      const current = this.getRecent();
      const normalized = path.normalize(filePath);
      const fileName = path.basename(normalized);

      // Remove existing entry with identical path
      const filtered = current.filter(item => path.normalize(item.filePath) !== normalized);

      const updated: RecentProjectEntry[] = [
        {
          filePath: normalized,
          fileName,
          lastOpened: new Date().toISOString(),
          labelName: labelName || fileName.replace(/\.lforge$/i, '')
        },
        ...filtered
      ].slice(0, appConfig.maxRecentProjects);

      fs.writeFileSync(storagePath, JSON.stringify(updated, null, 2), 'utf-8');
      logger.info('RecentProjectsService', `Added recent file: ${normalized}`);
    } catch (err) {
      logger.error('RecentProjectsService', `Failed to update recent files: ${filePath}`, err);
    }
  }

  public clearRecent(): void {
    try {
      const storagePath = this.getStoragePath();
      this.ensureDirExists(storagePath);
      fs.writeFileSync(storagePath, JSON.stringify([]), 'utf-8');
      logger.info('RecentProjectsService', 'Cleared recent projects list');
    } catch (err) {
      logger.error('RecentProjectsService', 'Failed to clear recent projects', err);
    }
  }
}

export const recentProjects = new RecentProjectsService();
