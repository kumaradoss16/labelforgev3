/**
 * LabelForge SBPL (SATO Barcode Printer Language) Code Generator
 * Compiles canonical LabelDocument into standard SBPL commands for SATO CL4NX, CL6NX, CT4-LX printers
 */

import { LabelDocument } from '../types/label';
import { mmToDots } from './zplGenerator';

export function generateSbplFromDocument(
  doc: LabelDocument,
  options?: {
    copies?: number;
    darkness?: number;
  }
): string {
  const dpi = doc.dimensions.dpi || 203;
  const copies = options?.copies || 1;
  const ESC = '\x1B';

  const lines: string[] = [
    `${ESC}A`, // Start Job
    `${ESC}A1`, // Base Reference
  ];

  const sortedObjects = [...doc.objects].sort((a, b) => a.zIndex - b.zIndex);

  for (const obj of sortedObjects) {
    if (!obj.visible) continue;

    const x = mmToDots(obj.x, dpi);
    const y = mmToDots(obj.y, dpi);

    lines.push(`${ESC}H${String(x).padStart(4, '0')}${ESC}V${String(y).padStart(4, '0')}`);

    if (obj.type === 'text' || obj.type === 'rich-text') {
      const textObj = obj as any;
      const text = textObj.text || '';
      lines.push(`${ESC}L0202${ESC}M${text}`);
    } else if (obj.type === 'barcode') {
      const bObj = obj as any;
      const val = bObj.value || '123456';
      const h = mmToDots(obj.height, dpi);
      lines.push(`${ESC}BG02${String(Math.max(20, h)).padStart(3, '0')}${val}`);
    } else if (obj.type === 'qrcode') {
      const bObj = obj as any;
      const val = bObj.value || '';
      lines.push(`${ESC}2D30,M,04,0,0${ESC}DS${val}`);
    }
  }

  // Print quantity
  lines.push(`${ESC}Q${copies}`);
  lines.push(`${ESC}Z`); // End Job

  return lines.join('\n');
}
