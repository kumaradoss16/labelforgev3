/**
 * BarTender Integration Service & Print Queue Orchestrator
 * Enterprise BarTender Integration Architecture adhering to Seagull Scientific specifications
 */

import {
  PrinterProfile,
  PrintJob,
  PrintAuditLog,
  UserRole,
  BarTenderTemplateMetadata,
  ReprintReason,
  PrintJobState,
} from '../types/printer';
import { LabelDocument } from '../types/label';
import { generateZplFromDocument } from './zplGenerator';
import { generateTsplFromDocument, generateEplFromDocument } from './tsplGenerator';

export type BarTenderIntegrationMode =
  | 'REST_API'
  | 'INTEGRATION_BUILDER'
  | 'PRINT_PORTAL'
  | 'DOTNET_SDK'
  | 'COMMAND_LINE'
  | 'DIRECT_DRIVER';

export interface BarTenderConfig {
  integrationMode: BarTenderIntegrationMode;
  serviceUrl: string;
  templateRoot: string;
  printServerHost: string;
  timeoutSeconds: number;
  environmentName: string;
  enableAutomaticFallback: boolean;
  edition: 'Enterprise' | 'Automation' | 'Professional' | 'Starter' | 'BarTender Cloud';
  version: string;
}

export const DEFAULT_BARTENDER_CONFIG: BarTenderConfig = {
  integrationMode: 'REST_API',
  serviceUrl: 'http://127.0.0.1:5159/api/actions',
  templateRoot: './templates',
  printServerHost: 'PRINTSVR01.corp.internal',
  timeoutSeconds: 15,
  environmentName: 'Production Warehouse DC-01',
  enableAutomaticFallback: true,
  edition: 'Enterprise',
  version: '2026 (12.4.0)',
};


/**
 * BarTender Edition Compatibility Decision Table
 */
export interface BarTenderEditionFeature {
  feature: string;
  starter: boolean | string;
  professional: boolean | string;
  automation: boolean | string;
  enterprise: boolean | string;
  cloud: boolean | string;
  notes: string;
}

export const BARTENDER_EDITION_COMPATIBILITY_MATRIX: BarTenderEditionFeature[] = [
  {
    feature: 'REST API Web Services',
    starter: false,
    professional: false,
    automation: true,
    enterprise: true,
    cloud: true,
    notes: 'Endpoints at /api/actions or /api/v1/print. Requires BarTender 2019 or later.',
  },
  {
    feature: 'Integration Builder (File, Webhook, TCP Socket)',
    starter: false,
    professional: false,
    automation: true,
    enterprise: true,
    cloud: 'Webhooks only',
    notes: 'Watches folders or socket listeners for XML/JSON/CSV payload handoffs.',
  },
  {
    feature: '.NET SDK / Print Engine API',
    starter: false,
    professional: false,
    automation: true,
    enterprise: true,
    cloud: false,
    notes: 'Direct in-process Seagull.BarTender.Print COM/assembly integration on Windows.',
  },
  {
    feature: 'BarTender Print Portal (Web Printing)',
    starter: false,
    professional: false,
    automation: false,
    enterprise: true,
    cloud: true,
    notes: 'Browser-based on-demand printing with client-side print client.',
  },
  {
    feature: 'Automated Printer Failover / Redirection',
    starter: false,
    professional: false,
    automation: 'Conditional action',
    enterprise: 'Native Spooler Failover',
    cloud: 'Rule-based',
    notes: 'Reroutes print jobs to secondary printer when primary printer reports error.',
  },
  {
    feature: 'Centralized System Audit Logging & Reprint Tracking',
    starter: false,
    professional: false,
    automation: 'Basic logging',
    enterprise: 'Full System Database',
    cloud: 'Full Cloud Audit',
    notes: 'BarTender System Database (SQL Server) logging of all print jobs and revisions.',
  },
  {
    feature: 'RFID Tag Encoding & Serialization',
    starter: false,
    professional: true,
    automation: true,
    enterprise: true,
    cloud: true,
    notes: 'UHF Gen2 EPC Class 1 / ISO 18000-6C encoding.',
  },
  {
    feature: 'Command-Line Automation (bartend.exe /P)',
    starter: false,
    professional: true,
    automation: true,
    enterprise: true,
    cloud: false,
    notes: 'Legacy Windows CLI batch invocation. Not recommended for high-volume web concurrency.',
  },
  {
    feature: 'Direct Thermal Driver Spooling (ZPL/TSPL/EPL)',
    starter: true,
    professional: true,
    automation: true,
    enterprise: true,
    cloud: 'Via Cloud Gateway',
    notes: 'Native direct printer language bypass through Windows standard spooler.',
  },
];

