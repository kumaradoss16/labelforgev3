/**
 * LabelForge Desktop - Input Validation Utilities
 * Validates all inputs crossing the IPC boundary
 */

import path from 'path';
import { ValidationError } from './errors';

export function validateFilePath(filePath: string, allowedExtensions: string[] = ['.lforge', '.json', '.txt']): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new ValidationError('File path must be a non-empty string');
  }

  // Prevent null byte injections
  if (filePath.indexOf('\0') !== -1) {
    throw new ValidationError('File path contains invalid null byte characters');
  }

  const normalized = path.normalize(filePath);
  const ext = path.extname(normalized).toLowerCase();

  if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
    throw new ValidationError(`Unsupported file extension '${ext}'. Allowed: ${allowedExtensions.join(', ')}`);
  }

  return normalized;
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
