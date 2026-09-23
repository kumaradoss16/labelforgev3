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
});