/**
 * Barcode Data Validation Rule
 */
export function validateBarcodeData(symbology: string, value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { valid: false, error: 'Barcode value cannot be empty' };
  }

  const clean = value.trim();
  const upper = symbology.toUpperCase();

  if (upper.includes('EAN-13') || upper.includes('EAN13')) {
    if (!/^\d{13}$/.test(clean)) {
      return { valid: false, error: 'EAN-13 requires exactly 13 numeric digits.' };
    }
  } else if (upper.includes('EAN-8') || upper.includes('EAN8')) {
    if (!/^\d{8}$/.test(clean)) {
      return { valid: false, error: 'EAN-8 requires exactly 8 numeric digits.' };
    }
  } else if (upper.includes('UPC-A') || upper.includes('UPCA')) {
    if (!/^\d{12}$/.test(clean)) {
      return { valid: false, error: 'UPC-A requires exactly 12 numeric digits.' };
    }
  } else if (upper.includes('UPC-E') || upper.includes('UPCE')) {
    if (!/^\d{6,8}$/.test(clean)) {
      return { valid: false, error: 'UPC-E requires 6 to 8 numeric digits.' };
    }
  } else if (upper.includes('SSCC') || upper.includes('SSCC-18')) {
    const digitsOnly = clean.replace(/[^0-9]/g, '');
    if (digitsOnly.length !== 18) {
      return { valid: false, error: `SSCC-18 requires exactly 18 numeric digits (provided ${digitsOnly.length}).` };
    }
  } else if (upper.includes('GTIN-14') || upper.includes('GTIN14')) {
    const digitsOnly = clean.replace(/[^0-9]/g, '');
    if (digitsOnly.length !== 14) {
      return { valid: false, error: `GTIN-14 requires exactly 14 numeric digits (provided ${digitsOnly.length}).` };
    }
  } else if (upper.includes('CODE 39') || upper.includes('CODE39')) {
    if (!/^[0-9A-Z\-\. \$\/\+\%]+$/i.test(clean)) {
      return { valid: false, error: 'Code 39 only permits uppercase letters, numbers, and standard symbols (-.$/+%).' };
    }
  } else if (upper.includes('GS1-128') || upper.includes('GS1-DATAMATRIX')) {
    if (!clean.includes('(') && !clean.startsWith('01') && !clean.startsWith('00')) {
      // warning only - standard AI format
    }
  }

  return { valid: true };
}

/**
 * Role Permission Check
 */
