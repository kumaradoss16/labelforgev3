/**
 * LabelForge Desktop - Privileged Audit Logging Service
 * Records immutable audit records for print requests, project access, and security events
 */

import fs from 'fs';
import path from 'path';
import { paths } from '../../config/paths';
import { logger } from '../../utils/logger';

export interface AuditRecord {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  role: string;
  resource: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILURE';
  details?: Record<string, any>;
  errorMessage?: string;
}

export class AuditService {
  private auditFilePath: string = '';

  constructor() {
    this.auditFilePath = path.join(paths.getAppDataDir(), 'audit.jsonl');
  }

  public recordEvent(record: Omit<AuditRecord, 'id' | 'timestamp'>): AuditRecord {
    const fullRecord: AuditRecord = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...record
    };

    logger.info('AuditService', `[AUDIT] ${fullRecord.action} (${fullRecord.result}) by ${fullRecord.user}`);

    try {
      const line = JSON.stringify(fullRecord) + '\n';
      fs.appendFileSync(this.auditFilePath, line, 'utf-8');
    } catch (err: any) {
      logger.error('AuditService', `Failed to write audit event to disk: ${err.message}`);
    }

    return fullRecord;
  }

  public getRecentRecords(limit: number = 100): AuditRecord[] {
    if (!fs.existsSync(this.auditFilePath)) return [];
    try {
      const content = fs.readFileSync(this.auditFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      const records: AuditRecord[] = [];
      for (let i = lines.length - 1; i >= 0 && records.length < limit; i--) {
        try {
          records.push(JSON.parse(lines[i]));
        } catch {}
      }
      return records;
    } catch {
      return [];
    }
  }
}

export const auditService = new AuditService();
