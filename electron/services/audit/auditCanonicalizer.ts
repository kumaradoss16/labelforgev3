/**
 * LabelForge Desktop - Deterministic Audit Canonicalization
 * Enforces standardized deterministic byte serialization before cryptographic hashing,
 * preventing property reordering discrepancies across JSON engines.
 */

import crypto from 'node:crypto';

export interface CanonicalAuditPayload {
  sequenceNumber: number;
  segmentNumber: number;
  eventId: string;
  timestamp: string;
  sessionId: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  resource: string;
  result: string;
  metadataSafe: string;
  previousHash: string;
}

/**
 * Produces an exact canonical JSON string with strictly sorted keys and normalized values
 */
export function canonicalizeAuditPayload(payload: CanonicalAuditPayload): string {
  const sortedEntries: [string, any][] = [
    ['action', String(payload.action)],
    ['eventId', String(payload.eventId)],
    ['metadataSafe', String(payload.metadataSafe)],
    ['previousHash', String(payload.previousHash)],
    ['resource', String(payload.resource)],
    ['result', String(payload.result)],
    ['role', String(payload.role)],
    ['segmentNumber', Number(payload.segmentNumber)],
    ['sequenceNumber', Number(payload.sequenceNumber)],
    ['sessionId', String(payload.sessionId)],
    ['timestamp', String(payload.timestamp)],
    ['userId', String(payload.userId)],
    ['userName', String(payload.userName)]
  ];

  return JSON.stringify(Object.fromEntries(sortedEntries));
}

/**
 * Computes deterministic SHA-256 hash across canonical representation + previous hash
 */
export function computeCanonicalRecordHash(payload: CanonicalAuditPayload): string {
  const canonicalString = canonicalizeAuditPayload(payload);
  const dataToHash = `${canonicalString}:${payload.previousHash}`;
  return crypto.createHash('sha256').update(dataToHash, 'utf-8').digest('hex');
}
