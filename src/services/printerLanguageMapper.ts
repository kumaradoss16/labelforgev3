/**
 * LabelForge Universal Printer Language Mapping Chain
 * Single source of truth for mapping PrinterProfile -> PrinterLanguage -> IPC Transport
 */

import { PrinterProfile } from '../types/printer';

export type IPCTransportPrinterType =
  | 'windows'
  | 'network'
  | 'zpl'
  | 'tspl'
  | 'epl'
  | 'cpcl'
  | 'sbpl'
  | 'dpl'
  | 'bartender';

export function resolveIPCPrinterType(profile?: Partial<PrinterProfile> | string): IPCTransportPrinterType {
  if (!profile) return 'windows';

  const profObj: Partial<PrinterProfile> = typeof profile === 'string'
    ? { language: profile as any }
    : profile;

  const connection = (profObj.connection || profObj.connectionType || '').toLowerCase();
  const lang = (profObj.language || '').toUpperCase();


  if (connection === 'tcp/ip' || connection === 'network') {
    return 'network';
  }

  switch (lang) {
    case 'TSPL':
      return 'tspl';
    case 'EPL':
      return 'epl';
    case 'CPCL':
      return 'cpcl';
    case 'ZPL':
      return 'zpl';
    case 'SBPL':
      return 'sbpl';
    case 'DPL':
      return 'dpl';
    case 'WINDOWS-GDI':
    case 'WINDOWS_GDI':
    case 'PDF':
      return 'windows';
    default: {
      // Check profile model / manufacturer
      const model = (profile.model || profile.name || '').toLowerCase();
      if (model.includes('tspl') || model.includes('tsc') || model.includes('citizen')) return 'tspl';
      if (model.includes('epl') || model.includes('2844')) return 'epl';
      if (model.includes('cpcl') || model.includes('qln') || model.includes('zq')) return 'cpcl';
      if (model.includes('sato') || model.includes('sbpl')) return 'sbpl';
      if (model.includes('datamax') || model.includes('dpl')) return 'dpl';
      return 'zpl';
    }
  }
}
