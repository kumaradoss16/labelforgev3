/**
 * LabelForge Desktop - Canonical Print Payload Store & Integrity Engine
 * Guarantees that printer hardware ONLY receives verified canonical payloads,
 * completely segregating visual previews from transmission payloads.
 */

import crypto from 'node:crypto';
import { PrintPayloadUnavailableError, PrintPayloadIntegrityError } from '../../security/errors';
import { logger } from '../../utils/logger';

export interface PrintPayloadReference {
  payloadId: string;
  sha256: string;
  byteLength: number;
}

export interface CanonicalPrinterPayload {
  payloadId: string;
  bytes: Buffer;
  sha256: string;
  byteLength: number;
}

export class PrintPayloadStore {
  private inMemoryPayloads: Map<string, Buffer> = new Map();

  /**
   * Stores raw printer bytes and returns an immutable cryptographic payload reference
   */
  public store(payload: Buffer | string, customId?: string): PrintPayloadReference {
    const bytes = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf-8');
    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    const payloadId = customId || `payload-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

    this.inMemoryPayloads.set(payloadId, bytes);

    return {
      payloadId,
      sha256: hash,
      byteLength: bytes.length
    };
  }

  /**
   * Loads and cryptographically validates the canonical payload against its reference.
   * Throws PrintPayloadUnavailableError or PrintPayloadIntegrityError on any tampering or mismatch.
   */
  public getVerified(reference: PrintPayloadReference, jobId: string): CanonicalPrinterPayload {
    const bytes = this.inMemoryPayloads.get(reference.payloadId);

    if (!bytes) {
      logger.error('PrintPayloadStore', `Canonical payload '${reference.payloadId}' not found for job '${jobId}'`);
      throw new PrintPayloadUnavailableError(jobId);
    }

    // 1. Length verification
    if (bytes.length !== reference.byteLength) {
      logger.error('PrintPayloadStore', `Payload length mismatch for job '${jobId}'. Expected ${reference.byteLength}, got ${bytes.length}`);
      throw new PrintPayloadIntegrityError(jobId, `Byte length mismatch: expected ${reference.byteLength}, found ${bytes.length}`);
    }

    // 2. SHA-256 cryptographic recalculation
    const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
    const bufActual = Buffer.from(actualHash, 'hex');
    const bufExpected = Buffer.from(reference.sha256, 'hex');

    if (bufActual.length !== bufExpected.length || !crypto.timingSafeEqual(bufActual, bufExpected)) {
      logger.error('PrintPayloadStore', `Cryptographic hash mismatch for job '${jobId}'!`);
      throw new PrintPayloadIntegrityError(jobId, `SHA-256 mismatch. Claimed: ${reference.sha256}, Actual: ${actualHash}`);
    }

    return {
      payloadId: reference.payloadId,
      bytes,
      sha256: actualHash,
      byteLength: bytes.length
    };
  }

  /**
   * Helper to verify direct string/buffer payload on the fly
   */
  public verifyDirectPayload(payload: Buffer | string, expectedHash?: string): Buffer {
    const bytes = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf-8');
    if (bytes.length === 0) {
      throw new PrintPayloadUnavailableError('direct-dispatch');
    }

    if (expectedHash) {
      const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
      const bufActual = Buffer.from(actualHash, 'hex');
      const bufExpected = Buffer.from(expectedHash, 'hex');
      if (bufActual.length !== bufExpected.length || !crypto.timingSafeEqual(bufActual, bufExpected)) {
        throw new PrintPayloadIntegrityError('direct-dispatch', `SHA-256 hash mismatch: expected ${expectedHash}, computed ${actualHash}`);
      }
    }

    return bytes;
  }

  public evict(payloadId: string): void {
    this.inMemoryPayloads.delete(payloadId);
  }
}

export const printPayloadStore = new PrintPayloadStore();
