/**
 * Cross-platform Path Normalization Utilities for LabelForge
 * Standardizes file system and template paths across Windows (C:\...), Linux (/...), and macOS
 */

/**
 * Normalizes backslashes to forward slashes and eliminates duplicate slashes
 */
export function normalizePath(pathStr: string): string {
  if (!pathStr) return '';
  // Convert Windows backslashes to forward slashes
  let normalized = pathStr.replace(/\\/g, '/');
  // Collapse multiple slashes (except leading protocol http:// or file://)
  normalized = normalized.replace(/([^:]\/)\/+/g, '$1');
  return normalized;
}

/**
 * Strips Windows drive letters (e.g. C:) and converts to relative path
 */
export function toPlatformAgnosticPath(pathStr: string): string {
  const norm = normalizePath(pathStr);
  return norm.replace(/^[a-zA-Z]:/, '');
}

/**
 * Extracts filename from path cleanly across platforms
 */
export function getFileNameFromPath(pathStr: string): string {
  const norm = normalizePath(pathStr);
  const parts = norm.split('/');
  return parts[parts.length - 1] || '';
}
