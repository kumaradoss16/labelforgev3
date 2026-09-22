import { LabelDocument, LabelDimensions, BarcodeSymbology } from './label';
import { PrinterProfile } from './printer';

export type TemplateType = 'builtin' | 'custom' | 'imported';

export type TemplateStatus = 'active' | 'archived' | 'draft';

export type TemplateCategory =
  | 'all'
  | 'product'
  | 'retail'
  | 'inventory'
  | 'shipping'
  | 'identification'
  | 'packaging'
  | 'barcode'
  | 'qr'
  | 'industrial'
  | 'compliance'
  | 'healthcare'
  | 'warning'
  | 'manufacturing'
  | 'warehouse'
  | 'asset'
  | 'custom';

export interface TemplateCategoryDef {
  id: TemplateCategory;
  name: string;
  description: string;
  iconName: string;
  count?: number;
}

export interface TemplateVariableDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'time' | 'datetime' | 'barcode' | 'qr' | 'boolean' | 'select';
  defaultValue?: string | number | boolean;
  sampleValue?: string | number | boolean;
  options?: string[];
  required?: boolean;
  description?: string;
  validationRegex?: string;
}

export interface TemplateVersionRecord {
  version: number;
  updatedAt: string;
  updatedBy: string;
  changeSummary: string;
  snapshotDoc: LabelDocument;
  elementCount?: number;
  width?: number;
  height?: number;
  unit?: string;
  orientation?: 'portrait' | 'landscape';
  isRestorationPoint?: boolean;
  restoredFromVersion?: number;
  isMilestone?: boolean;
}

export interface TemplatePrintConfig {
  recommendedPrinterId?: string;
  recommendedPrinterType?: 'Zebra ZPL' | 'TSC TSPL' | 'EPL' | 'DPL' | 'Standard Windows' | 'Thermal Transfer' | 'Direct Thermal';
  dpi?: number;
  darkness?: number;
  speed?: number;
  mediaType?: 'gap' | 'continuous' | 'black-mark';
  orientation?: 'portrait' | 'landscape';
}

export interface TemplateRecord {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  customCategoryName?: string;
  type?: TemplateType;
  status?: TemplateStatus;
  
  // Document geometry and definition
  document: LabelDocument;
  width?: number;
  height?: number;
  unit?: 'mm' | 'in' | 'cm' | 'pt';
  orientation?: 'portrait' | 'landscape';

  // Metadata & Taxonomy
  tags: string[];
  favorite?: boolean;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
  created?: string;
  modified?: string;
  createdBy?: string;
  author?: string;
  version: number;
  isReadOnly?: boolean; // Built-in templates are locked/read-only
  isBuiltin?: boolean;
  isLocked?: boolean; // User locked
  industry?: string;

  // Barcode & 2D Features
  primarySymbology?: string;
  supportsQr?: boolean;
  elementCount?: number;

  // Variables & Sample Data
  variables?: TemplateVariableDef[];
  sampleData?: Record<string, any>;

  // Print Profile Configuration
  printConfig?: TemplatePrintConfig;

  // Version History
  versionHistory?: TemplateVersionRecord[];

  // Usage Analytics (Desktop Local)
  usageCount: number;
  lastUsedAt?: string;
}

export interface TemplateFilterState {
  searchQuery: string;
  category: TemplateCategory | 'all';
  type: 'all' | 'builtin' | 'custom' | 'imported' | 'favorites' | 'recent';
  orientation: 'all' | 'portrait' | 'landscape';
  unit: 'all' | 'mm' | 'in';
  barcodeSymbology: string; // 'all' or specific
  sortBy: 'modified_desc' | 'modified_asc' | 'name_asc' | 'name_desc' | 'used_desc' | 'version_desc' | 'elements_desc';
  tag?: string;
}

export interface LabelSizePreset {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  unit: 'mm' | 'in';
  description: string;
  commonUse: string;
}
