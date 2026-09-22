/**
 * LabelForge EPL-2 (Eltron Programming Language) Code Generator
 * Compiles canonical LabelDocument into authentic EPL commands for Eltron/Zebra legacy thermal printers
 */

import { LabelDocument } from '../types/label';
import { mmToDots } from './zplGenerator';

export function generateEplFromDocument(
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
  const darkness = Math.min(15, Math.max(0, options?.darkness !== undefined ? Math.round(options.darkness / 2) : 10));
  const speed = Math.min(6, Math.max(1, options?.speed || 3));

  const lines: string[] = [
    'N', // Clear image buffer
    `q${labelWidthDots}`, // Set label width
    `Q${labelLengthDots},24`, // Set label length and gap
    `S${speed}`, // Print speed
    `D${darkness}`, // Print darkness
    `ZT`, // Print from top
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
      const text = (textObj.text || '').replace(/"/g, "'");
      // EPL text format: A p1,p2,p3,p4,p5,p6,n,"DATA"
      lines.push(`A${x},${y},0,4,1,1,N,"${text}"`);
    } else if (obj.type === 'barcode') {
      const bObj = obj as any;
      const val = bObj.value || '123456';
      // EPL barcode format: B p1,p2,p3,p4,p5,p6,p7,b,"DATA"
      // 1 = Code 128 (auto)
      lines.push(`B${x},${y},0,1,2,4,${Math.max(20, h)},B,"${val}"`);
    } else if (obj.type === 'qrcode') {
      const bObj = obj as any;
      const val = bObj.value || '';
      lines.push(`b${x},${y},Q,s4,eM,"${val}"`);
    } else if (obj.type === 'rect' || obj.type === 'line' || obj.type === 'ellipse') {
      const sObj = obj as any;
      if (obj.type === 'line') {
        lines.push(`LO${x},${y},${w},${Math.max(2, h)}`);
      } else {
        // EPL Box: X p1,p2,p3,p4,p5
        lines.push(`X${x},${y},${Math.max(2, Math.round((sObj.shapeStyle?.strokeWidth || 1) * 2))},${x + w},${y + h}`);
      }
    }
  }

  // Print command: P copies, sets
  lines.push(`P${copies},1`);
  return lines.join('\n');
}
