/**
 * LabelForge Platform - Enterprise Label & Barcode Types
 */

export type UnitType = 'mm' | 'in' | 'pt' | 'dots' | 'cm';

export interface GuideLine {
  id: string;
  type: 'h' | 'v';
  position: number; // in mm
}

export interface LabelDimensions {
  width: number;       // In specified unit (default mm)
  height: number;      // In specified unit (default mm)
  unit: UnitType;
  dpi: 203 | 300 | 600;
  orientation: 'portrait' | 'landscape';
  marginLeft: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  cornerRadius?: number; // For rounded label die-cuts
}

export type ObjectType = 
  | 'text'
  | 'rich-text'
  | 'barcode'
  | 'qrcode'
  | 'datamatrix'
  | 'image'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'table'
  | 'counter'
  | 'datetime'
  | 'rfid-overlay';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type TextDirection = 'ltr' | 'rtl' | 'auto';

export interface TextStyle {
  fontFamily: string;
  fontSize: number; // in pt
  fontWeight?: 'normal' | 'bold' | '500' | '600' | '700' | string;
  fontStyle?: 'normal' | 'italic';
  underline?: boolean;
  strikeout?: boolean;
  color?: string;
  backgroundColor?: string;
  alignment?: TextAlignment;
  direction?: TextDirection;
  lineHeight?: number;
  letterSpacing?: number; // in mm/pt
  wrap?: boolean;
}

export type BarcodeSymbology =
  | 'code128'
  | 'code39'
  | 'code93'
  | 'ean13'
  | 'ean8'
  | 'upca'
  | 'upce'
  | 'itf14'
  | 'i2of5'
  | 'codabar'
  | 'msi'
  | 'qr'
  | 'datamatrix'
  | 'pdf417'
  | 'aztec'
  | 'gs1-128'
  | 'gs1-datamatrix'
  | 'gs1-qr'
  | 'usps-imb'
  | 'royalmail-4state';

export interface BarcodeStyle {
  symbology: BarcodeSymbology;
  humanReadable: boolean;
  humanReadableFont: string;
  humanReadableSize: number;
  humanReadablePosition: 'bottom' | 'top' | 'none';
  moduleWidth: number; // in mm or printer dots
  quietZone: boolean;
  quietZoneSize: number; // mm
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // for QR/DataMatrix
  ratio?: number; // For 1D wide/narrow ratio (e.g. 2.5:1 or 3:1)
  bearerBars?: boolean; // For ITF-14
  color: string;
  backgroundColor: string;
}

export interface ShapeStyle {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number; // in mm
  strokeDash?: 'solid' | 'dashed' | 'dotted';
  borderRadius?: number; // for rect
}

export interface DataBinding {
  sourceType: 'embedded' | 'database' | 'serial' | 'datetime' | 'expression';
  fieldName?: string;
  expression?: string; // e.g. "{{Lot_Number}} - {{Expiry}}"
  format?: string;
  defaultValue?: string;
}

export interface BaseLabelObject {
  id: string;
  name: string;
  type: ObjectType;
  x: number; // in mm
  y: number; // in mm
  width: number; // in mm
  height: number; // in mm
  rotation: number; // degrees 0, 90, 180, 270
  locked: boolean;
  visible: boolean;
  opacity: number; // 0 to 1
  zIndex: number;
  dataBinding?: DataBinding;
  rawText?: string;
}

export interface TextLabelObject extends BaseLabelObject {
  type: 'text' | 'rich-text';
  text: string;
  style: TextStyle;
}

export interface BarcodeLabelObject extends BaseLabelObject {
  type: 'barcode' | 'qrcode' | 'datamatrix';
  value: string;
  barcodeStyle: BarcodeStyle;
}

export interface ShapeLabelObject extends BaseLabelObject {
  type: 'rect' | 'ellipse' | 'line';
  shapeStyle: ShapeStyle;
}

export interface ImageLabelObject extends BaseLabelObject {
  type: 'image';
  src: string;
  aspectRatioLocked: boolean;
}

export type LabelObject =
  | TextLabelObject
  | BarcodeLabelObject
  | ShapeLabelObject
  | ImageLabelObject;

export interface LabelDocument {
  id: string;
  schemaVersion: string;
  name: string;
  description?: string;
  author: string;
  created: string;
  modified: string;
  dimensions: LabelDimensions;
  objects: LabelObject[];
  metadata: {
    targetPrinter?: string;
    site?: string;
    version: number;
    status: 'draft' | 'review' | 'approved' | 'published';
  };
}

export interface PreflightDiagnostic {
  id: string;
  objectId?: string;
  severity: 'info' | 'warning' | 'error' | 'blocker';
  category: 'barcode' | 'geometry' | 'font' | 'printer' | 'databinding';
  message: string;
  suggestion?: string;
}
