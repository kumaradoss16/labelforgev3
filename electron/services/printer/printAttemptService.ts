/**
 * LabelForge Desktop - Print Attempt & Transmission State Machine
 * Accurately tracks industrial print delivery lifecycle.
 * Enforces rule: "Data successfully sent" !== "Label successfully printed".
 * Forbids automatic retries of unknown or in-flight transmission states.
 */

import crypto from 'node:crypto';
import { logger } from '../../utils/logger';

export type PrintAttemptState =
  | 'INITIALIZED'
  | 'FAILED_BEFORE_TRANSMISSION'
  | 'TRANSMITTING'
  | 'TRANSMITTED'
  | 'SPOOLER_ACCEPTED'
  | 'STATUS_UNKNOWN'
  | 'PRINTING'
  | 'COMPLETED'
  | 'FAILED';

export interface PrintAttempt {
  attemptId: string;
  jobId: string;
  attemptNumber: number;
  payloadHash: string;
  printerId: string;
  startedAt: string;
  finishedAt?: string;
  state: PrintAttemptState;
  transport: 'TCP_SOCKET' | 'WINDOWS_SPOOLER' | 'BARTENDER_REST' | 'SIMULATOR';
  bytesSent: number;
  errorCode?: string;
  errorMessageSafe?: string;
}

export class PrintAttemptService {
  private attempts: Map<string, PrintAttempt[]> = new Map();

  public createAttempt(
    jobId: string,
    payloadHash: string,
    printerId: string,
    transport: 'TCP_SOCKET' | 'WINDOWS_SPOOLER' | 'BARTENDER_REST' | 'SIMULATOR'
  ): PrintAttempt {
    const existing = this.attempts.get(jobId) || [];
    const attemptNumber = existing.length + 1;
    const attemptId = `attempt-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;

    const attempt: PrintAttempt = {
      attemptId,
      jobId,
      attemptNumber,
      payloadHash,
      printerId,
      startedAt: new Date().toISOString(),
      state: 'INITIALIZED',
      transport,
      bytesSent: 0
    };

    existing.push(attempt);
    this.attempts.set(jobId, existing);

    logger.info('PrintAttemptService', `Created attempt #${attemptNumber} [${attemptId}] for job '${jobId}' via ${transport}`);
    return attempt;
  }

  public updateState(
    jobId: string,
    attemptId: string,
    state: PrintAttemptState,
    details?: {
      bytesSent?: number;
      errorCode?: string;
      errorMessageSafe?: string;
    }
  ): PrintAttempt | null {
    const existing = this.attempts.get(jobId);
    if (!existing) return null;

    const attempt = existing.find(a => a.attemptId === attemptId);
    if (!attempt) return null;

    attempt.state = state;
    if (details?.bytesSent !== undefined) attempt.bytesSent = details.bytesSent;
    if (details?.errorCode) attempt.errorCode = details.errorCode;
    if (details?.errorMessageSafe) attempt.errorMessageSafe = details.errorMessageSafe;
    if (state === 'COMPLETED' || state === 'FAILED' || state === 'STATUS_UNKNOWN' || state === 'TRANSMITTED') {
      attempt.finishedAt = new Date().toISOString();
    }

    logger.info('PrintAttemptService', `Attempt [${attemptId}] updated to '${state}'`);
    return attempt;
  }

  /**
   * Evaluates if a job is eligible for safe automatic retry.
   * STRICT INDUSTRIAL RULE:
   * Only FAILED_BEFORE_TRANSMISSION may be automatically retried.
   * If state is STATUS_UNKNOWN, TRANSMITTED, SPOOLER_ACCEPTED, or PRINTING,
   * automatic retry is strictly FORBIDDEN to avoid physical duplicate label output.
   */
  public isEligibleForAutoRetry(jobId: string): { eligible: boolean; reason: string } {
    const existing = this.attempts.get(jobId);
    if (!existing || existing.length === 0) {
      return { eligible: true, reason: 'No prior transmission attempts recorded' };
    }

    const latest = existing[existing.length - 1];

    if (latest.state === 'FAILED_BEFORE_TRANSMISSION') {
      return { eligible: true, reason: 'Failed before any bytes were transmitted to hardware' };
    }

    if (latest.state === 'STATUS_UNKNOWN') {
      return {
        eligible: false,
        reason: 'Transmission status is unknown; bytes may have reached print engine. Automatic retry blocked to prevent duplicate printing.'
      };
    }

    if (latest.state === 'TRANSMITTED' || latest.state === 'SPOOLER_ACCEPTED') {
      return {
        eligible: false,
        reason: 'Payload was successfully handed off to printer transport. Re-transmission blocked.'
      };
    }

    return {
      eligible: false,
      reason: `Current attempt state '${latest.state}' prohibits automatic retry`
    };
  }

  public getAttempts(jobId: string): PrintAttempt[] {
    return this.attempts.get(jobId) || [];
  }
}

export const printAttemptService = new PrintAttemptService();
