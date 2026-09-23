/**
 * LabelForge Universal Printer Code Dispatcher
 * Multi-Protocol compiler supporting ZPL, TSPL, EPL, CPCL, SBPL, and DPL
 * Exhaustive language dispatcher - Never silently falls back to default language
 */

import { LabelDocument } from '../types/label';
import { generateZplFromDocument } from './zplGenerator';
import { generateTsplFromDocument } from './tsplGenerator';
import { generateEplFromDocument } from './eplGenerator';
import { generateCpclFromDocument } from './cpclGenerator';
import { generateSbplFromDocument } from './sbplGenerator';
import { generateDplFromDocument } from './dplGenerator';

export type PrinterLanguageCode = 'ZPL' | 'TSPL' | 'EPL' | 'CPCL' | 'SBPL' | 'DPL';

export interface PrintCodeOptions {
  copies?: number;
  darkness?: number;
  speed?: number;
  mediaType?: 'gap' | 'continuous' | 'black-mark';
}

export class UnsupportedPrinterLanguageError extends Error {
  constructor(language: string) {
    super(`Unsupported printer language: "${language}". No valid printer generator is registered for this language.`);
    this.name = 'UnsupportedPrinterLanguageError';
  }
}

const printerGenerators: Record<string, (doc: LabelDocument, options?: PrintCodeOptions) => string> = {
  ZPL: generateZplFromDocument,
  TSPL: generateTsplFromDocument,
  EPL: generateEplFromDocument,
  CPCL: generateCpclFromDocument,
  SBPL: generateSbplFromDocument,
  DPL: generateDplFromDocument
};

/**
 * Compiles a LabelDocument into native printer raw payload based on target language
 */
export function generatePrinterCode(
  language: string,
  doc: LabelDocument,
  options?: PrintCodeOptions
): string {
  const upperLang = (language || '').toUpperCase();
  const generator = printerGenerators[upperLang];

  if (!generator) {
    throw new UnsupportedPrinterLanguageError(language);
  }

  return generator(doc, options);
}
