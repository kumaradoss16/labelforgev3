/**
 * LabelForge Desktop - Electron Build Runner
 * Compiles TypeScript main and preload processes into production CommonJS bundles
 */

import { build } from 'esbuild';
import path from 'path';
import fs from 'fs';

async function buildElectron() {
  const outDir = path.resolve(process.cwd(), 'dist-electron');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('📦 Compiling Electron Main Process...');
  await build({
    entryPoints: [path.resolve(process.cwd(), 'electron/main.ts')],
    outfile: path.join(outDir, 'main.cjs'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
    external: ['electron']
  });

  console.log('🔒 Compiling Electron Preload Bridge...');
  await build({
    entryPoints: [path.resolve(process.cwd(), 'electron/preload.ts')],
    outfile: path.join(outDir, 'preload.cjs'),
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    sourcemap: true,
    external: ['electron']
  });

  console.log('✅ Electron build completed successfully: dist-electron/');
}

buildElectron().catch((err) => {
  console.error('❌ Electron build failed:', err);
  process.exit(1);
});
