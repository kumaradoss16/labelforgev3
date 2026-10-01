/**
 * LabelForge Desktop - Runtime Zod Schemas for IPC Boundary
 * Replaces loose `any` typing with strict runtime validation.
 */

import { z } from 'zod';

export const LoginCredentialsSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  password: z.string().max(256).optional(),
  domain: z.string().max(100).optional()
}).strict();

export const PrintCommandSchema = z.object({
  jobId: z.string().optional(),
  printerName: z.string().min(1, 'Printer name is required').max(256),
  printerType: z.enum([
    'windows',
    'network',
    'zpl',
    'tspl',
    'epl',
    'cpcl',
    'sbpl',
    'dpl',
    'bartender'
  ]).default('windows'),
  copies: z.number().int().min(1).max(9999).default(1),
  rawPayload: z.string().min(1, 'Raw printer payload is required'),
  payloadId: z.string().optional(),
  payloadHash: z.string().optional(),
  networkHost: z.string().max(256).optional(),
  networkPort: z.number().int().min(1).max(65535).optional(),
  jobName: z.string().max(256).default('LabelForge Print Job')
  // NOTICE: Identity, userId, userName, role, previewDataUrl are deliberately rejected!
}).strict();

export const TestPrintCommandSchema = z.object({
  printerName: z.string().min(1, 'Printer name is required').max(256),
  protocol: z.enum(['zpl', 'tspl', 'epl', 'cpcl', 'sbpl', 'dpl', 'bartender', 'spooler']).default('zpl')
}).strict();

export const FilePathSchema = z.string().min(1, 'File path is required').max(1024);

export const AppSettingsSchema = z.record(z.string(), z.unknown());
