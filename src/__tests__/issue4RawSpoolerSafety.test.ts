import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import child_process from 'child_process';
import { windowsRawSpooler } from '../../electron/services/printer/windowsRawSpooler';

vi.mock('child_process', () => ({
  execFile: vi.fn()
}));

describe('ISSUE 4 — PowerShell Injection and Raw Spooler Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('correctly handles basic validation for invalid printer names', async () => {
    const res = await windowsRawSpooler.printRaw('', 'ZPL_PAYLOAD');
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('ERR_INVALID_PRINTER');
  });

  it('correctly handles empty payload validation', async () => {
    const res = await windowsRawSpooler.printRaw('ZT411', '');
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe('ERR_EMPTY_PAYLOAD');
  });

  it('bypasses windows-specific powershell execution on non-windows platform', async () => {
    // Force platform to non-win32 (e.g. linux or darwin)
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux' });

    const res = await windowsRawSpooler.printRaw('Zebra ZT411', '^XA^FO50,50^A0N,50,50^FDLabelForge^FS^XZ');
    expect(res.success).toBe(true);
    expect(res.bytesWritten).toBeGreaterThan(0);

    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });
});
