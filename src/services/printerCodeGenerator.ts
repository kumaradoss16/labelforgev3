/**
 * LabelForge Universal Printer Code Dispatcher
 * Multi-Protocol compiler supporting ZPL, TSPL, EPL, CPCL, SBPL, and DPL
 */

import { LabelDocument } from '../types/label';
import { PrinterLanguage } from '../types/printer';
import { generateZplFromDocument } from './zplGenerator';
import { generateTsplFromDocument } from './tsplGenerator';
import { generateEplFromDocument } from './eplGenerator';
import { generateCpclFromDocument } from './cpclGenerator';
import { generateSbplFromDocument } from './sbplGenerator';
import { generateDplFromDocument } from './dplGenerator';

export type ExtendedPrinterLanguage = PrinterLanguage | 'SBPL' | 'DPL';

export interface PrintCodeOptions {
  copies?: number;
  darkness?: number;
  speed?: number;
  mediaType?: 'gap' | 'continuous' | 'black-mark';
}

export function generatePrinterCode(
  language: ExtendedPrinterLanguage,
  doc: LabelDocument,
  options?: PrintCodeOptions
): string {
  switch (language) {
    case 'ZPL':
      return generateZplFromDocument(doc, options);
    case 'TSPL':
      return generateTsplFromDocument(doc, options);
    case 'EPL':
      return generateEplFromDocument(doc, options);
    case 'CPCL':
      return generateCpclFromDocument(doc, options);
    case 'SBPL':
      return generateSbplFromDocument(doc, options);
    case 'DPL':
      return generateDplFromDocument(doc, options);
    case 'Windows-GDI':
    case 'PDF':
    default:
      // Default to ZPL standard intermediate representation
      return generateZplFromDocument(doc, options);
  }
}
