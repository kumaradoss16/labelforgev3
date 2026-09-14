/**
 * LabelForge Barcode Catalog & GS1 Specification Types
 */

import { BarcodeSymbology } from './label';

export type BarcodeCategory = 
  | 'Linear 1D'
  | '2D Matrix'
  | 'GS1 Standards'
  | 'Postal & Shipping'
  | 'Retail & Identification'
  | 'Specialized';

export type BarcodeCapabilityStatus = 
  | 'SUPPORTED'
  | 'PARTIAL'
  | 'RENDER_ONLY'
  | 'PRINTER_CODE_ONLY'
  | 'PLUGIN_REQUIRED';

export interface BarcodeSymbologyInfo {
  id: BarcodeSymbology;
  displayName: string;
  category: BarcodeCategory;
  standard: string; // e.g. "ISO/IEC 15417", "ISO/IEC 18004"
  description: string;
  defaultData: string;
  status: BarcodeCapabilityStatus;
  supports2D: boolean;
  supportsGS1: boolean;
  checksumType: string;
  characterSet: string;
  minModuleWidthMm: number;
  nativeZPLCommand?: string;
  nativeTSPLCommand?: string;
  nativeEPLCommand?: string;
}

export interface GS1ApplicationIdentifier {
  ai: string;
  title: string;
  format: string; // e.g. "N2+N14"
  dataDescription: string;
  example: string;
  fixedLength: boolean;
  maxLength: number;
}

export const COMMON_GS1_AIS: GS1ApplicationIdentifier[] = [
  { ai: '01', title: 'GTIN (Global Trade Item Number)', format: 'N14', dataDescription: '14-digit Global Trade Item Number', example: '00614141999996', fixedLength: true, maxLength: 14 },
  { ai: '02', title: 'Content of Trade Items (GTIN)', format: 'N14', dataDescription: '14-digit GTIN of items in container', example: '10614141999993', fixedLength: true, maxLength: 14 },
  { ai: '00', title: 'SSCC (Serial Shipping Container Code)', format: 'N18', dataDescription: '18-digit SSCC for pallet & carton tracking', example: '306141411234567890', fixedLength: true, maxLength: 18 },
  { ai: '10', title: 'Batch / Lot Number', format: 'X..20', dataDescription: 'Alphanumeric batch/lot identifier', example: 'LOT-2026-X99', fixedLength: false, maxLength: 20 },
  { ai: '11', title: 'Production Date (YYMMDD)', format: 'N6', dataDescription: 'Manufacturing date format YYMMDD', example: '260914', fixedLength: true, maxLength: 6 },
  { ai: '15', title: 'Best Before Date (YYMMDD)', format: 'N6', dataDescription: 'Quality date format YYMMDD', example: '271231', fixedLength: true, maxLength: 6 },
  { ai: '17', title: 'Expiration Date (YYMMDD)', format: 'N6', dataDescription: 'Strict expiration format YYMMDD', example: '280630', fixedLength: true, maxLength: 6 },
  { ai: '21', title: 'Serial Number', format: 'X..20', dataDescription: 'Unique item sequential or random serial', example: 'SN-90823412', fixedLength: false, maxLength: 20 },
  { ai: '30', title: 'Variable Count (Quantity)', format: 'N..8', dataDescription: 'Units contained in item/case', example: '500', fixedLength: false, maxLength: 8 },
  { ai: '3103', title: 'Net Weight (kg, 3 decimals)', format: 'N6', dataDescription: 'Weight in kilograms with 3 decimal places', example: '001250', fixedLength: true, maxLength: 6 },
  { ai: '400', title: 'Customer Purchase Order', format: 'X..30', dataDescription: 'Customer order reference number', example: 'PO-9912-US', fixedLength: false, maxLength: 30 },
  { ai: '414', title: 'GLN (Global Location Number)', format: 'N13', dataDescription: 'Physical warehouse or site GLN', example: '5412345000013', fixedLength: true, maxLength: 13 },
];
