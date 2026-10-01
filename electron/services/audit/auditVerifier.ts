/**
 * LabelForge Desktop - Independent Audit Verification Engine
 * Validates sequence monotonicity, cryptographic hash chains, segment continuity,
 * and Ed25519 digital signatures. Detects deletions, tampering, and gaps.
 */

import crypto from 'node:crypto';
import { StoredAuditRecord, AuditSegment } from './auditDatabase';
import { computeCanonicalRecordHash } from './auditCanonicalizer';
import { AuditExportBundle, AuditSigner } from './auditSigner';

export interface AuditVerificationResult {
  isValid: boolean;
  code: 'VALID' | 'HASH_MISMATCH' | 'SEQUENCE_GAP' | 'PREVIOUS_HASH_MISMATCH' | 'SEGMENT_CHAIN_BROKEN' | 'SIGNATURE_INVALID' | 'EMPTY_LOG';
  sequenceNumber?: number;
  message: string;
  totalRecordsChecked: number;
  totalSegmentsChecked: number;
}

export class AuditVerifier {
  /**
   * Verifies an in-memory or database-extracted sequence of audit records and segments
   */
  public static verifyChain(
    records: StoredAuditRecord[],
    segments: AuditSegment[] = []
  ): AuditVerificationResult {
    if (!records || records.length === 0) {
      return {
        isValid: true,
        code: 'VALID',
        message: 'Audit log is empty (genesis state)',
        totalRecordsChecked: 0,
        totalSegmentsChecked: segments.length
      };
    }

    let expectedPrevHash = 'genesis';
    let expectedSequence = records[0].sequenceNumber;

    for (let i = 0; i < records.length; i++) {
      const rec = records[i];

      // 1. Monotonic sequence check
      if (rec.sequenceNumber !== expectedSequence) {
        return {
          isValid: false,
          code: 'SEQUENCE_GAP',
          sequenceNumber: rec.sequenceNumber,
          message: `Sequence violation at index ${i}: expected #${expectedSequence}, got #${rec.sequenceNumber}`,
          totalRecordsChecked: i,
          totalSegmentsChecked: segments.length
        };
      }

      // 2. Chained previous hash check
      if (rec.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          code: 'PREVIOUS_HASH_MISMATCH',
          sequenceNumber: rec.sequenceNumber,
          message: `Hash-chain mismatch at sequence #${rec.sequenceNumber}. Expected previous "${expectedPrevHash}", found "${rec.previousHash}"`,
          totalRecordsChecked: i,
          totalSegmentsChecked: segments.length
        };
      }

      // 3. Recompute canonical hash
      const recomputedHash = computeCanonicalRecordHash(rec);
      const bufRecomputed = Buffer.from(recomputedHash, 'hex');
      const bufStored = Buffer.from(rec.recordHash, 'hex');

      if (bufRecomputed.length !== bufStored.length || !crypto.timingSafeEqual(bufRecomputed, bufStored)) {
        return {
          isValid: false,
          code: 'HASH_MISMATCH',
          sequenceNumber: rec.sequenceNumber,
          message: `Record hash tampering detected at sequence #${rec.sequenceNumber}. Recomputed: ${recomputedHash}, Stored: ${rec.recordHash}`,
          totalRecordsChecked: i,
          totalSegmentsChecked: segments.length
        };
      }

      expectedPrevHash = rec.recordHash;
      expectedSequence++;
    }

    // 4. Verify segment continuity if segments are provided
    for (let s = 1; s < segments.length; s++) {
      const prevSeg = segments[s - 1];
      const curSeg = segments[s];
      if (curSeg.previousSegmentHash !== prevSeg.lastRecordHash) {
        return {
          isValid: false,
          code: 'SEGMENT_CHAIN_BROKEN',
          message: `Segment continuity broken between segment ${prevSeg.segmentNumber} and ${curSeg.segmentNumber}. Expected "${prevSeg.lastRecordHash}", found "${curSeg.previousSegmentHash}"`,
          totalRecordsChecked: records.length,
          totalSegmentsChecked: segments.length
        };
      }
    }

    return {
      isValid: true,
      code: 'VALID',
      message: `Audit chain verified successfully (${records.length} records, ${segments.length} segments)`,
      totalRecordsChecked: records.length,
      totalSegmentsChecked: segments.length
    };
  }

  /**
   * Verifies an exported signed audit bundle
   */
  public static verifySignedBundle(bundle: AuditExportBundle): AuditVerificationResult {
    // 1. Verify digital signature
    const signatureValid = AuditSigner.verifyBundle(bundle);
    if (!signatureValid) {
      return {
        isValid: false,
        code: 'SIGNATURE_INVALID',
        message: 'Ed25519 digital signature verification failed for audit export package',
        totalRecordsChecked: 0,
        totalSegmentsChecked: 0
      };
    }

    // 2. Verify inner chain
    return AuditVerifier.verifyChain(bundle.records, bundle.segments);
  }
}
