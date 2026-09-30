/**
 * LabelForge Desktop - Input Validation Utilities
 * Validates all inputs crossing the IPC boundary
 */

import path from 'path';
import fs from 'fs';
import { ValidationError } from './errors';

export function validateFilePath(
  filePath: string,
  allowedExtensions: string[] = ['.lforge', '.json', '.txt'],
  allowedRoots?: string[]
): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new ValidationError('File path must be a non-empty string');
  }

  // Prevent null byte injections
  if (filePath.indexOf('\0') !== -1) {
    throw new ValidationError('File path contains invalid null byte characters');
  }

  // Use realpath to resolve symlinks and junctions before checking containment
  let realPath: string;
  try {
    realPath = fs.realpathSync(filePath);
  } catch (err) {
    // If the file/directory doesn't exist, fallback to path.resolve
    realPath = path.resolve(filePath);
  }

  if (allowedRoots && allowedRoots.length > 0) {
    const isInsideAllowedRoot = allowedRoots.some(root => {
      let resolvedRoot: string;
      try {
        resolvedRoot = fs.realpathSync(root);
      } catch (err) {
        resolvedRoot = path.resolve(root);
      }
      return realPath === resolvedRoot || realPath.startsWith(resolvedRoot + path.sep);
    });
    if (!isInsideAllowedRoot) {
      throw new ValidationError('File path is outside permitted directories');
    }
  }

  const ext = path.extname(realPath).toLowerCase();

  if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
    throw new ValidationError(`Unsupported file extension '${ext}'. Allowed: ${allowedExtensions.join(', ')}`);
  }

  return realPath;
}

export function validatePrintRequest(request: any): void {
  if (!request || typeof request !== 'object') {
    throw new ValidationError('Invalid print request payload');
  }

  if (!request.printerName || typeof request.printerName !== 'string') {
    throw new ValidationError('Print request missing target printerName');
  }

  if (request.copies !== undefined && (typeof request.copies !== 'number' || request.copies < 1 || request.copies > 9999)) {
    throw new ValidationError('Invalid copy count (must be between 1 and 9999)');
  }
}
