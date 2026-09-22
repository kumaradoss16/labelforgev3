/**
 * LabelForge / BarTender Printer Management, Template Registry & Audit Types
 */

export type PrinterLanguage = 'ZPL' | 'TSPL' | 'EPL' | 'CPCL' | 'Windows-GDI' | 'PDF';

export type PrinterConnection = 'TCP/IP' | 'USB' | 'Windows Spooler' | 'Virtual Agent';

export type PrinterStatus =
  | 'Ready'
  | 'Printing'
  | 'Paused'
  | 'Offline'
  | 'Error'
  | 'Status not available — verify printer directly';

export type PrintTechnology =
  | 'Thermal transfer'
  | 'Direct thermal'
  | 'Laser'
  | 'Inkjet'
  | 'RFID'
  | 'Card printer'
  | 'Other';

export type UserRole = 'SYSTEM_ADMIN' | 'PRINT_MANAGER' | 'OPERATOR' | 'VIEWER';

export interface PrinterProfile {
  id: string;
  name: string;
  displayName?: string;
  model: string;
  manufacturer: 'Zebra' | 'TSC' | 'Brother' | 'Honeywell' | 'SATO' | 'Generic Windows';
  location?: string;
  connectionType?: PrinterConnection;
  systemPrinterName?: string; // Windows UNC / Spooler Queue name
  dpi: 203 | 300 | 600;
  language: PrinterLanguage;
  connection: PrinterConnection;
  address: string; // e.g. "192.168.1.120:9100" or "\\\\PRINTSVR01\\Zebra-ZT410"
  status: PrinterStatus;
  isEnabled?: boolean;
  isDefault?: boolean;
  priority?: number;
  fallbackPrinterId?: string;
  supportedLabelSizes?: string[];
  supportedResolutions?: (203 | 300 | 600)[];
  supportedPrintTechnology?: PrintTechnology;
  supportsCutter: boolean;
  supportsPeeler: boolean;
  supportsRfid: boolean;
  darkness: number; // 0-30
  speed: number; // in inches/sec
  mediaType: 'gap' | 'continuous' | 'black-mark';
  lastSuccessfulPrintTime?: string;
  lastKnownError?: string;
  assignedTemplates?: string[]; // template IDs
  allowedRoles?: UserRole[];
  notes?: string;
}

export type PrintJobState =
  | 'DRAFT'
  | 'QUEUED'
  | 'VALIDATING'
  | 'READY'
  | 'RENDERING'
  | 'RENDERED'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'SENT_TO_PRINT_SERVICE'
  | 'PRINTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETRYING'
  | 'PARTIALLY_COMPLETED'
  | 'STATUS_UNKNOWN';

export type PrintJobType = 'ON_DEMAND' | 'BATCH' | 'TEST_PRINT' | 'REPRINT' | 'AUTOMATION';

export type ReprintReason =
  | 'Printer jam'
  | 'Label damaged'
  | 'Incorrect print quality'
  | 'Missing label'
  | 'Approved replacement'
  | 'Other';

export interface PrintJob {
  id: string;
  jobNumber?: string;
  jobType?: PrintJobType;
  jobName: string;
  requestedByUserId?: string;
  requestedByUserName?: string;
  userRole?: UserRole;
  templateId?: string;
  templateName: string;
  templateVersion: number;
  printerId: string;
  printerName: string;
  requestedPrinterId?: string;
  actualPrinterId?: string;
  actualPrinterName?: string;
  fallbackPrinterId?: string;
  fallbackPrinterUsed?: boolean;
  copies: number;
  recordCount: number;
  labelQuantity?: number;
  labelDataJson?: Record<string, any>;
  status: PrintJobState;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  outputLanguage: PrinterLanguage;
  rawPayloadPreview?: string;
  integrationMethod?: string;
  integrationResponseSummary?: string;
  errorCode?: string;
  error?: string;
  retryCount?: number;
  originalPrintJobId?: string;
  reprintReason?: string;
  auditReference?: string;
  priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  queuePosition?: number;
  // Technical Metadata recorded at time of print
  dpi?: number;
  paperSize?: string;
  inkLevel?: number; // 0 - 100 percentage (ribbon or ink level)
  ribbonLevel?: number; // 0 - 100 percentage
  mediaRollRemaining?: number; // 0 - 100 percentage
  printheadHealth?: number; // 0 - 100 percentage
  printSpeed?: number; // inches/sec
  darkness?: number; // 0 - 30 burn setting
  printTechnology?: PrintTechnology;
  mediaType?: 'gap' | 'continuous' | 'black-mark';
}

export type AuditAction =
  | 'TEMPLATE_CREATED'
  | 'TEMPLATE_UPDATED'
  | 'PRINTER_ADDED'
  | 'PRINTER_CHANGED'
  | 'PRINTER_ENABLED'
  | 'PRINTER_DISABLED'
  | 'PRINTER_DELETED'
  | 'PRINT_JOB_REQUESTED'
  | 'PRINT_JOB_CANCELLED'
  | 'PRINT_JOB_PRIORITY_CHANGED'
  | 'PRINT_JOB_REORDERED'
  | 'PRINT_JOB_RETRIED'
  | 'PRINT_JOB_REPRINTED'
  | 'DEFAULT_PRINTER_CHANGED'
  | 'PRINTER_FALLBACK_USED'
  | 'USER_PERMISSION_CHANGED'
  | 'PRINT_CONFIGURATION_CHANGED'
  | 'TEST_PRINT_DISPATCHED'
  | 'SUBMIT_JOB'
  | 'PRINT_JOB_COMPLETED'
  | 'PRINT_DISPATCHED';

export interface PrintAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  entityType?: 'Printer' | 'LabelTemplate' | 'PrintJob' | 'SystemSetting';
  entityId?: string;
  jobId?: string;
  printerId?: string;
  printerName?: string;
  templateName?: string;
  details?: string;
  beforeValueJson?: string;
  afterValueJson?: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILURE';
  errorMessage?: string;
  ipAddress?: string;
}

export type LabelTemplateCategory =
  | 'Product label'
  | 'Shipping label'
  | 'Inventory label'
  | 'Asset label'
  | 'QR label'
  | 'Barcode label'
  | 'Warehouse label'
  | 'Compliance label'
  | 'RFID tag'
  | 'Custom label';

export interface TemplateFieldSpec {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'barcode';
  required: boolean;
  defaultValue?: string;
  description?: string;
  validationRegex?: string;
  errorMessage?: string;
}

export interface BarTenderTemplateMetadata {
  id: string;
  name: string;
  displayName: string;
  category: LabelTemplateCategory;
  bartenderTemplateReference: string; // e.g. "C:\BarTender\Templates\Logistics\GS1_Shipping_Pallet_v3.btw"
  templatePathReference: string;
  previewImageReference?: string;
  labelWidth: number;
  labelHeight: number;
  unit: 'mm' | 'in';
  barcodeType: string;
  supportsQr: boolean;
  supportsRfid: boolean;
  requiredFields: TemplateFieldSpec[];
  optionalFields: TemplateFieldSpec[];
  defaultPrinterId: string;
  fallbackPrinterId?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

