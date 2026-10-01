import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AuditService } from '../../electron/services/system/auditService';
import { checkPermission, PRIVILEGED_ACTIONS } from '../../electron/config/permissions';

describe('ISSUE 3 — Role-Based Access Control & Audit Trail Integrity', () => {
  let tempDir: string;
  let auditFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labelforge-audit-test-'));
    auditFilePath = path.join(tempDir, 'audit.jsonl');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('verifies RBAC checks inside permission tables', () => {
    expect(checkPermission('SYSTEM_ADMIN', PRIVILEGED_ACTIONS.PRINT)).toBe(true);
    expect(checkPermission('OPERATOR', PRIVILEGED_ACTIONS.PRINT)).toBe(true);
    expect(checkPermission('VIEWER', PRIVILEGED_ACTIONS.PRINT)).toBe(false);

    expect(checkPermission('OPERATOR', PRIVILEGED_ACTIONS.TEST_PRINT)).toBe(true);
    expect(checkPermission('VIEWER', PRIVILEGED_ACTIONS.TEST_PRINT)).toBe(false);
  });

  it('creates cryptographically chained audit logs and verifies integrity successfully', () => {
    // Custom paths injection for testing
    const testAuditService = new AuditService();
    (testAuditService as any).auditFilePath = auditFilePath;

    testAuditService.recordEvent({
      action: 'SUBMIT_JOB',
      user: 'Warehouse Operator',
      role: 'OPERATOR',
      resource: 'Thermal Zebra ZT411',
      result: 'SUCCESS'
    });

    testAuditService.recordEvent({
      action: 'SUBMIT_JOB',
      user: 'Print Manager',
      role: 'PRINT_MANAGER',
      resource: 'Industrial Honeywell PM43',
      result: 'SUCCESS'
    });

    const fileContent = fs.readFileSync(auditFilePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    expect(lines.length).toBe(2);

    const record1 = JSON.parse(lines[0]);
    const record2 = JSON.parse(lines[1]);

    expect(record1.previousHash).toBe('genesis');
    expect(record2.previousHash).toBe(record1.hash);

    const integrity = testAuditService.verifyIntegrity();
    expect(integrity.isValid).toBe(true);
  });

  it('detects tampering or hash-chain mismatch if an entry is altered', () => {
    const testAuditService = new AuditService();
    (testAuditService as any).auditFilePath = auditFilePath;

    testAuditService.recordEvent({
      action: 'SUBMIT_JOB',
      user: 'Operator',
      role: 'OPERATOR',
      resource: 'Zebra ZT411',
      result: 'SUCCESS'
    });

    testAuditService.recordEvent({
      action: 'SUBMIT_JOB',
      user: 'Operator 2',
      role: 'OPERATOR',
      resource: 'Zebra ZT411',
      result: 'SUCCESS'
    });

    const fileContent = fs.readFileSync(auditFilePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    const record1 = JSON.parse(lines[0]);
    
    // Tamper with record 1 data
    record1.user = 'Altered User Name';
    
    // Write back tampered file
    lines[0] = JSON.stringify(record1);
    fs.writeFileSync(auditFilePath, lines.join('\n') + '\n', 'utf-8');

    const integrity = testAuditService.verifyIntegrity();
    expect(integrity.isValid).toBe(false);
    expect(integrity.message).toContain('Record hash tampering detected');
  });

  it('detects gaps or insertion if an intermediate record is deleted', () => {
    const testAuditService = new AuditService();
    (testAuditService as any).auditFilePath = auditFilePath;

    testAuditService.recordEvent({ action: 'E1', user: 'U', role: 'OPERATOR', resource: 'R', result: 'SUCCESS' });
    testAuditService.recordEvent({ action: 'E2', user: 'U', role: 'OPERATOR', resource: 'R', result: 'SUCCESS' });
    testAuditService.recordEvent({ action: 'E3', user: 'U', role: 'OPERATOR', resource: 'R', result: 'SUCCESS' });

    const fileContent = fs.readFileSync(auditFilePath, 'utf-8');
    const lines = fileContent.trim().split('\n');
    
    // Remove second record (index 1)
    lines.splice(1, 1);
    fs.writeFileSync(auditFilePath, lines.join('\n') + '\n', 'utf-8');

    const integrity = testAuditService.verifyIntegrity();
    expect(integrity.isValid).toBe(false);
    expect(integrity.message).toContain('Hash-chain mismatch');
  });

  it('preserves continuous cryptographic hash-chain across log rotation and verifies cross-archive integrity', () => {
    const testAuditService = new AuditService();
    (testAuditService as any).auditFilePath = auditFilePath;

    // Record initial events before rotation
    const r1 = testAuditService.recordEvent({ action: 'LOGIN', user: 'Admin', role: 'SYSTEM_ADMIN', resource: 'SYSTEM', result: 'SUCCESS' });
    const r2 = testAuditService.recordEvent({ action: 'PRINT_JOB', user: 'Operator', role: 'OPERATOR', resource: 'ZT411', result: 'SUCCESS' });

    expect(r1.previousHash).toBe('genesis');
    expect(r2.previousHash).toBe(r1.hash);

    // Perform rotation
    const rotateRes = testAuditService.rotateLogs();
    expect(rotateRes.success).toBe(true);
    expect(rotateRes.finalHash).toBe(r2.hash);

    // Record new events in the fresh active file
    const r3 = testAuditService.recordEvent({ action: 'PRINT_JOB', user: 'Operator', role: 'OPERATOR', resource: 'ZT411', result: 'SUCCESS' });
    const r4 = testAuditService.recordEvent({ action: 'LOGOUT', user: 'Operator', role: 'OPERATOR', resource: 'SYSTEM', result: 'SUCCESS' });

    // CRITICAL: First record in new file MUST be anchored to the final hash of the rotated file!
    expect(r3.previousHash).toBe(r2.hash);
    expect(r4.previousHash).toBe(r3.hash);

    // Single-file integrity check for active log passes
    const activeIntegrity = testAuditService.verifyIntegrity();
    expect(activeIntegrity.isValid).toBe(true);

    // Cross-boundary archive walk passes
    const fullIntegrity = testAuditService.verifyIntegrity({ walkArchives: true });
    expect(fullIntegrity.isValid).toBe(true);
  });

  it('detects tampering or deletion of archived audit files during cross-archive verification', () => {
    const testAuditService = new AuditService();
    (testAuditService as any).auditFilePath = auditFilePath;

    testAuditService.recordEvent({ action: 'INIT', user: 'Admin', role: 'SYSTEM_ADMIN', resource: 'SYS', result: 'SUCCESS' });
    const rot = testAuditService.rotateLogs();
    expect(rot.success).toBe(true);

    testAuditService.recordEvent({ action: 'RUN', user: 'Operator', role: 'OPERATOR', resource: 'PRINT', result: 'SUCCESS' });

    // Tamper with the archived file
    const archivePath = rot.archivePath!;
    const archiveContent = fs.readFileSync(archivePath, 'utf-8');
    const tamperedContent = archiveContent.replace('"Admin"', '"MaliciousActor"');
    fs.writeFileSync(archivePath, tamperedContent, 'utf-8');

    // Walk archives should catch tampering
    const tamperedResult = testAuditService.verifyIntegrity({ walkArchives: true });
    expect(tamperedResult.isValid).toBe(false);
    expect(tamperedResult.message).toMatch(/tampering|mismatch/i);

    // Delete the archive file entirely
    fs.unlinkSync(archivePath);

    const deletedResult = testAuditService.verifyIntegrity({ walkArchives: true });
    expect(deletedResult.isValid).toBe(false);
    expect(deletedResult.message).toMatch(/Missing audit archive|deletion/i);
  });
});
