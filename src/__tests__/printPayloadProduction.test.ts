/**
 * LabelForge Production Security - Print Payload & Delivery State Machine Test Suite (P0-2)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { PrintPayloadStore } from '../../electron/services/printer/printPayloadStore';
import { PrintAttemptService } from '../../electron/services/printer/printAttemptService';
import { getRealJobPayload, PrintPayloadUnavailableError } from '../services/printQueueManager';
import { PrintPayloadIntegrityError } from '../../electron/security/errors';
import { PrintJob } from '../types/printer';

describe('P0-2: Deterministic Print Payload Lifecycle & State Semantics', () => {
  let payloadStore: PrintPayloadStore;
  let attemptService: PrintAttemptService;

  beforeEach(() => {
    payloadStore = new PrintPayloadStore();
    attemptService = new PrintAttemptService();
  });

  describe('Canonical Payload Store & Integrity', () => {
    it('stores canonical raw bytes and generates verified reference', () => {
      const rawZpl = '^XA^FO50,50^ADN,36,20^FDLabelForge Industrial ZPL^FS^XZ';
      const ref = payloadStore.store(rawZpl, 'test-payload-1');

      expect(ref.payloadId).toBe('test-payload-1');
      expect(ref.byteLength).toBe(Buffer.byteLength(rawZpl, 'utf-8'));
      expect(ref.sha256).toBe(crypto.createHash('sha256').update(rawZpl).digest('hex'));

      const verified = payloadStore.getVerified(ref, 'job-101');
      expect(verified.bytes.toString('utf-8')).toBe(rawZpl);
      expect(verified.byteLength).toBe(ref.byteLength);
      expect(verified.sha256).toBe(ref.sha256);
    });

    it('rejects tampered reference hash with PrintPayloadIntegrityError', () => {
      const rawZpl = '^XA^FDTest^FS^XZ';
      const ref = payloadStore.store(rawZpl, 'test-payload-2');

      const tamperedRef = {
        ...ref,
        sha256: '0000000000000000000000000000000000000000000000000000000000000000'
      };

      expect(() => {
        payloadStore.getVerified(tamperedRef, 'job-102');
      }).toThrow(PrintPayloadIntegrityError);
    });

    it('rejects tampered byte length with PrintPayloadIntegrityError', () => {
      const rawZpl = '^XA^FDTest^FS^XZ';
      const ref = payloadStore.store(rawZpl, 'test-payload-3');

      const tamperedRef = {
        ...ref,
        byteLength: ref.byteLength + 10
      };

      expect(() => {
        payloadStore.getVerified(tamperedRef, 'job-103');
      }).toThrow(PrintPayloadIntegrityError);
    });
  });

  describe('Elimination of Preview Fallback', () => {
    it('throws PrintPayloadUnavailableError when rawPayload is missing, refusing to fall back to preview', () => {
      const jobWithOnlyPreview: PrintJob = {
        id: 'job-preview-only',
        jobName: 'Visual Preview Only',
        templateName: 'Shipping Label',
        templateVersion: 1,
        printerId: 'p-1',
        printerName: 'Zebra ZT411',
        copies: 1,
        recordCount: 1,
        status: 'READY',
        createdAt: '10:00:00',
        outputLanguage: 'ZPL',
        rawPayloadPreview: '^XA^FDPreviewString^FS^XZ'
        // rawPayload is intentionally undefined
      };

      expect(() => {
        getRealJobPayload(jobWithOnlyPreview);
      }).toThrow(PrintPayloadUnavailableError);
    });

    it('returns exact canonical rawPayload when available', () => {
      const canonicalPayload = '^XA^FO10,10^FDREAL PAYLOAD^FS^XZ';
      const job: PrintJob = {
        id: 'job-real',
        jobName: 'Real Job',
        templateName: 'Shipping Label',
        templateVersion: 1,
        printerId: 'p-1',
        printerName: 'Zebra ZT411',
        copies: 1,
        recordCount: 1,
        status: 'QUEUED',
        createdAt: '10:00:00',
        outputLanguage: 'ZPL',
        rawPayload: canonicalPayload,
        rawPayloadPreview: '^XA^FDTruncatedPreview^FS^XZ'
      };

      expect(getRealJobPayload(job)).toBe(canonicalPayload);
    });
  });

  describe('Print Attempt Tracking & Retry Policy', () => {
    it('creates unique attempt IDs and tracks transmission lifecycle', () => {
      const attempt1 = attemptService.createAttempt('job-attempt-1', 'hash-1', 'Zebra ZT411', 'TCP_SOCKET');
      const attempt2 = attemptService.createAttempt('job-attempt-1', 'hash-1', 'Zebra ZT411', 'TCP_SOCKET');

      expect(attempt1.attemptId).not.toBe(attempt2.attemptId);
      expect(attempt1.attemptNumber).toBe(1);
      expect(attempt2.attemptNumber).toBe(2);
      expect(attempt1.state).toBe('INITIALIZED');
    });

    it('strictly forbids automated retries on STATUS_UNKNOWN to prevent duplicate barcode printing', () => {
      const attempt = attemptService.createAttempt('job-unknown-status', 'hash-99', 'Zebra ZT411', 'TCP_SOCKET');
      attemptService.updateState('job-unknown-status', attempt.attemptId, 'STATUS_UNKNOWN', {
        errorCode: 'ERR_CONNECTION_DROPPED',
        errorMessageSafe: 'Connection dropped mid-transmission'
      });

      const retryCheck = attemptService.isEligibleForAutoRetry('job-unknown-status');
      expect(retryCheck.eligible).toBe(false);
      expect(retryCheck.reason).toContain('duplicate');
    });

    it('strictly forbids automated retries on TRANSMITTED states', () => {
      const attempt = attemptService.createAttempt('job-transmitted', 'hash-100', 'Zebra ZT411', 'TCP_SOCKET');
      attemptService.updateState('job-transmitted', attempt.attemptId, 'TRANSMITTED', { bytesSent: 200 });

      const retryCheck = attemptService.isEligibleForAutoRetry('job-transmitted');
      expect(retryCheck.eligible).toBe(false);
    });

    it('permits automated retry only on FAILED_BEFORE_TRANSMISSION', () => {
      const attempt = attemptService.createAttempt('job-pre-fail', 'hash-101', 'Zebra ZT411', 'TCP_SOCKET');
      attemptService.updateState('job-pre-fail', attempt.attemptId, 'FAILED_BEFORE_TRANSMISSION', {
        errorCode: 'ERR_DNS_UNRESOLVABLE'
      });

      const retryCheck = attemptService.isEligibleForAutoRetry('job-pre-fail');
      expect(retryCheck.eligible).toBe(true);
    });
  });
});
