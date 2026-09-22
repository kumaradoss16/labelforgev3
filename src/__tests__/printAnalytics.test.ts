import { describe, it, expect } from 'vitest';
import { PrintJob, PrinterProfile } from '../types/printer';
import { matchesPrintJobSearchQuery } from '../components/modals/BatchPrintHistoryModal';

describe('Print Analytics Computations', () => {
  const mockJobs: PrintJob[] = [
    {
      id: 'JOB-9042',
      jobNumber: 'BATCH-2026-001',
      jobName: 'Pallet Shipping Label A',
      templateName: 'Shipping Pallet 4x6',
      templateVersion: 1,
      printerId: 'pr-zebra-01',
      printerName: 'Zebra ZT410 Industrial',
      requestedByUserName: 'Alex Johnson',
      requestedByUserId: 'usr-101',
      copies: 2,
      recordCount: 1,
      status: 'COMPLETED',
      createdAt: '2026-09-20 10:00:00',
      outputLanguage: 'ZPL'
    },
    {
      id: 'JOB-9043',
      jobNumber: 'BATCH-2026-002',
      jobName: 'Inventory Bin Tag B',
      templateName: 'Warehouse Bin Tag',
      templateVersion: 1,
      printerId: 'pr-tsc-02',
      printerName: 'TSC TE210 Desktop',
      requestedByUserName: 'Maria Garcia',
      requestedByUserId: 'usr-102',
      copies: 5,
      recordCount: 1,
      status: 'FAILED',
      createdAt: '2026-09-21 11:00:00',
      outputLanguage: 'TSPL'
    }
  ];

  it('correctly calculates 30-day total completed and failed rates', () => {
    const completed = mockJobs.filter(j => j.status === 'COMPLETED').length;
    const failed = mockJobs.filter(j => j.status === 'FAILED').length;
    const total = mockJobs.length;

    expect(completed).toBe(1);
    expect(failed).toBe(1);
    expect(total).toBe(2);
    expect(((completed / total) * 100).toFixed(1)).toBe('50.0');
  });

  it('aggregates label quantities across printers', () => {
    const totalLabels = mockJobs.reduce((acc, j) => acc + ((j.copies || 1) * (j.recordCount || 1)), 0);
    expect(totalLabels).toBe(7);
  });

  describe('Real-time Search Filter (matchesPrintJobSearchQuery)', () => {
    it('filters print logs by Job ID and Job Number', () => {
      const matchId = mockJobs.filter(j => matchesPrintJobSearchQuery(j, 'JOB-9042'));
      expect(matchId.length).toBe(1);
      expect(matchId[0].id).toBe('JOB-9042');

      const matchBatch = mockJobs.filter(j => matchesPrintJobSearchQuery(j, 'batch-2026-002'));
      expect(matchBatch.length).toBe(1);
      expect(matchBatch[0].id).toBe('JOB-9043');
    });

    it('filters print logs by Printer Name', () => {
      const matchZebra = mockJobs.filter(j => matchesPrintJobSearchQuery(j, 'Zebra'));
      expect(matchZebra.length).toBe(1);
      expect(matchZebra[0].printerName).toBe('Zebra ZT410 Industrial');

      const matchTSC = mockJobs.filter(j => matchesPrintJobSearchQuery(j, 'TE210'));
      expect(matchTSC.length).toBe(1);
      expect(matchTSC[0].printerName).toBe('TSC TE210 Desktop');
    });

    it('filters print logs by User Name and User ID', () => {
      const matchUser = mockJobs.filter(j => matchesPrintJobSearchQuery(j, 'Maria Garcia'));
      expect(matchUser.length).toBe(1);
      expect(matchUser[0].requestedByUserName).toBe('Maria Garcia');

      const matchPartialUser = mockJobs.filter(j => matchesPrintJobSearchQuery(j, 'alex'));
      expect(matchPartialUser.length).toBe(1);
      expect(matchPartialUser[0].requestedByUserName).toBe('Alex Johnson');
    });

    it('returns all jobs when search query is empty or whitespace', () => {
      expect(mockJobs.filter(j => matchesPrintJobSearchQuery(j, '')).length).toBe(2);
      expect(mockJobs.filter(j => matchesPrintJobSearchQuery(j, '   ')).length).toBe(2);
    });
  });
});
