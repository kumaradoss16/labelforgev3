/**
 * LabelForge Desktop - Ed25519 Digital Signature Service for Audit Exports
 * Generates and verifies cryptographically signed audit compliance bundles.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { paths } from '../../config/paths';
import { logger } from '../../utils/logger';

export interface AuditExportBundle {
  exportId: string;
  exportedAt: string;
  segmentCount: number;
  recordCount: number;
  firstSequenceNumber: number;
  lastSequenceNumber: number;
  firstRecordHash: string;
  lastRecordHash: string;
  records: any[];
  segments: any[];
  signature?: string;
  publicKeyPem: string;
}

export class AuditSigner {
  private privateKeyPem: string = '';
  private publicKeyPem: string = '';

  constructor(keyDir?: string) {
    this.initKeys(keyDir);
  }

  private initKeys(customDir?: string): void {
    const dir = customDir || paths.getSettingsDir();
    const privPath = path.join(dir, 'audit-signer.priv.pem');
    const pubPath = path.join(dir, 'audit-signer.pub.pem');

    try {
      if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
        this.privateKeyPem = fs.readFileSync(privPath, 'utf-8');
        this.publicKeyPem = fs.readFileSync(pubPath, 'utf-8');
      } else {
        // Generate new Ed25519 keypair
        const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
        this.privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
        this.publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

        try {
          fs.writeFileSync(privPath, this.privateKeyPem, { mode: 0o600 });
          fs.writeFileSync(pubPath, this.publicKeyPem, { mode: 0o644 });
          logger.info('AuditSigner', 'Generated new Ed25519 audit signing keypair');
        } catch (err: any) {
          logger.warn('AuditSigner', `Could not persist signing keys to disk: ${err.message}`);
        }
      }
    } catch (err: any) {
      // Ephemeral fallback for test harnesses
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
      this.privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
      this.publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    }
  }

  public getPublicKeyPem(): string {
    return this.publicKeyPem;
  }

  /**
   * Signs audit bundle payload using Ed25519
   */
  public signBundle(bundle: Omit<AuditExportBundle, 'signature' | 'publicKeyPem'>): AuditExportBundle {
    const canonicalPayload = JSON.stringify({
      exportId: bundle.exportId,
      exportedAt: bundle.exportedAt,
      firstSequenceNumber: bundle.firstSequenceNumber,
      lastSequenceNumber: bundle.lastSequenceNumber,
      firstRecordHash: bundle.firstRecordHash,
      lastRecordHash: bundle.lastRecordHash,
      recordCount: bundle.recordCount,
      segmentCount: bundle.segmentCount
    });

    const signature = crypto.sign(null, Buffer.from(canonicalPayload, 'utf-8'), this.privateKeyPem).toString('hex');

    return {
      ...bundle,
      signature,
      publicKeyPem: this.publicKeyPem
    };
  }

  /**
   * Verifies digital signature of an exported audit bundle
   */
  public static verifyBundle(bundle: AuditExportBundle): boolean {
    if (!bundle.signature || !bundle.publicKeyPem) {
      return false;
    }

    try {
      const canonicalPayload = JSON.stringify({
        exportId: bundle.exportId,
        exportedAt: bundle.exportedAt,
        firstSequenceNumber: bundle.firstSequenceNumber,
        lastSequenceNumber: bundle.lastSequenceNumber,
        firstRecordHash: bundle.firstRecordHash,
        lastRecordHash: bundle.lastRecordHash,
        recordCount: bundle.recordCount,
        segmentCount: bundle.segmentCount
      });

      const signatureBuf = Buffer.from(bundle.signature, 'hex');
      return crypto.verify(null, Buffer.from(canonicalPayload, 'utf-8'), bundle.publicKeyPem, signatureBuf);
    } catch {
      return false;
    }
  }
}

export const auditSigner = new AuditSigner();
