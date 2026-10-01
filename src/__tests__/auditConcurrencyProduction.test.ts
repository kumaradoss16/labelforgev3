/**
 * LabelForge Production Security - Audit Concurrency & Verification Test Suite (P0-3)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AuditDatabase } from '../../electron/services/audit/auditDatabase';
import { AuditVerifier } from '../../electron/services/audit/auditVerifier';
import { AuditSigner } from '../../electron/services/audit/auditSigner';

describe('P0-3: Transaction-Safe, Continuous Audit Persistence & Verification', () => {
  let tempDir: string;
  let dbPath: string;
  let auditDb: AuditDatabase;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labelforge-audit-wal-'));
    dbPath = path.join(tempDir, 'audit_test.db');
    auditDb = new AuditDatabase(dbPath);
  });

  afterEach(() => {
    try {
      auditDb.close();
    } catch {
      // Best-effort cleanup of test database in teardown
    }
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('handles 100 concurrent asynchronous audit writes without forking or sequence gaps', async () => {
    const TOTAL_EVENTS = 100;

    // Launch 100 concurrent writes simultaneously
    const writePromises = Array.from({ length: TOTAL_EVENTS }, (_, idx) => {
      return auditDb.recordEvent({
        action: `CONCURRENT_JOB_DISPATCH_${idx}`,
        user: `operator_${idx % 5}`,
        role: 'OPERATOR',
        resource: 'Zebra ZT411',
        result: 'SUCCESS',
        details: { index: idx }
      });
    });

    const recorded = await Promise.all(writePromises);
    expect(recorded.length).toBe(TOTAL_EVENTS);

    // Retrieve full ordered ledger
    const allRecords = auditDb.getAllRecords();
    expect(allRecords.length).toBe(TOTAL_EVENTS);

    // Verify all sequence numbers are strictly 1 to 100 with zero duplicates or gaps
    const sequences = allRecords.map(r => r.sequenceNumber);
    for (let i = 0; i < TOTAL_EVENTS; i++) {
      expect(sequences[i]).toBe(i + 1);
    }

    // Verify that every record's previousHash matches previous record's recordHash
    for (let i = 1; i < allRecords.length; i++) {
      expect(allRecords[i].previousHash).toBe(allRecords[i - 1].recordHash);
    }

    // Verify entire chain using independent verification engine
    const verification = AuditVerifier.verifyChain(allRecords);
    expect(verification.isValid).toBe(true);
    expect(verification.code).toBe('VALID');
    expect(verification.totalRecordsChecked).toBe(TOTAL_EVENTS);
  });

  it('preserves continuous hash chain across segment rotations without resetting to genesis', async () => {
    // Write 5 records in segment 1
    for (let i = 1; i <= 5; i++) {
      await auditDb.recordEvent({
        action: `BATCH_PRINT_${i}`,
        user: 'admin',
        role: 'SYSTEM_ADMIN',
        resource: 'ZT411',
        result: 'SUCCESS'
      });
    }

    const recordsBefore = auditDb.getAllRecords();
    const lastHashSeg1 = recordsBefore[recordsBefore.length - 1].recordHash;

    // Rotate segment
    const rotation = auditDb.rotateSegment();
    expect(rotation.oldSegment).toBe(1);
    expect(rotation.newSegment).toBe(2);
    expect(rotation.previousSegmentHash).toBe(lastHashSeg1);

    // Write 5 records in segment 2
    for (let i = 6; i <= 10; i++) {
      await auditDb.recordEvent({
        action: `BATCH_PRINT_${i}`,
        user: 'admin',
        role: 'SYSTEM_ADMIN',
        resource: 'PM43',
        result: 'SUCCESS'
      });
    }

    const allRecords = auditDb.getAllRecords();
    const allSegments = auditDb.getSegments();

    expect(allRecords.length).toBe(10);
    expect(allSegments.length).toBe(2);

    // Verify that segment 2's previousSegmentHash exactly matches segment 1's last record hash
    expect(allSegments[1].previousSegmentHash).toBe(allSegments[0].lastRecordHash);

    // Verify record 6's previousHash continues directly from record 5
    expect(allRecords[5].previousHash).toBe(allRecords[4].recordHash);

    // Verify entire multi-segment chain
    const verification = AuditVerifier.verifyChain(allRecords, allSegments);
    expect(verification.isValid).toBe(true);
    expect(verification.code).toBe('VALID');
  });

  it('detects record hash tampering and reports precise sequence number', async () => {
    for (let i = 1; i <= 5; i++) {
      await auditDb.recordEvent({
        action: `AUDIT_EVENT_${i}`,
        user: 'operator',
        role: 'OPERATOR',
        resource: 'Printer',
        result: 'SUCCESS'
      });
    }

    const records = auditDb.getAllRecords();

    // Tamper with record #3
    records[2].userName = 'MALICIOUS_IMPERSONATOR';

    const verification = AuditVerifier.verifyChain(records);
    expect(verification.isValid).toBe(false);
    expect(verification.code).toBe('HASH_MISMATCH');
    expect(verification.sequenceNumber).toBe(3);
  });

  it('detects record deletion / gap and reports sequence error', async () => {
    for (let i = 1; i <= 5; i++) {
      await auditDb.recordEvent({
        action: `AUDIT_EVENT_${i}`,
        user: 'operator',
        role: 'OPERATOR',
        resource: 'Printer',
        result: 'SUCCESS'
      });
    }

    const records = auditDb.getAllRecords();

    // Delete record #3
    records.splice(2, 1);

    const verification = AuditVerifier.verifyChain(records);
    expect(verification.isValid).toBe(false);
    expect(verification.code).toBe('SEQUENCE_GAP');
    expect(verification.sequenceNumber).toBe(4);
  });

  it('generates and verifies Ed25519 digital signature on exported audit packages', async () => {
    for (let i = 1; i <= 10; i++) {
      await auditDb.recordEvent({
        action: `AUDIT_EVENT_${i}`,
        user: 'manager',
        role: 'PRINT_MANAGER',
        resource: 'ZT411',
        result: 'SUCCESS'
      });
    }

    const records = auditDb.getAllRecords();
    const segments = auditDb.getSegments();

    const signer = new AuditSigner(tempDir);
    const bundle = signer.signBundle({
      exportId: 'export-001',
      exportedAt: new Date().toISOString(),
      segmentCount: segments.length,
      recordCount: records.length,
      firstSequenceNumber: records[0].sequenceNumber,
      lastSequenceNumber: records[records.length - 1].sequenceNumber,
      firstRecordHash: records[0].recordHash,
      lastRecordHash: records[records.length - 1].recordHash,
      records,
      segments
    });

    expect(bundle.signature).toBeDefined();
    expect(bundle.publicKeyPem).toBeDefined();

    // Verify signature with verifier
    const verification = AuditVerifier.verifySignedBundle(bundle);
    expect(verification.isValid).toBe(true);
    expect(verification.code).toBe('VALID');

    // Tamper with bundle signature
    const tamperedBundle = {
      ...bundle,
      signature: bundle.signature?.replace(/^../, '99')
    };

    const tamperedVerification = AuditVerifier.verifySignedBundle(tamperedBundle);
    expect(tamperedVerification.isValid).toBe(false);
    expect(tamperedVerification.code).toBe('SIGNATURE_INVALID');
  });
});
