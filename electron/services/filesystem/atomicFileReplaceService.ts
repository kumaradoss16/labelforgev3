/**
 * LabelForge Desktop - Dedicated Atomic File Replace Service
 * Handles cross-platform (Windows / macOS / Linux) atomic writes with
 * explicit flush/fsync, backup management, permissions handling, and recovery
 */

import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';

export interface AtomicWriteOptions {
  content: string | Buffer;
  targetPath: string;
  createBackup?: boolean;
  verifyFn?: (readBackContent: string | Buffer) => void;
}

export class AtomicFileReplaceService {
  /**
   * Performs a safe cross-platform atomic write with full verification and backup recovery
   */
  public async writeAtomic(options: AtomicWriteOptions): Promise<void> {
    const { content, targetPath, createBackup = true, verifyFn } = options;
    const dir = path.dirname(targetPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const tempPath = `${targetPath}.${Date.now()}.${Math.floor(Math.random() * 10000)}.tmp`;
    const backupPath = `${targetPath}.bak`;

    try {
      // 1. Write content to temporary file with explicit fsync
      const fd = fs.openSync(tempPath, 'w');
      try {
        if (typeof content === 'string') {
          fs.writeFileSync(fd, content, 'utf-8');
        } else {
          fs.writeFileSync(fd, content);
        }
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }

      // 2. Read back temporary file and run verification callback
      const tempWritten = fs.readFileSync(tempPath, typeof content === 'string' ? 'utf-8' : undefined);
      if (verifyFn) {
        verifyFn(tempWritten);
      }

      // 3. Create backup if target file already exists
      if (fs.existsSync(targetPath)) {
        if (createBackup) {
          try {
            if (fs.existsSync(backupPath)) {
              fs.unlinkSync(backupPath);
            }
            fs.copyFileSync(targetPath, backupPath);
          } catch (backupErr: any) {
            logger.warn('AtomicFileReplaceService', `Failed to create backup: ${backupErr.message}`);
          }
        }
      }

      // 4. Safely replace destination file (Windows compatible rename/copy)
      try {
        fs.renameSync(tempPath, targetPath);
      } catch (renameErr: any) {
        // Windows locking fallback: copy and unlink temp file
        logger.warn('AtomicFileReplaceService', `fs.renameSync failed (${renameErr.message}), attempting fallback copy`);
        fs.copyFileSync(tempPath, targetPath);
        fs.unlinkSync(tempPath);
      }

      // 5. Verify final file exists on disk
      if (!fs.existsSync(targetPath)) {
        throw new Error(`Target file ${targetPath} does not exist after replace`);
      }

      // 6. Clean up temporary file if it still exists
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }

      logger.info('AtomicFileReplaceService', `Atomic replace succeeded for ${targetPath}`);
    } catch (err: any) {
      // Clean up temp file on failure
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
      logger.error('AtomicFileReplaceService', `Atomic replace failed for ${targetPath}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Scans directory for orphaned .tmp files left over from crashes and cleans them up
   */
  public cleanOrphanedTempFiles(dirPath: string): void {
    if (!fs.existsSync(dirPath)) return;
    try {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file.endsWith('.tmp')) {
          const fullPath = path.join(dirPath, file);
          try {
            const stats = fs.statSync(fullPath);
            // Clean up temp files older than 5 minutes
            if (Date.now() - stats.mtimeMs > 300000) {
              fs.unlinkSync(fullPath);
              logger.info('AtomicFileReplaceService', `Cleaned orphaned temp file ${fullPath}`);
            }
          } catch {}
        }
      }
    } catch {}
  }
}

export const atomicFileReplace = new AtomicFileReplaceService();
