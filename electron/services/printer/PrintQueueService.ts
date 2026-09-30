/**
 * LabelForge Desktop - Durable Print Queue Service
 */

import fs from 'fs';
import path from 'path';
import { PrintJob, PrintJobState } from '../../../src/types/printer';
import { paths } from '../../config/paths';
import { logger } from '../../utils/logger';
import { atomicFileReplace } from '../filesystem/atomicFileReplaceService';

export class PrintQueueService {
  private queueFilePath: string;
  private queue: PrintJob[] = [];

  constructor(customPath?: string) {
    this.queueFilePath = customPath || path.join(paths.getAppDataDir(), 'print_queue.json');
    // Ensure we load synchronously in constructor for simplicity in this architecture
    this.loadQueueSync();
  }

  private loadQueueSync() {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const data = fs.readFileSync(this.queueFilePath, 'utf-8');
        this.queue = JSON.parse(data);
        logger.info('PrintQueueService', `Loaded ${this.queue.length} jobs from queue`);
      }
    } catch (err: any) {
      logger.error('PrintQueueService', `Failed to load queue: ${err.message}`);
    }
  }

  private async saveQueue() {
    try {
      await atomicFileReplace.writeAtomic({
        content: JSON.stringify(this.queue),
        targetPath: this.queueFilePath
      });
    } catch (err: any) {
      logger.error('PrintQueueService', `Failed to save queue: ${err.message}`);
    }
  }

  public async addJob(job: PrintJob) {
    this.queue.push(job);
    await this.saveQueue();
    logger.info('PrintQueueService', `Job ${job.id} added to queue`);
  }

  public async updateJobStatus(jobId: string, status: PrintJobState, error?: string) {
    const job = this.queue.find(j => j.id === jobId);
    if (job) {
      job.status = status;
      if (error) job.error = error;
      await this.saveQueue();
      logger.info('PrintQueueService', `Job ${jobId} status updated to ${status}`);
    }
  }

  public getQueue(): PrintJob[] {
    return this.queue;
  }
}

export const printQueueService = new PrintQueueService();
