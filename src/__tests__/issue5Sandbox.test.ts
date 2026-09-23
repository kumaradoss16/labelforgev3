import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('ISSUE 5 — Main window has sandbox: true configured', () => {
  it('verifies that sandbox: true is enabled in electron/main.ts webPreferences', () => {
    const mainPath = path.resolve('electron/main.ts');
    const content = fs.readFileSync(mainPath, 'utf-8');
    
    // Check that we set sandbox: true in the webPreferences
    expect(content).toContain('sandbox: true');
    expect(content).not.toContain('sandbox: false');
  });
});
