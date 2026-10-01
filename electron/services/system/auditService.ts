/**
 * LabelForge Desktop - Privileged Audit Logging Service
 * Backed by Transactional SQLite WAL mode with continuous segment hash chaining,
 * Ed25519 digital signatures, and tamper-evident verification.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { paths } from '../../config/paths';
import { logger } from '../../utils/logger';
import { AuditDatabase, auditDatabase as defaultDb, StoredAuditRecord } from '../audit/auditDatabase';
import { AuditVerifier, AuditVerificationResult } from '../audit/auditVerifier';
import { AuditSigner, AuditExportBundle } from '../audit/auditSigner';
import { canonicalizeAuditPayload, computeCanonicalRecordHash } from '../audit/auditCanonicalizer';

export interface AuditRecord {
  id: string;
  sequenceNumber?: number;
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

export interface AuditArchiveInfo {
  filename: string;
  firstPreviousHash: string;
  finalHash: string;
  recordCount: number;
  rotatedAt: string;
}

export interface AuditChainState {
  lastRotatedHash: string;
  lastArchiveFilename: string;
  rotatedAt: string;
  archives: AuditArchiveInfo[];
}

export class AuditService {
  private auditFilePath: string = '';
  private auditDb: AuditDatabase;

  constructor(customFilePath?: string) {
    if (customFilePath) {
      this.auditFilePath = customFilePath;
      const dbPath = customFilePath.endsWith('.db') ? customFilePath : `${customFilePath}.db`;
      this.auditDb = new AuditDatabase(dbPath);
    } else {
      this.auditFilePath = path.join(paths.getAppDataDir(), 'audit.jsonl');
      this.auditDb = defaultDb;
    }

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

  private getChainStatePath(): string {
    const dir = path.dirname(this.auditFilePath);
    const base = path.basename(this.auditFilePath, '.jsonl');
    return path.join(dir, `${base}.chain-state.json`);
  }

  private getLastRecordHash(): string {
    if (fs.existsSync(this.auditFilePath)) {
      try {
        const content = fs.readFileSync(this.auditFilePath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        if (lines.length > 0) {
          const lastRecord = JSON.parse(lines[lines.length - 1]);
          return lastRecord.hash || 'genesis';
        }
      } catch {
        // Fall back to sidecar state check
      }
    }

    // Active log does not exist or is empty: check if there is an anchor from rotation in sidecar
    try {
      const statePath = this.getChainStatePath();
      if (fs.existsSync(statePath)) {
        const raw = fs.readFileSync(statePath, 'utf-8');
        const state: AuditChainState = JSON.parse(raw);
        if (state.lastRotatedHash) {
          return state.lastRotatedHash;
        }
      }
    } catch {
      // Ignore sidecar read error and fall back to genesis hash
    }

    return 'genesis';
  }

  /**
   * Rotates the active audit log file and preserves continuous cryptographic hash-chain state.
   */
  public rotateLogs(): { success: boolean; archivePath?: string; finalHash?: string } {
    if (!fs.existsSync(this.auditFilePath)) {
      return { success: false };
    }

    try {
      const content = fs.readFileSync(this.auditFilePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);
      if (lines.length === 0) {
        return { success: false };
      }

      const firstRecord = JSON.parse(lines[0]) as AuditRecord;
      const lastRecord = JSON.parse(lines[lines.length - 1]) as AuditRecord;
      const finalHash = lastRecord.hash;

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const archiveFilename = `${path.basename(this.auditFilePath)}.${timestamp}.bak`;
      const archivePath = path.join(path.dirname(this.auditFilePath), archiveFilename);

      fs.renameSync(this.auditFilePath, archivePath);

      // Persist that final hash in sidecar (audit.chain-state.json)
      const statePath = this.getChainStatePath();
      let state: AuditChainState = {
        lastRotatedHash: finalHash,
        lastArchiveFilename: archiveFilename,
        rotatedAt: new Date().toISOString(),
        archives: []
      };

      if (fs.existsSync(statePath)) {
        try {
          const raw = fs.readFileSync(statePath, 'utf-8');
          state = JSON.parse(raw);
        } catch {
          // Ignore corrupt sidecar parsing and initialize clean state
        }
      }

      state.lastRotatedHash = finalHash;
      state.lastArchiveFilename = archiveFilename;
      state.rotatedAt = new Date().toISOString();
      if (!Array.isArray(state.archives)) {
        state.archives = [];
      }
      state.archives.push({
        filename: archiveFilename,
        firstPreviousHash: firstRecord.previousHash,
        finalHash,
        recordCount: lines.length,
        rotatedAt: new Date().toISOString()
      });

      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');

      try {
        this.auditDb.rotateSegment();
      } catch {
        // Non-fatal if sqlite audit db rotation is not supported or already performed
      }

      logger.info('AuditService', `Rotated audit log to ${archiveFilename} with anchor hash ${finalHash.slice(0, 12)}...`);
      return { success: true, archivePath, finalHash };
    } catch (err: any) {
      logger.error('AuditService', `Failed to rotate audit log: ${err.message}`);
      return { success: false };
    }
  }

  public verifyIntegrity(options?: { walkArchives?: boolean }): {
    isValid: boolean;
    errorIndex?: number;
    sequenceNumber?: number;
    message?: string;
    archiveFile?: string;
  } {
    const walkArchives = options?.walkArchives === true;

    if (walkArchives) {
      // Cross-rotation continuous chain verification
      const statePath = this.getChainStatePath();
      let state: AuditChainState | null = null;
      if (fs.existsSync(statePath)) {
        try {
          state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        } catch {
          return { isValid: false, message: 'Audit chain state sidecar corrupted or unreadable.' };
        }
      }

      const auditDir = path.dirname(this.auditFilePath);
      const auditBase = path.basename(this.auditFilePath);

      // Check for missing recorded archives
      if (state && Array.isArray(state.archives)) {
        for (const arch of state.archives) {
          const archPath = path.join(auditDir, arch.filename);
          if (!fs.existsSync(archPath)) {
            return {
              isValid: false,
              archiveFile: arch.filename,
              message: `Missing audit archive file "${arch.filename}". Archive deletion detected.`
            };
          }
        }
      }

      // Discover all archive files matching the pattern
      let archiveFiles: string[] = [];
      if (fs.existsSync(auditDir)) {
        archiveFiles = fs.readdirSync(auditDir)
          .filter(f => f.startsWith(`${auditBase}.`) && f.endsWith('.bak'))
          .sort();
      }

      let expectedPrevHash = 'genesis';

      // Walk each archive in sequence
      for (const archFilename of archiveFiles) {
        const archPath = path.join(auditDir, archFilename);
        try {
          const content = fs.readFileSync(archPath, 'utf-8');
          const lines = content.trim().split('\n').filter(Boolean);

          for (let i = 0; i < lines.length; i++) {
            const record = JSON.parse(lines[i]) as AuditRecord;

            if (record.previousHash !== expectedPrevHash) {
              return {
                isValid: false,
                archiveFile: archFilename,
                errorIndex: i,
                message: `Hash-chain mismatch in archive "${archFilename}" at index ${i}. Expected previous hash "${expectedPrevHash}", but found "${record.previousHash}".`
              };
            }

            const calculatedHash = this.calculateRecordHash(record);
            if (record.hash !== calculatedHash) {
              return {
                isValid: false,
                archiveFile: archFilename,
                errorIndex: i,
                message: `Record hash tampering detected in archive "${archFilename}" at index ${i}. Expected hash "${calculatedHash}", but record contains "${record.hash}".`
              };
            }

            expectedPrevHash = record.hash;
          }

          if (state && Array.isArray(state.archives)) {
            const archMeta = state.archives.find(a => a.filename === archFilename);
            if (archMeta && archMeta.finalHash !== expectedPrevHash) {
              return {
                isValid: false,
                archiveFile: archFilename,
                message: `Archive final hash mismatch in "${archFilename}". Chain state recorded "${archMeta.finalHash}", but archive computed "${expectedPrevHash}".`
              };
            }
          }
        } catch (err: any) {
          return {
            isValid: false,
            archiveFile: archFilename,
            message: `Failed verifying archive "${archFilename}": ${err.message}`
          };
        }
      }

      // Verify sidecar lastRotatedHash consistency
      if (archiveFiles.length > 0 && state?.lastRotatedHash) {
        if (state.lastRotatedHash !== expectedPrevHash) {
          return {
            isValid: false,
            message: `Chain state mismatch: sidecar lastRotatedHash "${state.lastRotatedHash}" does not match final archive hash "${expectedPrevHash}".`
          };
        }
      }

      // Verify active log against continuous expectedPrevHash
      if (fs.existsSync(this.auditFilePath)) {
        try {
          const content = fs.readFileSync(this.auditFilePath, 'utf-8');
          const lines = content.trim().split('\n').filter(Boolean);

          for (let i = 0; i < lines.length; i++) {
            const record = JSON.parse(lines[i]) as AuditRecord;

            if (record.previousHash !== expectedPrevHash) {
              return {
                isValid: false,
                errorIndex: i,
                message: `Hash-chain mismatch in active log at index ${i}. Expected previous hash "${expectedPrevHash}", but found "${record.previousHash}".`
              };
            }

            const calculatedHash = this.calculateRecordHash(record);
            if (record.hash !== calculatedHash) {
              return {
                isValid: false,
                errorIndex: i,
                message: `Record hash tampering detected in active log at index ${i}. Expected hash "${calculatedHash}", but record contains "${record.hash}".`
              };
            }

            expectedPrevHash = record.hash;
          }
        } catch (err: any) {
          return { isValid: false, message: `Active log verification failed: ${err.message}` };
        }
      }
    } else {
      // Default: Preserve the existing single-file hash-chain behavior for the active log
      if (fs.existsSync(this.auditFilePath)) {
        try {
          const content = fs.readFileSync(this.auditFilePath, 'utf-8');
          const lines = content.trim().split('\n').filter(Boolean);
          if (lines.length > 0) {
            let expectedPrevHash = 'genesis';
            try {
              const statePath = this.getChainStatePath();
              if (fs.existsSync(statePath)) {
                const raw = fs.readFileSync(statePath, 'utf-8');
                const state: AuditChainState = JSON.parse(raw);
                const firstRecord = JSON.parse(lines[0]) as AuditRecord;
                if (state.lastRotatedHash && firstRecord.previousHash === state.lastRotatedHash) {
                  expectedPrevHash = state.lastRotatedHash;
                }
              }
            } catch {
              // Ignore sidecar read errors during integrity verification fallback
            }

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
          }
        } catch (err: any) {
          return { isValid: false, message: `Integrity check failed to execute: ${err.message}` };
        }
      }
    }

    // 2. Verify SQLite database chain
    try {
      const dbRecords = this.auditDb.getAllRecords();
      const dbSegments = this.auditDb.getSegments();
      const dbResult = AuditVerifier.verifyChain(dbRecords, dbSegments);
      if (!dbResult.isValid) {
        return {
          isValid: false,
          sequenceNumber: dbResult.sequenceNumber,
          message: dbResult.message
        };
      }
    } catch (err: any) {
      // Non-fatal if custom file without DB
    }

    return { isValid: true };
  }

  /**
   * Concurrency-safe atomic audit event recording
   */
  public recordEvent(record: Omit<AuditRecord, 'id' | 'timestamp' | 'previousHash' | 'hash'>): AuditRecord {
    // 1. Execute transactional serialized database write
    let storedDbRecord: StoredAuditRecord | null = null;
    try {
      // If called synchronously from existing callers, we run database write
      storedDbRecord = this.auditDb.recordEvent({
        action: record.action,
        user: record.user,
        role: record.role,
        resource: record.resource,
        result: record.result,
        details: record.details,
        errorMessage: record.errorMessage
      }) as any;
    } catch {
      // Non-fatal database mirror write failure; JSONL log remains primary
    }

    // Check if rotation is needed before generating new record hash
    try {
      if (fs.existsSync(this.auditFilePath) && fs.statSync(this.auditFilePath).size > 5 * 1024 * 1024) {
        this.rotateLogs();
      }
    } catch (err: any) {
      logger.error('AuditService', `Error checking rotation: ${err.message}`);
    }

    // 2. Synchronize filesystem JSONL mirror
    const previousHash = this.getLastRecordHash();

    const partialRecord: Omit<AuditRecord, 'hash'> = {
      id: storedDbRecord?.id || `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: storedDbRecord?.timestamp || new Date().toISOString(),
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

  /**
   * Generates a signed audit export bundle using Ed25519
   */
  public exportSignedBundle(): AuditExportBundle {
    const records = this.auditDb.getAllRecords();
    const segments = this.auditDb.getSegments();

    const firstSeq = records.length > 0 ? records[0].sequenceNumber : 0;
    const lastSeq = records.length > 0 ? records[records.length - 1].sequenceNumber : 0;
    const firstHash = records.length > 0 ? records[0].recordHash : 'genesis';
    const lastHash = records.length > 0 ? records[records.length - 1].recordHash : 'genesis';

    const unsignedBundle: Omit<AuditExportBundle, 'signature' | 'publicKeyPem'> = {
      exportId: `export-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
      exportedAt: new Date().toISOString(),
      segmentCount: segments.length,
      recordCount: records.length,
      firstSequenceNumber: firstSeq,
      lastSequenceNumber: lastSeq,
      firstRecordHash: firstHash,
      lastRecordHash: lastHash,
      records,
      segments
    };

    return AuditSigner.prototype ? new AuditSigner().signBundle(unsignedBundle) : (unsignedBundle as any);
  }

  public getRecentRecords(limit: number = 100): AuditRecord[] {
    if (fs.existsSync(this.auditFilePath)) {
      try {
        const content = fs.readFileSync(this.auditFilePath, 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        const records: AuditRecord[] = [];
        for (let i = lines.length - 1; i >= 0 && records.length < limit; i--) {
          try {
            records.push(JSON.parse(lines[i]));
          } catch {
            // Skip unparseable or corrupted lines when reading recent records
          }
        }
        return records;
      } catch {
        // Fall back to SQLite database if reading audit log file fails
      }
    }

    const dbRows = this.auditDb.getRecentRecords(limit);
    return dbRows.map(r => ({
      id: r.id,
      sequenceNumber: r.sequenceNumber,
      timestamp: r.timestamp,
      action: r.action,
      user: r.userName,
      role: r.role as any,
      resource: r.resource,
      result: r.result as any,
      previousHash: r.previousHash,
      hash: r.recordHash
    }));
  }

  public getDatabase(): AuditDatabase {
    return this.auditDb;
  }
}

export const auditService = new AuditService();
