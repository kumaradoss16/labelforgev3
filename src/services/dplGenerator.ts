/**
 * LabelForge DPL (Datamax Programming Language) Code Generator
 * Compiles canonical LabelDocument into standard DPL commands for Datamax-O'Neil / Honeywell I-Class, M-Class printers
 */

import { LabelDocument } from '../types/label';
import { mmToDots } from './zplGenerator';

export function generateDplFromDocument(
  doc: LabelDocument,
  options?: {
    copies?: number;
    darkness?: number;
  }
): string {
  const dpi = doc.dimensions.dpi || 203;
  const copies = options?.copies || 1;
  const SOH = '\x01';
  const STX = '\x02';
  const CR = '\r';

  const lines: string[] = [
    `${SOH}D`, // Set Dot format
    `${STX}L`, // Enter label formatting mode
    'D11', // Pixel size
  ];

  const sortedObjects = [...doc.objects].sort((a, b) => a.zIndex - b.zIndex);

  for (const obj of sortedObjects) {
    if (!obj.visible) continue;

    const x = mmToDots(obj.x, dpi);
    const y = mmToDots(obj.y, dpi);

    if (obj.type === 'text' || obj.type === 'rich-text') {
      const textObj = obj as any;
      const text = textObj.text || '';
      // 1: rotation, 2: font id, 3: multiplier, 4: row, 5: col, text
      lines.push(`1211000${String(y).padStart(4, '0')}${String(x).padStart(4, '0')}${text}`);
    } else if (obj.type === 'barcode') {
      const bObj = obj as any;
      const val = bObj.value || '123456';
      const h = mmToDots(obj.height, dpi);
      // 1 = rotation, E = Code 128
      lines.push(`1E00${String(Math.max(20, h)).padStart(3, '0')}${String(y).padStart(4, '0')}${String(x).padStart(4, '0')}${val}`);
    }
  }

  // Print quantity command: Q<copies>
  lines.push(`Q${String(copies).padStart(4, '0')}`);
  lines.push('E'); // Terminate and print

  return lines.join(CR + '\n');
}
