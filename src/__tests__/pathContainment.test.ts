import { describe, it, expect } from 'vitest';
import path from 'path';
import { validateFilePath } from '../../electron/utils/validation';

describe('ISSUE 2 — No path containment on file IPC', () => {
  const allowedRoots = [
    path.resolve('/app/userData'),
    path.resolve('/app/documents')
  ];

  it('allows a valid file within the allowed roots', () => {
    const validPath = path.resolve('/app/documents/project.lforge');
    const result = validateFilePath(validPath, ['.lforge', '.json'], allowedRoots);
    expect(result).toBe(validPath);
  });

  it('rejects an unsupported extension inside the allowed roots', () => {
    const invalidExtPath = path.resolve('/app/documents/malicious.sh');
    expect(() => {
      validateFilePath(invalidExtPath, ['.lforge', '.json'], allowedRoots);
    }).toThrow(/Unsupported file extension/);
  });

  it('rejects a path outside of the allowed roots', () => {
    const forbiddenPath = path.resolve('/etc/passwd');
    expect(() => {
      validateFilePath(forbiddenPath, ['.lforge', '.json'], allowedRoots);
    }).toThrow(/File path is outside permitted directories/);
  });

  it('rejects path traversal attempts such as relative parent paths that resolve outside roots', () => {
    const traversalPath = path.resolve('/app/documents/../../etc/passwd.json');
    expect(() => {
      validateFilePath(traversalPath, ['.json'], allowedRoots);
    }).toThrow(/File path is outside permitted directories/);
  });

  it('prevents null byte injection attempts', () => {
    const nullBytePath = '/app/documents/safe.json\0malicious.sh';
    expect(() => {
      validateFilePath(nullBytePath, ['.json'], allowedRoots);
    }).toThrow(/null byte/);
  });

  it('skips containment check when allowedRoots is not supplied or empty (e.g. for user dialogue files)', () => {
    const outsidePath = path.resolve('/some/custom/usb/drive/project.lforge');
    const result = validateFilePath(outsidePath, ['.lforge']);
    expect(result).toBe(outsidePath);
  });
});
