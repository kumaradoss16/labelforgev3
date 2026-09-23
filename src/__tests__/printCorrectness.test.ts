import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveIPCPrinterType } from '../services/printerLanguageMapper';
import { compactPrintJobs, getRealJobPayload, executeBatchPrint, retryFailedPrintJobs } from '../services/printQueueManager';
import { PrintJob, PrinterProfile } from '../types/printer';
import * as desktopBridge from '../services/desktopBridge';

vi.mock('../services/desktopBridge', () => ({
  isDesktopApp: vi.fn(() => true),
  desktopPrintLabel: vi.fn(async (req) => ({
    success: true,
    jobId: 'mock-123',
    bytesWritten: req.rawPayload.length
  })),
  desktopTestPrint: vi.fn(async () => ({ success: true }))
}));

describe('Phase 2: Printing Correctness', () => {
  const samplePrinter: PrinterProfile = {
    id: 'p1',
    name: 'Zebra ZT410',
    model: 'ZT410',
    manufacturer: 'Zebra',
    dpi: 203,
    language: 'ZPL',
    connection: 'TCP/IP',
    address: '192.168.1.100:9100',
    status: 'Ready',
    supportsCutter: false,
    supportsPeeler: false,
    supportsRfid: false,
    darkness: 15,
    speed: 6,
    mediaType: 'gap'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('2.2 Canonical Printer Language & Protocol Routing', () => {
    it('correctly maps network connections to network printer type', () => {
      expect(resolveIPCPrinterType(samplePrinter)).toBe('network');
    });

    it('maps TSPL printers to tspl', () => {
      const tsplPrinter: PrinterProfile = { ...samplePrinter, connection: 'USB', language: 'TSPL' };
      expect(resolveIPCPrinterType(tsplPrinter)).toBe('tspl');
    });

    it('maps EPL printers to epl', () => {
      const eplPrinter: PrinterProfile = { ...samplePrinter, connection: 'USB', language: 'EPL' };
      expect(resolveIPCPrinterType(eplPrinter)).toBe('epl');
    });

    it('maps CPCL printers to cpcl', () => {
      const cpclPrinter: PrinterProfile = { ...samplePrinter, connection: 'USB', language: 'CPCL' };
      expect(resolveIPCPrinterType(cpclPrinter)).toBe('cpcl');
    });

    it('maps Windows-GDI to windows', () => {
      const gdiPrinter: PrinterProfile = { ...samplePrinter, connection: 'Windows Spooler', language: 'Windows-GDI' };
      expect(resolveIPCPrinterType(gdiPrinter)).toBe('windows');
    });
  });

  describe('2.1 Payload & Preview Separation', () => {
    const hugePayload = '^XA\n^FO50,50^A0N,50,50^FD' + 'X'.repeat(500) + '^FS\n^XZ';

    it('preserves full rawPayload even when rawPayloadPreview is compacted', () => {
      const job: PrintJob = {
        id: 'job-1',
        jobName: 'Large Job',
        templateName: 'Test Template',
        templateVersion: 1,
        printerId: 'p1',
        printerName: 'Zebra ZT410',
        copies: 1,
        recordCount: 1,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        outputLanguage: 'ZPL',
        rawPayload: hugePayload,
        rawPayloadPreview: hugePayload
      };

      // Create array with job in old position so compaction triggers
      const jobsList: PrintJob[] = Array.from({ length: 15 }, (_, i) => ({
        ...job,
        id: `job-${i}`,
        status: 'COMPLETED'
      }));

      const compacted = compactPrintJobs(jobsList, 100);
      const firstJob = compacted[0];

      // Preview should be compacted with [Buffer Released]
      expect(firstJob.rawPayloadPreview).toContain('[Buffer Released]');

      // Full rawPayload must be intact
      expect(getRealJobPayload(firstJob)).toBe(hugePayload);
    });
  });

  describe('2.3 & 2.6 Execution and Retry Dispatch', () => {
    const hugePayload = '^XA\n^FO50,50^FDTEST DISPATCH^FS\n^XZ';

    it('dispatches full raw payload during batch print and sets appropriate status', async () => {
      const job: PrintJob = {
        id: 'job-batch-1',
        jobName: 'Batch Job',
        templateName: 'Template 1',
        templateVersion: 1,
        printerId: 'p1',
        printerName: 'Zebra ZT410',
        copies: 1,
        recordCount: 1,
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
        outputLanguage: 'ZPL',
        rawPayload: hugePayload,
        rawPayloadPreview: hugePayload.slice(0, 100)
      };

      const summary = await executeBatchPrint([job], [samplePrinter]);

      expect(summary.succeeded).toBe(1);
      expect(desktopBridge.desktopPrintLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          rawPayload: hugePayload,
          printerType: 'network',
          networkHost: '192.168.1.100',
          networkPort: 9100
        })
      );

      // Network printer should transition to TRANSMITTED
      expect(summary.completedJobs[0].status).toBe('TRANSMITTED');
    });

    it('retries failed jobs using full raw payload', async () => {
      const failedJob: PrintJob = {
        id: 'job-failed-1',
        jobName: 'Failed Job',
        templateName: 'Template 1',
        templateVersion: 1,
        printerId: 'p1',
        printerName: 'Zebra ZT410',
        copies: 1,
        recordCount: 1,
        status: 'FAILED',
        createdAt: new Date().toISOString(),
        outputLanguage: 'ZPL',
        rawPayload: hugePayload,
        rawPayloadPreview: 'Truncated... [Buffer Released]'
      };

      const result = await retryFailedPrintJobs([failedJob], [failedJob], [samplePrinter]);

      expect(result.succeeded).toBe(1);
      expect(desktopBridge.desktopPrintLabel).toHaveBeenCalledWith(
        expect.objectContaining({
          rawPayload: hugePayload
        })
      );
    });
  });
});
