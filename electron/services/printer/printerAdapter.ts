/**
 * LabelForge Desktop - Printer Adapter Interfaces
 * Unified contract for Windows Spooler, Network Raw Sockets, and Direct Thermal Printers
 */

export interface PrinterDefinition {
  id: string;
  name: string;
  displayName: string;
  type: 'windows' | 'network' | 'zpl' | 'tspl' | 'bartender';
  isDefault: boolean;
  status: number;
  description?: string;
  host?: string;
  port?: number;
  dpi?: number;
  protocolsSupported: Array<'zpl' | 'tspl' | 'epl' | 'pdf' | 'raster'>;
}

export interface PrintJobRequest {
  printerName: string;
  printerType: 'windows' | 'network' | 'zpl' | 'tspl' | 'bartender';
  copies?: number;
  rawPayload?: string;
  networkHost?: string;
  networkPort?: number;
  bartenderTemplate?: string;
  bartenderPayload?: Record<string, any>;
  previewDataUrl?: string;
  jobName?: string;
}

export interface PrintJobResponse {
  success: boolean;
  jobId?: string;
  bytesWritten?: number;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PrinterAdapter {
  discover(): Promise<PrinterDefinition[]>;
  print(request: PrintJobRequest): Promise<PrintJobResponse>;
  testPrint(printerName: string, protocol?: string): Promise<PrintJobResponse>;
}
