/**
 * Phase 4 — Master Test Suite
 * Covers requirements 37 through 44:
 * 37. Unit tests
 * 38. Integration tests
 * 39. Security tests
 * 40. Printer golden-output tests
 * 41. IPC tests
 * 42. Fuzz/malformed project tests
 * 43. Crash recovery tests
 * 44. Network security tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Services & Utilities
import { calculateGS1Modulo10 } from '../services/barcodeEngine';
import { parseCsvText, evaluateExpression } from '../services/dataBinding';
import { computeIntelligentSnap } from '../services/intelligentSnapEngine';
import { createLForgePackage, parseAndValidateLForgePackage } from '../services/lforgePackage';
import { generateZplFromDocument } from '../services/zplGenerator';
import { generateTsplFromDocument } from '../services/tsplGenerator';
import { generateEplFromDocument } from '../services/eplGenerator';
import { generateCpclFromDocument } from '../services/cpclGenerator';
import { generateSbplFromDocument } from '../services/sbplGenerator';
import { generateDplFromDocument } from '../services/dplGenerator';
import { generatePrinterCode, UnsupportedPrinterLanguageError } from '../services/printerCodeGenerator';
import { validateFilePath, validatePrintRequest } from '../../electron/utils/validation';
import { validateNetworkDestination } from '../../electron/services/printer/networkPrinter';
import { windowsRawSpooler } from '../../electron/services/printer/windowsRawSpooler';
import { AuditService } from '../../electron/services/system/auditService';
import { PrintQueueService } from '../../electron/services/printer/PrintQueueService';
import { isDesktopApp, desktopPrintLabel } from '../services/desktopBridge';
import { LabelDocument } from '../types/label';
import { PrintJob } from '../types/printer';

// Canonical Fixture Document for Golden Output and Integration Tests
const canonicalDocument: LabelDocument = {
  id: 'doc-golden-001',
  schemaVersion: '2.0.0',
  name: 'Standard Logistics Label',
  author: 'QA Automation',
  created: '2026-09-30T00:00:00.000Z',
  modified: '2026-09-30T00:00:00.000Z',
  metadata: { version: 1, status: 'published' },
  dimensions: {
    width: 101.6,
    height: 152.4,
    unit: 'mm',
    dpi: 203,
    orientation: 'portrait',
    marginLeft: 0,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0
  },
  objects: [
    {
      id: 'hdr-1',
      type: 'text',
      name: 'Shipping Header',
      x: 10,
      y: 10,
      width: 80,
      height: 15,
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 1,
      text: 'EXPRESS COURIER',
      style: { fontFamily: 'Arial', fontSize: 14, fontWeight: 'bold' }
    },
    {
      id: 'bar-1',
      type: 'barcode',
      name: 'Tracking Code',
      x: 10,
      y: 35,
      width: 80,
      height: 30,
      rotation: 0,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: 2,
      value: 'TRK9876543210',
      barcodeStyle: {
        symbology: 'code128',
        humanReadable: true,
        humanReadableFont: 'Arial',
        humanReadableSize: 10,
        humanReadablePosition: 'bottom',
        moduleWidth: 0.3,
        quietZone: true,
        quietZoneSize: 3,
        color: '#000000',
        backgroundColor: '#ffffff'
      }
    }
  ]
};

describe('PHASE 4 — TESTING (Items 37 - 44)', () => {

  // --------------------------------------------------------------------------
  // 37. UNIT TESTS
  // --------------------------------------------------------------------------
  describe('37. Unit Tests', () => {
    it('calculates GS1 Modulo-10 checksum accurately', () => {
      // Standard GS1 SSCC & GTIN check digits
      expect(calculateGS1Modulo10('590123412345')).toBe(7);
      expect(calculateGS1Modulo10('0012345678901234567')).toBe(5);
      expect(calculateGS1Modulo10('00000000000')).toBe(0);
    });

    it('evaluates dynamic template expressions with database records and date tokens', () => {
      const record = { id: 1, SKU: 'SKU-7788', WEIGHT: '4.5' };
      expect(evaluateExpression('{{SKU}}', record)).toBe('SKU-7788');
      expect(evaluateExpression('Gross: {{WEIGHT}} kg', record)).toBe('Gross: 4.5 kg');
      expect(evaluateExpression('{{TODAY}}', record)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('computes snap guidelines and magnetic attraction thresholds', () => {
      const snapResult = computeIntelligentSnap({
        draggedObj: { id: 'moving-box', x: 20.3, y: 30, width: 40, height: 20 } as any,
        otherObjects: [{ id: 'anchor-box', x: 20.0, y: 70, width: 40, height: 20, visible: true } as any],
        canvasWidthMm: 100,
        canvasHeightMm: 150,
        thresholdMm: 1.0,
        enabled: true
      });

      expect(snapResult.hasSnappedX).toBe(true);
      expect(snapResult.x).toBe(20.0);
    });
  });

  // --------------------------------------------------------------------------
  // 38. INTEGRATION TESTS
  // --------------------------------------------------------------------------
  describe('38. Integration Tests', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labelforge-integ-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('executes full round-trip: Package -> Serialize -> Disk Write -> Verify Checksum', () => {
      const pkg = createLForgePackage(canonicalDocument);
      const filePath = path.join(tempDir, 'shipping_label.lforge');
      const serialized = JSON.stringify(pkg, null, 2);

      fs.writeFileSync(filePath, serialized, 'utf-8');
      expect(fs.existsSync(filePath)).toBe(true);

      const diskData = fs.readFileSync(filePath, 'utf-8');
      const validation = parseAndValidateLForgePackage(diskData);

      expect(validation.success).toBe(true);
      expect(validation.document?.id).toBe(canonicalDocument.id);
      expect(validation.document?.objects.length).toBe(2);
      expect(validation.package?.manifest.checksum).toBe(pkg.manifest.checksum);
    });

    it('integrates CSV data binding stream into multi-record batch generation', () => {
      const csvContent = `SKU,Qty,Location\nPROD-A,10,Aisle-1\nPROD-B,25,Aisle-4\nPROD-C,5,Dock-B`;
      const parsedCsv = parseCsvText(csvContent);

      expect(parsedCsv.records.length).toBe(3);
      expect(parsedCsv.fields).toEqual(['SKU', 'Qty', 'Location']);

      // Bind each record to expression
      const renderedCodes = parsedCsv.records.map(rec => {
        return evaluateExpression('{{SKU}}-{{Location}}', rec);
      });

      expect(renderedCodes).toEqual([
        'PROD-A-Aisle-1',
        'PROD-B-Aisle-4',
        'PROD-C-Dock-B'
      ]);
    });
  });

  // --------------------------------------------------------------------------
  // 39. SECURITY TESTS
  // --------------------------------------------------------------------------
  describe('39. Security Tests', () => {
    let tempDir: string;
    let auditFilePath: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labelforge-sec-'));
      auditFilePath = path.join(tempDir, 'audit.jsonl');
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('enforces strict path containment preventing directory traversal', () => {
      const sandboxRoots = [path.resolve(tempDir)];
      const escapePath = path.resolve(tempDir, '../../etc/passwd');

      expect(() => {
        validateFilePath(escapePath, ['.lforge'], sandboxRoots);
      }).toThrow(/outside permitted directories/);
    });

    it('detects cryptographic tamper in audit log hash chain', () => {
      const audit = new AuditService(auditFilePath);
      audit.recordEvent({
        action: 'USER_LOGIN',
        user: 'alice',
        role: 'ADMIN',
        resource: 'SYSTEM',
        details: { ip: '192.168.1.1' },
        result: 'SUCCESS'
      });
      audit.recordEvent({
        action: 'PRINT_JOB',
        user: 'bob',
        role: 'OPERATOR',
        resource: 'ZT411',
        details: { pages: 10 },
        result: 'SUCCESS'
      });

      expect(audit.verifyIntegrity().isValid).toBe(true);

      // Tamper with first line on disk
      const lines = fs.readFileSync(auditFilePath, 'utf-8').trim().split('\n');
      const tamperedEntry = JSON.parse(lines[0]);
      tamperedEntry.user = 'MALICIOUS_ATTACKER';
      lines[0] = JSON.stringify(tamperedEntry);
      fs.writeFileSync(auditFilePath, lines.join('\n') + '\n', 'utf-8');

      expect(audit.verifyIntegrity().isValid).toBe(false);
    });

    it('rejects command injection patterns in Windows Raw Spooler printer names', async () => {
      const injectionAttempt1 = await windowsRawSpooler.printRaw('Zebra; calc.exe', 'RAW_ZPL');
      expect(injectionAttempt1.success).toBe(false);
      expect(injectionAttempt1.errorCode).toBe('ERR_INVALID_PRINTER');

      const injectionAttempt2 = await windowsRawSpooler.printRaw('ZT411 & powershell -e ...', 'RAW_ZPL');
      expect(injectionAttempt2.success).toBe(false);
      expect(injectionAttempt2.errorCode).toBe('ERR_INVALID_PRINTER');
    });
  });

  // --------------------------------------------------------------------------
  // 40. PRINTER GOLDEN-OUTPUT TESTS
  // --------------------------------------------------------------------------
  describe('40. Printer Golden-Output Tests', () => {
    it('produces verified golden ZPL-II structure', () => {
      const zpl = generateZplFromDocument(canonicalDocument);
      expect(zpl).toContain('^XA');
      expect(zpl).toContain('^XZ');
      expect(zpl).toContain('^FO');
      expect(zpl).toContain('EXPRESS COURIER');
      expect(zpl).toContain('^BC');
      expect(zpl).toContain('TRK9876543210');
    });

    it('produces verified golden TSPL structure', () => {
      const tspl = generateTsplFromDocument(canonicalDocument);
      expect(tspl).toContain('SIZE');
      expect(tspl).toContain('CLS');
      expect(tspl).toContain('TEXT');
      expect(tspl).toContain('EXPRESS COURIER');
      expect(tspl).toContain('BARCODE');
      expect(tspl).toContain('PRINT');
    });

    it('produces verified golden EPL structure', () => {
      const epl = generateEplFromDocument(canonicalDocument);
      expect(epl).toContain('N');
      expect(epl).toContain('A');
      expect(epl).toContain('EXPRESS COURIER');
      expect(epl).toContain('B');
      expect(epl).toContain('P1');
    });

    it('produces verified golden CPCL structure', () => {
      const cpcl = generateCpclFromDocument(canonicalDocument);
      expect(cpcl.startsWith('!')).toBe(true);
      expect(cpcl).toContain('TEXT');
      expect(cpcl).toContain('BARCODE');
      expect(cpcl).toContain('PRINT');
    });

    it('produces verified golden SBPL structure', () => {
      const sbpl = generateSbplFromDocument(canonicalDocument);
      expect(sbpl).toContain('\x1BA');
      expect(sbpl).toContain('\x1BZ');
    });

    it('produces verified golden DPL structure', () => {
      const dpl = generateDplFromDocument(canonicalDocument);
      expect(dpl).toContain('\x01D');
      expect(dpl).toContain('\x02L');
    });

    it('generic printer code generator matches language dispatch', () => {
      const codeZpl = generatePrinterCode('ZPL', canonicalDocument);
      expect(codeZpl).toContain('^XA');

      const codeTspl = generatePrinterCode('TSPL', canonicalDocument);
      expect(codeTspl).toContain('SIZE');

      expect(() => generatePrinterCode('INVALID_LANG', canonicalDocument)).toThrow(UnsupportedPrinterLanguageError);
    });
  });

  // --------------------------------------------------------------------------
  // 41. IPC TESTS
  // --------------------------------------------------------------------------
  describe('41. IPC Tests', () => {
    it('desktopBridge operates in headless / fallback mode when window.electronAPI is absent', async () => {
      expect(isDesktopApp()).toBe(false);
      const res = await desktopPrintLabel({
        printerType: 'zpl',
        printerName: 'Zebra',
        rawPayload: '^XA^XZ'
      });
      expect(res.success).toBe(true);
    });

    it('validates IPC print request contracts rejecting invalid payloads', () => {
      expect(() => {
        validatePrintRequest({
          printerType: 'zpl',
          printerName: '', // empty name
          rawPayload: '^XA^XZ'
        });
      }).toThrow(/printerName/i);

      expect(() => {
        validatePrintRequest({
          printerName: 'ZT411',
          copies: -1 // invalid copy count
        });
      }).toThrow(/copy count/i);
    });
  });

  // --------------------------------------------------------------------------
  // 42. FUZZ / MALFORMED PROJECT TESTS
  // --------------------------------------------------------------------------
  describe('42. Fuzz / Malformed Project Tests', () => {
    it('gracefully rejects corrupted or random binary noise', () => {
      const noise = '\x00\xFF\xAA\x55RandomGarbagePayload';
      const result = parseAndValidateLForgePackage(noise);
      expect(result.success).toBe(false);
      expect(result.code).toBe('PARSE_ERROR');
    });

    it('rejects prototype pollution vectors injected into package manifest', () => {
      const maliciousJson = JSON.stringify({
        format: 'lforge',
        schemaVersion: 2,
        manifest: {
          checksum: 'sha256-0000000000000000000000000000000000000000000000000000000000000000',
          __proto__: { admin: true }
        },
        document: canonicalDocument
      });

      const res = parseAndValidateLForgePackage(maliciousJson);
      // Prototype on base Object must remain unaffected
      expect((Object.prototype as any).admin).toBeUndefined();
      expect(res.success).toBe(false); // Checksum mismatch
    });

    it('rejects negative, NaN, or non-numeric label dimensions', () => {
      const badDoc = JSON.parse(JSON.stringify(canonicalDocument));
      badDoc.dimensions.width = -100;

      const serialized = JSON.stringify({
        format: 'lforge',
        schemaVersion: 2,
        manifest: { checksum: 'legacy-import' },
        document: badDoc
      });

      const res = parseAndValidateLForgePackage(serialized);
      expect(res.success).toBe(false);
      expect(res.code).toBe('INVALID_DIMENSIONS');
    });

    it('detects tampered document payload when checksum does not match', () => {
      const pkg = createLForgePackage(canonicalDocument);
      pkg.document.name = 'UNAUTHORIZED TAMPERED NAME';
      const res = parseAndValidateLForgePackage(JSON.stringify(pkg));
      expect(res.success).toBe(false);
      expect(res.code).toBe('CHECKSUM_MISMATCH');
    });
  });

  // --------------------------------------------------------------------------
  // 43. CRASH RECOVERY TESTS
  // --------------------------------------------------------------------------
  describe('43. Crash Recovery Tests', () => {
    let tempDir: string;
    let queueFile: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labelforge-crash-'));
      queueFile = path.join(tempDir, 'print_queue.json');
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('restores pending print jobs after abrupt process restart', async () => {
      const persistedJobs: PrintJob[] = [
        {
          id: 'job-crash-99',
          jobName: 'Pallet Manifest 99',
          templateName: 'Standard',
          templateVersion: 1,
          printerId: 'p-1',
          printerName: 'Zebra ZT411',
          copies: 3,
          recordCount: 3,
          status: 'QUEUED',
          createdAt: new Date().toISOString(),
          outputLanguage: 'ZPL'
        }
      ];

      // Simulate state written to disk before crash
      fs.writeFileSync(queueFile, JSON.stringify(persistedJobs), 'utf-8');

      const restoredService = new PrintQueueService(queueFile);
      const queue = restoredService.getQueue();

      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe('job-crash-99');
      expect(queue[0].status).toBe('QUEUED');
    });

    it('handles truncated or corrupted queue file without crashing the runtime', () => {
      fs.writeFileSync(queueFile, '{"unfinished_json": [1, 2,', 'utf-8');
      const service = new PrintQueueService(queueFile);
      expect(service.getQueue()).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // 44. NETWORK SECURITY TESTS
  // --------------------------------------------------------------------------
  describe('44. Network Security Tests', () => {
    it('blocks localhost / loopback targets across notation variants', () => {
      expect(validateNetworkDestination('127.0.0.1', 9100).valid).toBe(false);
      expect(validateNetworkDestination('127.0.1.1', 9100).valid).toBe(false);
      expect(validateNetworkDestination('::1', 9100).valid).toBe(false);
      expect(validateNetworkDestination('[::1]', 9100).valid).toBe(false);
      expect(validateNetworkDestination('0x7f000001', 9100).valid).toBe(false);
      expect(validateNetworkDestination('2130706433', 9100).valid).toBe(false);
    });

    it('blocks cloud instance metadata endpoints', () => {
      expect(validateNetworkDestination('169.254.169.254', 9100).valid).toBe(false);
      expect(validateNetworkDestination('169.254.169.250', 9100).valid).toBe(false);
    });

    it('blocks out-of-range ports and non-numeric port attacks', () => {
      expect(validateNetworkDestination('192.168.1.50', 0).valid).toBe(false);
      expect(validateNetworkDestination('192.168.1.50', -1).valid).toBe(false);
      expect(validateNetworkDestination('192.168.1.50', 65536).valid).toBe(false);
      expect(validateNetworkDestination('192.168.1.50', 99999).valid).toBe(false);
    });

    it('permits authorized LAN printer endpoints', () => {
      expect(validateNetworkDestination('192.168.1.100', 9100).valid).toBe(true);
      expect(validateNetworkDestination('10.0.4.15', 9100).valid).toBe(true);
      expect(validateNetworkDestination('zebra-label-printer.local', 9100).valid).toBe(true);
    });
  });
});
