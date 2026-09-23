/**
 * LabelForge Desktop - Privileged Audit Logging Service
 * Records immutable audit records for print requests, project access, and security events
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { paths } from '../../config/paths';
import { logger } from '../../utils/logger';

export interface AuditRecord {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  role: string;
  resource: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILURE' | 'DENIED';
  details?: Record<string, any>;
  errorMessage?: string;
  previousHash: string;
  hash: string;
}

export class AuditService {
  private auditFilePath: string = '';

  constructor() {
    this.auditFilePath = path.join(paths.getAppDataDir(), 'audit.jsonl');

    // Run cryptographic integrity verification on startup
    const integrity = this.verifyIntegrity();
    if (!integrity.isValid) {
      logger.error('AuditService', `!!! SECURITY ALARM: AUDIT TRAIL TAMPERING DETECTED !!! ${integrity.message}`);
    } else {
      logger.info('AuditService', 'Audit trail cryptographic integrity verified successfully.');
    }
  }

  private calculateRecordHash(record: Omit<AuditRecord, 'hash'>): string {
    const dataString = JSON.stringify({
      id: record.id,
      timestamp: record.timestamp,
      action: record.action,
      user: record.user,
      role: record.role,
      resource: record.resource,
      result: record.result,
      details: record.details || null,
      errorMessage: record.errorMessage || null,
      previousHash: record.previousHash
    });
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private getLastRecordHash(): string {
    if (!fs.existsSync(this.auditFilePath)) return 'genesis';
    try {
      const content = fs.readFileSync(this.auditFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      if (lines.length === 0) return 'genesis';
      const lastRecord = JSON.parse(lines[lines.length - 1]);
      return lastRecord.hash || 'genesis';
    } catch {
      return 'genesis';
    }
  }

  public verifyIntegrity(): { isValid: boolean; errorIndex?: number; message?: string } {
    if (!fs.existsSync(this.auditFilePath)) return { isValid: true };

    try {
      const content = fs.readFileSync(this.auditFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      let expectedPrevHash = 'genesis';

      for (let i = 0; i < lines.length; i++) {
        const record = JSON.parse(lines[i]) as AuditRecord;

        if (record.previousHash !== expectedPrevHash) {
          return {
            isValid: false,
            errorIndex: i,
            message: `Hash-chain mismatch at index ${i}. Expected previous hash "${expectedPrevHash}", but found "${record.previousHash}".`
          };
        }

        const calculatedHash = this.calculateRecordHash(record);
        if (record.hash !== calculatedHash) {
          return {
            isValid: false,
            errorIndex: i,
            message: `Record hash tampering detected at index ${i}. Expected hash "${calculatedHash}", but record contains "${record.hash}".`
          };
        }

        expectedPrevHash = record.hash;
      }
      return { isValid: true };
    } catch (err: any) {
      return { isValid: false, message: `Integrity check failed to execute: ${err.message}` };
    }
  }

  public recordEvent(record: Omit<AuditRecord, 'id' | 'timestamp' | 'previousHash' | 'hash'>): AuditRecord {
    const previousHash = this.getLastRecordHash();

    const partialRecord: Omit<AuditRecord, 'hash'> = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action: record.action,
      user: record.user,
      role: record.role,
      resource: record.resource,
      result: record.result,
      details: record.details,
      errorMessage: record.errorMessage,
      previousHash
    };

    const hash = this.calculateRecordHash(partialRecord);
    const fullRecord: AuditRecord = {
      ...partialRecord,
      hash
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
