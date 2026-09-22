/**
 * LabelForge CPCL (Comtec Printer Control Language) Code Generator
 * Compiles canonical LabelDocument into CPCL commands for mobile thermal printers (Zebra QLn, ZQ, RW series)
 */

import { LabelDocument } from '../types/label';
import { mmToDots } from './zplGenerator';

export function generateCpclFromDocument(
  doc: LabelDocument,
  options?: {
    copies?: number;
    darkness?: number;
    speed?: number;
  }
): string {
  const dpi = doc.dimensions.dpi || 203;
  const labelWidthDots = mmToDots(doc.dimensions.width, dpi);
  const labelLengthDots = mmToDots(doc.dimensions.height, dpi);
  const copies = options?.copies || 1;

  const lines: string[] = [
    `! 0 ${dpi} ${dpi} ${labelLengthDots} ${copies}`,
    `PAGE-WIDTH ${labelWidthDots}`,
  ];

  const sortedObjects = [...doc.objects].sort((a, b) => a.zIndex - b.zIndex);

  for (const obj of sortedObjects) {
    if (!obj.visible) continue;

    const x = mmToDots(obj.x, dpi);
    const y = mmToDots(obj.y, dpi);
    const w = mmToDots(obj.width, dpi);
    const h = mmToDots(obj.height, dpi);

    if (obj.type === 'text' || obj.type === 'rich-text') {
      const textObj = obj as any;
      const text = textObj.text || '';
      // TEXT {font} {size} {x} {y} {data}
      lines.push(`TEXT 7 0 ${x} ${y} ${text}`);
    } else if (obj.type === 'barcode') {
      const bObj = obj as any;
      const val = bObj.value || '123456';
      // BARCODE {type} {width} {ratio} {height} {x} {y} {data}
      lines.push(`BARCODE 128 1 1 ${Math.max(20, h)} ${x} ${y} ${val}`);
    } else if (obj.type === 'qrcode') {
      const bObj = obj as any;
      const val = bObj.value || '';
      lines.push(`B QR ${x} ${y} M 2 U 4`);
      lines.push(`MA,${val}`);
      lines.push('ENDQR');
    } else if (obj.type === 'rect' || obj.type === 'line' || obj.type === 'ellipse') {
      const sObj = obj as any;
      if (obj.type === 'line') {
        lines.push(`LINE ${x} ${y} ${x + w} ${y} ${Math.max(1, Math.round((sObj.shapeStyle?.strokeWidth || 1) * 2))}`);
      } else {
        lines.push(`BOX ${x} ${y} ${x + w} ${y + h} ${Math.max(1, Math.round((sObj.shapeStyle?.strokeWidth || 1) * 2))}`);
      }
    }
  }

  lines.push('FORM');
  lines.push('PRINT');
  return lines.join('\n');
}
