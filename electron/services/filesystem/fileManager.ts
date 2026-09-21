/**
 * LabelForge Desktop - File Manager
 * Safe filesystem read and write operations with atomic write safeguards
 */

import fs from 'fs';
import path from 'path';
import { FileError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export class FileManager {
  public async readFile(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new FileError(`File does not exist: ${filePath}`);
      }
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (err: any) {
      logger.error('FileManager', `Failed to read file ${filePath}: ${err.message}`);
      throw new FileError(`Failed to read file: ${err.message}`, { path: filePath });
    }
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      // Atomic write: write to temp file, then rename
      const tempPath = `${filePath}.${Date.now()}.tmp`;
      await fs.promises.writeFile(tempPath, content, 'utf-8');
      await fs.promises.rename(tempPath, filePath);

      logger.info('FileManager', `Successfully wrote file ${filePath} (${content.length} bytes)`);
    } catch (err: any) {
      logger.error('FileManager', `Failed to write file ${filePath}: ${err.message}`);
      throw new FileError(`Failed to write file: ${err.message}`, { path: filePath });
    }
  }

  public fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }
}

export const fileManager = new FileManager();
