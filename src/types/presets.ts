import { BarcodeSymbology, BarcodeStyle } from './label';

export type PresetCategory = 'All' | 'Logistics' | 'Retail' | 'Healthcare' | 'Industrial 2D' | 'Custom';

export interface BarcodePreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  isBuiltIn: boolean;
  symbology: BarcodeSymbology;
  width: number; // in mm
  height: number; // in mm
  color: string;
  backgroundColor: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  humanReadable: boolean;
  humanReadableFont?: string;
  humanReadableSize?: number;
  humanReadablePosition?: 'bottom' | 'top' | 'none';
  quietZone?: boolean;
  quietZoneSize?: number;
  moduleWidth?: number;
  sampleValue?: string;
  createdAt: number;
}
