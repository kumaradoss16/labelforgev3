/**
 * LabelForge Printer Management & Print Strategy Types
 */

export type PrinterLanguage = 'ZPL' | 'TSPL' | 'EPL' | 'CPCL' | 'Windows-GDI' | 'PDF';

export type PrinterConnection = 'TCP/IP' | 'USB' | 'Windows Spooler' | 'Virtual Agent';

export type PrinterStatus = 'Ready' | 'Printing' | 'Paused' | 'Offline' | 'Error';

export interface PrinterProfile {
  id: string;
  name: string;
  model: string;
  manufacturer: 'Zebra' | 'TSC' | 'Brother' | 'Honeywell' | 'SATO' | 'Generic Windows';
  dpi: 203 | 300 | 600;
  language: PrinterLanguage;
  connection: PrinterConnection;
  address: string; // e.g. "192.168.1.120:9100" or "USB001"
  status: PrinterStatus;
  supportsCutter: boolean;
  supportsPeeler: boolean;
  supportsRfid: boolean;
  darkness: number; // 0-30
  speed: number; // in inches/sec, e.g. 4, 6, 8, 10
  mediaType: 'gap' | 'continuous' | 'black-mark';
}

export type PrintJobState = 
  | 'DRAFT'
  | 'VALIDATING'
  | 'READY'
  | 'QUEUED'
  | 'RENDERING'
  | 'RENDERED'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface PrintJob {
  id: string;
  jobName: string;
  templateName: string;
  templateVersion: number;
  printerId: string;
  printerName: string;
  copies: number;
  recordCount: number;
  status: PrintJobState;
  createdAt: string;
  completedAt?: string;
  outputLanguage: PrinterLanguage;
  rawPayloadPreview?: string;
  error?: string;
}