export function checkUserPermission(
  userRole: UserRole,
  action: 'PRINT' | 'REPRINT' | 'TEST_PRINT' | 'MANAGE_PRINTERS' | 'MANAGE_TEMPLATES' | 'VIEW_AUDIT',
  printer?: PrinterProfile
): { allowed: boolean; reason?: string } {
  // Role capabilities
  if (userRole === 'VIEWER') {
    return {
      allowed: action === 'VIEW_AUDIT',
      reason: 'Role "VIEWER" has read-only access. Printing and modifications are restricted.',
    };
  }

  if (action === 'MANAGE_PRINTERS' || action === 'MANAGE_TEMPLATES') {
    if (userRole !== 'SYSTEM_ADMIN') {
      return {
        allowed: false,
        reason: 'Administrative privileges (SYSTEM_ADMIN) are required to configure printers and templates.',
      };
    }
  }

  if (action === 'TEST_PRINT') {
    if (userRole !== 'SYSTEM_ADMIN' && userRole !== 'PRINT_MANAGER') {
      return {
        allowed: false,
        reason: 'Test print diagnostic commands require PRINT_MANAGER or SYSTEM_ADMIN role.',
      };
    }
  }

  // Check specific printer permissions if assigned
  if (printer && printer.allowedRoles && printer.allowedRoles.length > 0) {
    if (!printer.allowedRoles.includes(userRole)) {
      return {
        allowed: false,
        reason: `Your role (${userRole}) is not authorized to print to "${printer.displayName || printer.name}". Allowed: ${printer.allowedRoles.join(', ')}.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * BarTender Payload Generator (formats data for REST API / Integration Builder)
 */
export function formatBarTenderIntegrationPayload(
  template: BarTenderTemplateMetadata,
  printer: PrinterProfile,
  dataValues: Record<string, any>,
  copies: number,
  mode: BarTenderIntegrationMode
): { payload: string; contentType: string; fileNameRef: string } {
  const timeStr = new Date().toISOString();

  if (mode === 'REST_API') {
    const restPayload = {
      Header: {
        Version: '2.0',
        Client: 'LabelForge-Web-Studio',
        Timestamp: timeStr,
      },
      Actions: [
        {
          Type: 'PrintDocument',
          DocumentFile: template.bartenderTemplateReference,
          Printer: printer.systemPrinterName || printer.name,
          Copies: copies,
          NamedSubStrings: dataValues,
          VerifyPrintCompletion: true,
          JobName: `${template.name} - ${timeStr.split('T')[0]}`,
        },
      ],
    };

    return {
      payload: JSON.stringify(restPayload, null, 2),
      contentType: 'application/json',
      fileNameRef: 'bt-rest-request.json',
    };
  }

  if (mode === 'INTEGRATION_BUILDER') {
    // BarTender Integration Builder XML format
    const lines = Object.entries(dataValues)
      .map(([k, v]) => `    <Field Name="${k}">${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Field>`)
      .join('\n');

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<XMLScript Version="2.0">
  <Command Name="PrintJob">
    <Print>
      <Format>${template.bartenderTemplateReference}</Format>
      <Printer>${printer.systemPrinterName || printer.name}</Printer>
      <Copies>${copies}</Copies>
      <RecordSet>
        <Record>
${lines}
        </Record>
      </RecordSet>
    </Print>
  </Command>
</XMLScript>`;

    return {
      payload: xml,
      contentType: 'application/xml',
      fileNameRef: 'bt-integration-spool.xml',
    };
  }

  // Fallback: CSV formatted variable list
  const headers = Object.keys(dataValues).join(',');
  const row = Object.values(dataValues)
    .map(v => `"${String(v).replace(/"/g, '""')}"`)
    .join(',');

  return {
    payload: `${headers}\n${row}`,
    contentType: 'text/csv',
    fileNameRef: 'bt-data-drop.csv',
  };
}

/**
 * Generate Raw Native Code (ZPL, TSPL, EPL) for direct driver preview
 */
export function generateNativePrinterStream(
  doc: LabelDocument,
  printer: PrinterProfile,
  options: { copies: number; darkness: number; speed: number }
): string {
  if (printer.language === 'TSPL') {
    return generateTsplFromDocument(doc, options);
  }
  if (printer.language === 'EPL') {
    return generateEplFromDocument(doc, options);
  }
  return generateZplFromDocument(doc, options);
}

export interface BarTenderPingResult {
  success: boolean;
  status?: number;
  statusText?: string;
  roundtripMs: number;
  url: string;
  errorMessage?: string;
}

/**
 * Real diagnostic ping against configured BarTender REST service URL
 */
export async function pingBarTenderService(serviceUrl: string, timeoutMs = 5000): Promise<BarTenderPingResult> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(serviceUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain, */*'
      }
    }).finally(() => clearTimeout(timer));

    const roundtripMs = Date.now() - startTime;
    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      roundtripMs,
      url: serviceUrl,
      errorMessage: response.ok ? undefined : `HTTP ${response.status} ${response.statusText}`
    };
  } catch (err: any) {
    const roundtripMs = Date.now() - startTime;
    let errorMessage = err?.message || 'Connection refused or server unreachable';
    if (err?.name === 'AbortError') {
      errorMessage = `Request timed out after ${timeoutMs}ms`;
    }
    return {
      success: false,
      roundtripMs,
      url: serviceUrl,
      errorMessage
    };
  }
}
