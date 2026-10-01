/**
 * LabelForge Desktop - Transaction-Safe, Continuous, SQLite WAL Audit Store
 * Enforces atomic sequence numbering, continuous hash chaining across segments,
 * and concurrency-safe single-writer serialized writes.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { paths } from '../../config/paths';
import { logger } from '../../utils/logger';
import { canonicalizeAuditPayload, computeCanonicalRecordHash, CanonicalAuditPayload } from './auditCanonicalizer';
import { AuditIntegrityError } from '../../security/errors';

export interface StoredAuditRecord extends CanonicalAuditPayload {
  id: string;
  recordHash: string;
}

export interface AuditSegment {
  segmentNumber: number;
  previousSegmentHash: string;
  firstRecordHash: string;
  lastRecordHash: string;
  recordCount: number;
  createdAt: string;
  closedAt?: string;
}

export interface NewAuditEventInput {
  action: string;
  user?: string;
  role?: string;
  resource: string;
  result: 'SUCCESS' | 'WARNING' | 'FAILURE' | 'DENIED';
  sessionId?: string;
  userId?: string;
  details?: Record<string, any>;
  errorMessage?: string;
}

export class AuditDatabase {
  private db: DatabaseSync;
  private dbFilePath: string;
  // Mutex promise queue to strictly serialize concurrent audit writes in the event loop
  private writeLock: Promise<void> = Promise.resolve();

  constructor(customPath?: string) {
    if (customPath) {
      this.dbFilePath = customPath;
    } else {
      const logsDir = paths.getLogsDir();
      if (!fs.existsSync(logsDir)) {
        try {
          fs.mkdirSync(logsDir, { recursive: true });
        } catch {
          // Ignore directory creation error if directory exists or was created concurrently
        }
      }
      this.dbFilePath = path.join(logsDir, 'audit.db');
    }

    this.db = new DatabaseSync(this.dbFilePath);
    this.initPragmasAndSchema();
  }

  private initPragmasAndSchema(): void {
    // 1. Production WAL configuration for concurrency and durability
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
    `);

    // 2. Schema definition
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_segments (
        segmentNumber INTEGER PRIMARY KEY,
        previousSegmentHash TEXT NOT NULL,
        firstRecordHash TEXT NOT NULL,
        lastRecordHash TEXT NOT NULL,
        recordCount INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        closedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        sequenceNumber INTEGER UNIQUE NOT NULL,
        segmentNumber INTEGER NOT NULL,
        eventId TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        result TEXT NOT NULL,
        metadataSafe TEXT NOT NULL,
        previousHash TEXT NOT NULL,
        recordHash TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_audit_events_seq ON audit_events(sequenceNumber);
      CREATE INDEX IF NOT EXISTS idx_audit_events_seg ON audit_events(segmentNumber);
      CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON audit_events(timestamp);
    `);

    // Initialize genesis metadata if not present
    const metaCheck = this.db.prepare('SELECT value FROM audit_metadata WHERE key = ?').get('current_segment') as { value: string } | undefined;
    if (!metaCheck) {
      this.db.exec(`
        INSERT INTO audit_metadata (key, value) VALUES ('current_segment', '1');
        INSERT INTO audit_metadata (key, value) VALUES ('last_sequence', '0');
        INSERT INTO audit_metadata (key, value) VALUES ('last_hash', 'genesis');
      `);

      this.db.prepare(`
        INSERT INTO audit_segments (segmentNumber, previousSegmentHash, firstRecordHash, lastRecordHash, recordCount, createdAt)
        VALUES (1, 'genesis', 'pending', 'genesis', 0, ?)
      `).run(new Date().toISOString());

      logger.info('AuditDatabase', 'Initialized genesis audit schema in WAL mode');
    }
  }

  /**
   * Serialized atomic transaction to record an audit event.
   * Completely immune to concurrent writers.
   */
  public async recordEvent(event: NewAuditEventInput): Promise<StoredAuditRecord> {
    // Acquire mutex lock so all concurrent calls are executed sequentially
    let releaseLock: () => void;
    const lockAcquired = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const previousLock = this.writeLock;
    this.writeLock = lockAcquired;

    await previousLock;

    try {
      return this.executeAtomicWrite(event);
    } finally {
      releaseLock!();
    }
  }

  private executeAtomicWrite(event: NewAuditEventInput): StoredAuditRecord {
    // Begin immediate transaction
    this.db.exec('BEGIN IMMEDIATE');

    try {
      // 1. Fetch current atomic chain state
      const seqRow = this.db.prepare("SELECT value FROM audit_metadata WHERE key = 'last_sequence'").get() as { value: string };
      const hashRow = this.db.prepare("SELECT value FROM audit_metadata WHERE key = 'last_hash'").get() as { value: string };
      const segRow = this.db.prepare("SELECT value FROM audit_metadata WHERE key = 'current_segment'").get() as { value: string };

      const currentSequence = parseInt(seqRow?.value || '0', 10);
      const nextSequence = currentSequence + 1;
      const previousHash = hashRow?.value || 'genesis';
      const segmentNumber = parseInt(segRow?.value || '1', 10);

      const timestamp = new Date().toISOString();
      const eventId = `evt-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const id = `audit-${nextSequence}`;

      // Sanitize metadata to prevent sensitive credential/token leakage
      const safeDetails = event.details ? this.sanitizeDetails(event.details) : {};
      if (event.errorMessage) {
        safeDetails.errorMessageSafe = String(event.errorMessage).slice(0, 500);
      }
      const metadataSafe = JSON.stringify(safeDetails);

      const payload: CanonicalAuditPayload = {
        sequenceNumber: nextSequence,
        segmentNumber,
        eventId,
        timestamp,
        sessionId: event.sessionId || 'session-internal',
        userId: event.userId || event.user || 'usr-system',
        userName: event.user || 'System Process',
        role: event.role || 'SYSTEM_ADMIN',
        action: event.action,
        resource: event.resource,
        result: event.result,
        metadataSafe,
        previousHash
      };

      // 2. Compute canonical cryptographic hash
      const recordHash = computeCanonicalRecordHash(payload);

      // 3. Insert record into audit_events
      this.db.prepare(`
        INSERT INTO audit_events (
          id, sequenceNumber, segmentNumber, eventId, timestamp, sessionId,
          userId, userName, role, action, resource, result, metadataSafe,
          previousHash, recordHash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        payload.sequenceNumber,
        payload.segmentNumber,
        payload.eventId,
        payload.timestamp,
        payload.sessionId,
        payload.userId,
        payload.userName,
        payload.role,
        payload.action,
        payload.resource,
        payload.result,
        payload.metadataSafe,
        payload.previousHash,
        recordHash
      );

      // 4. Update metadata tables atomically
      this.db.prepare("UPDATE audit_metadata SET value = ? WHERE key = 'last_sequence'").run(String(nextSequence));
      this.db.prepare("UPDATE audit_metadata SET value = ? WHERE key = 'last_hash'").run(recordHash);

      // 5. Update segment table
      const segData = this.db.prepare('SELECT recordCount, firstRecordHash FROM audit_segments WHERE segmentNumber = ?').get(segmentNumber) as any;
      const count = (segData?.recordCount || 0) + 1;
      const firstHash = (!segData?.firstRecordHash || segData?.firstRecordHash === 'pending') ? recordHash : segData.firstRecordHash;

      this.db.prepare(`
        UPDATE audit_segments
        SET recordCount = ?, lastRecordHash = ?, firstRecordHash = ?
        WHERE segmentNumber = ?
      `).run(count, recordHash, firstHash, segmentNumber);

      // Commit transaction
      this.db.exec('COMMIT');

      logger.info('AuditDatabase', `[AUDIT #${nextSequence}] ${payload.action} (${payload.result}) by ${payload.userName} [hash: ${recordHash.slice(0, 8)}...]`);

      return {
        ...payload,
        id,
        recordHash
      };
    } catch (err: any) {
      this.db.exec('ROLLBACK');
      logger.error('AuditDatabase', `Audit write transaction rolled back: ${err.message}`);
      throw new AuditIntegrityError(`Audit transaction failed: ${err.message}`);
    }
  }

  /**
   * Rotates audit segment without breaking the continuous hash chain.
   * New segment records previousSegmentHash = last segment's lastRecordHash.
   */
  public rotateSegment(): { oldSegment: number; newSegment: number; previousSegmentHash: string } {
    this.db.exec('BEGIN IMMEDIATE');

    try {
      const segRow = this.db.prepare("SELECT value FROM audit_metadata WHERE key = 'current_segment'").get() as { value: string };
      const currentSegment = parseInt(segRow.value, 10);
      const nextSegment = currentSegment + 1;

      const lastSeg = this.db.prepare('SELECT lastRecordHash FROM audit_segments WHERE segmentNumber = ?').get(currentSegment) as any;
      const previousSegmentHash = lastSeg?.lastRecordHash || 'genesis';

      const now = new Date().toISOString();

      // Close current segment
      this.db.prepare('UPDATE audit_segments SET closedAt = ? WHERE segmentNumber = ?').run(now, currentSegment);

      // Create new segment referencing previous segment's last hash
      this.db.prepare(`
        INSERT INTO audit_segments (segmentNumber, previousSegmentHash, firstRecordHash, lastRecordHash, recordCount, createdAt)
        VALUES (?, ?, 'pending', ?, 0, ?)
      `).run(nextSegment, previousSegmentHash, previousSegmentHash, now);

      this.db.prepare("UPDATE audit_metadata SET value = ? WHERE key = 'current_segment'").run(String(nextSegment));

      this.db.exec('COMMIT');

      logger.info('AuditDatabase', `Rotated audit segment ${currentSegment} -> ${nextSegment} (continuous hash: ${previousSegmentHash.slice(0, 8)}...)`);
      return { oldSegment: currentSegment, newSegment: nextSegment, previousSegmentHash };
    } catch (err: any) {
      this.db.exec('ROLLBACK');
      throw new AuditIntegrityError(`Segment rotation failed: ${err.message}`);
    }
  }

  public getAllRecords(): StoredAuditRecord[] {
    const rows = this.db.prepare('SELECT * FROM audit_events ORDER BY sequenceNumber ASC').all() as any[];
    return rows.map(r => ({
      ...r,
      sequenceNumber: Number(r.sequenceNumber),
      segmentNumber: Number(r.segmentNumber)
    }));
  }

  public getRecentRecords(limit: number = 100): StoredAuditRecord[] {
    const rows = this.db.prepare('SELECT * FROM audit_events ORDER BY sequenceNumber DESC LIMIT ?').all(limit) as any[];
    return rows.map(r => ({
      ...r,
      sequenceNumber: Number(r.sequenceNumber),
      segmentNumber: Number(r.segmentNumber)
    }));
  }

  public getSegments(): AuditSegment[] {
    return this.db.prepare('SELECT * FROM audit_segments ORDER BY segmentNumber ASC').all() as any[];
  }

  public close(): void {
    try {
      this.db.close();
    } catch {
      // Ignore error if database connection is already closed
    }
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'auth', 'key', 'credential', 'apikey'];

    for (const [k, v] of Object.entries(details)) {
      const lower = k.toLowerCase();
      if (sensitiveKeys.some(s => lower.includes(s))) {
        clean[k] = '[REDACTED]';
      } else if (typeof v === 'string' && v.length > 1000) {
        clean[k] = v.slice(0, 1000) + '... [truncated]';
      } else {
        clean[k] = v;
      }
    }
    return clean;
  }
}

export const auditDatabase = new AuditDatabase();
