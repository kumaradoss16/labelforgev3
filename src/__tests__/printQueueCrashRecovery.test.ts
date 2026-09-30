import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PrintJob } from '../types/printer';
import { PrintQueueService } from '../../electron/services/printer/PrintQueueService';

describe('PrintQueueService Crash Recovery (Item 43)', () => {
  let tempDir: string;
  let queueFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labelforge-queue-recovery-'));
    queueFilePath = path.join(tempDir, 'print_queue.json');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('recovers pending jobs from disk on service initialization', async () => {
    const mockJobs: PrintJob[] = [{
      id: 'crash-job-1',
      jobName: 'Crash Test',
      templateName: 'Shipping',
      templateVersion: 1,
      printerId: 'pr-1',
      printerName: 'Zebra',
      copies: 1,
      recordCount: 1,
      status: 'QUEUED',
      createdAt: '10:00:00',
      outputLanguage: 'ZPL'
    }];

    // Pre-populate queue file on disk before service starts (simulating state prior to crash)
    fs.writeFileSync(queueFilePath, JSON.stringify(mockJobs, null, 2), 'utf-8');

    const service = new PrintQueueService(queueFilePath);
    expect(service.getQueue().length).toBe(1);
    expect(service.getQueue()[0].id).toBe('crash-job-1');
    expect(service.getQueue()[0].status).toBe('QUEUED');
  });

  it('preserves added jobs across service restart/crash cycles', async () => {
    // 1. Initial service adds a job
    const service1 = new PrintQueueService(queueFilePath);
    await service1.addJob({
      id: 'persisted-job-101',
      jobName: 'Batch Manifest',
      templateName: 'Pallet Label',
      templateVersion: 2,
      printerId: 'pr-zebra',
      printerName: 'Zebra ZT411',
      copies: 5,
      recordCount: 5,
      status: 'PRINTING',
      createdAt: new Date().toISOString(),
      outputLanguage: 'ZPL'
    });

    expect(service1.getQueue().length).toBe(1);
    expect(fs.existsSync(queueFilePath)).toBe(true);

    // 2. Service "crashes" (instance destroyed, new instance spawned from disk state)
    const service2 = new PrintQueueService(queueFilePath);
    const recoveredQueue = service2.getQueue();
    expect(recoveredQueue.length).toBe(1);
    expect(recoveredQueue[0].id).toBe('persisted-job-101');
    expect(recoveredQueue[0].status).toBe('PRINTING');

    // 3. Update job status and verify persistency on restart
    await service2.updateJobStatus('persisted-job-101', 'COMPLETED');
    const service3 = new PrintQueueService(queueFilePath);
    expect(service3.getQueue()[0].status).toBe('COMPLETED');
  });

  it('handles corrupted queue file gracefully without crashing', () => {
    // Corrupted JSON content
    fs.writeFileSync(queueFilePath, '{ corrupted json: not valid ...', 'utf-8');
    const service = new PrintQueueService(queueFilePath);
    expect(service.getQueue()).toEqual([]);
  });
});
