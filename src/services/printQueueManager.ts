/**
 * LabelForge Print Queue & Batch Memory Manager
 * Manages industrial print spooling, streaming execution batches, and bounded history retention
 */

import { PrintJob, PrintJobState, PrinterProfile } from '../types/printer';
import { desktopPrintLabel, isDesktopApp } from './desktopBridge';

export const PRINT_BATCH_SIZE = 25;
export const MAX_QUEUE_RETENTION = 100;

export interface BatchPrintOptions {
  batchSize?: number;
  onProgress?: (processed: number, total: number, currentJob: PrintJob) => void;
  onJobComplete?: (job: PrintJob) => void;
}

export interface BatchPrintSummary {
  total: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  completedJobs: PrintJob[];
}

/**
 * Compacts completed or cancelled print jobs to free memory
 * Strips heavy payload previews and buffers once printed
 */
export function compactPrintJobs(jobs: PrintJob[], maxRetain = MAX_QUEUE_RETENTION): PrintJob[] {
  // Retain only latest maxRetain jobs
  const sliced = jobs.slice(-maxRetain);

  return sliced.map((job, idx) => {
    // If completed or cancelled and not in the most recent 10 jobs, compact payload
    if ((job.status === 'COMPLETED' || job.status === 'CANCELLED') && idx < sliced.length - 10) {
      if (job.rawPayloadPreview && job.rawPayloadPreview.length > 200) {
        return {
          ...job,
          rawPayloadPreview: job.rawPayloadPreview.slice(0, 100) + '... [Buffer Released]'
        };
      }
    }
    return job;
  });
}

/**
 * Stream print jobs in chunks of PRINT_BATCH_SIZE to prevent browser / renderer heap exhaustion
 */
export async function executeBatchPrint(
  jobs: PrintJob[],
  printers: PrinterProfile[],
  options?: BatchPrintOptions
): Promise<BatchPrintSummary> {
  const batchSize = options?.batchSize || PRINT_BATCH_SIZE;
  const total = jobs.length;
  let succeeded = 0;
  let failed = 0;
  let cancelled = 0;
  const processedJobs: PrintJob[] = [];

  for (let i = 0; i < total; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);

    for (const job of batch) {
      if (job.status === 'CANCELLED') {
        cancelled++;
        processedJobs.push(job);
        continue;
      }

      const targetPrinter = printers.find(
        (p) => p.id === job.actualPrinterId || p.id === job.printerId
      ) || printers[0];

      options?.onProgress?.(processedJobs.length + 1, total, job);

      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

      if (isDesktopApp() && targetPrinter) {
        try {
          const res = await desktopPrintLabel({
            printerName: targetPrinter.systemPrinterName || targetPrinter.name,
            printerType: targetPrinter.language === 'TSPL' ? 'tspl' : 'zpl',
            copies: job.copies || 1,
            rawPayload: job.rawPayloadPreview || '',
            jobName: job.jobName || `Job-${job.id}`
          });

          if (res.success) {
            succeeded++;
            const completedJob: PrintJob = {
              ...job,
              status: 'COMPLETED',
              completedAt: timestamp,
              error: undefined
            };
            processedJobs.push(completedJob);
            options?.onJobComplete?.(completedJob);
          } else {
            failed++;
            const failedJob: PrintJob = {
              ...job,
              status: 'FAILED',
              error: res.error?.message || 'Print dispatch failed'
            };
            processedJobs.push(failedJob);
            options?.onJobComplete?.(failedJob);
          }
        } catch (err: any) {
          failed++;
          const failedJob: PrintJob = {
            ...job,
            status: 'FAILED',
            error: err.message || 'Unexpected spooler exception'
          };
          processedJobs.push(failedJob);
          options?.onJobComplete?.(failedJob);
        }
      } else {
        // Web / Sim fallback
        succeeded++;
        const completedJob: PrintJob = {
          ...job,
          status: 'COMPLETED',
          completedAt: timestamp,
          error: undefined
        };
        processedJobs.push(completedJob);
        options?.onJobComplete?.(completedJob);
      }
    }

    // Micro-delay between batches to yield thread and allow garbage collection
    await new Promise((resolve) => setTimeout(resolve, 15));
  }

  return {
    total,
    succeeded,
    failed,
    cancelled,
    completedJobs: processedJobs
  };
}

/**
 * Retries all failed jobs from a print queue
 */
export async function retryFailedPrintJobs(
  allJobs: PrintJob[],
  failedJobsToRetry: PrintJob[],
  printers: PrinterProfile[],
  onProgress?: (current: number, total: number) => void
): Promise<{ updatedJobs: PrintJob[]; succeeded: number; failed: number }> {
  const jobsToProcess = failedJobsToRetry.filter((j) => j.status === 'FAILED');
  if (jobsToProcess.length === 0) {
    return { updatedJobs: allJobs, succeeded: 0, failed: 0 };
  }

  const jobsMap = new Map<string, PrintJob>(allJobs.map((j) => [j.id, { ...j }]));
  let succeeded = 0;
  let failed = 0;

  for (let idx = 0; idx < jobsToProcess.length; idx++) {
    const job = jobsToProcess[idx];
    onProgress?.(idx + 1, jobsToProcess.length);

    const targetPrinter = printers.find(
      (p) => p.id === job.actualPrinterId || p.id === job.printerId
    ) || printers[0];

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    if (isDesktopApp() && targetPrinter) {
      try {
        const res = await desktopPrintLabel({
          printerName: targetPrinter.systemPrinterName || targetPrinter.name,
          printerType: targetPrinter.language === 'TSPL' ? 'tspl' : 'zpl',
          copies: job.copies || 1,
          rawPayload: job.rawPayloadPreview || '',
          jobName: `Retry-${job.jobNumber || job.id}`
        });

        if (res.success) {
          succeeded++;
          jobsMap.set(job.id, {
            ...job,
            status: 'COMPLETED',
            completedAt: timestamp,
            retryCount: (job.retryCount || 0) + 1,
            error: undefined
          });
        } else {
          failed++;
          jobsMap.set(job.id, {
            ...job,
            retryCount: (job.retryCount || 0) + 1,
            error: res.error?.message || 'Retry print failed'
          });
        }
      } catch (err: any) {
        failed++;
        jobsMap.set(job.id, {
          ...job,
          retryCount: (job.retryCount || 0) + 1,
          error: err.message || 'Retry print network error'
        });
      }
    } else {
      succeeded++;
      jobsMap.set(job.id, {
        ...job,
        status: 'COMPLETED',
        completedAt: timestamp,
        retryCount: (job.retryCount || 0) + 1,
        error: undefined
      });
    }

    // Micro-delay between retries
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  const updatedJobs = compactPrintJobs(Array.from(jobsMap.values()));
  return { updatedJobs, succeeded, failed };
}
