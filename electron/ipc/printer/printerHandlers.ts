/**
 * LabelForge Desktop - Hardened Printer IPC Handlers
 * Enforces:
 * 1. Sender validation on every IPC message.
 * 2. Runtime Zod schema validation (no renderer identity trust).
 * 3. SessionManager authenticated principal requirement (fails closed).
 * 4. Canonical payload verification before transmission (preview is NEVER printed).
 * 5. Accurate industrial delivery status semantics (transmitted !== completed).
 * 6. PrintAttempt lifecycle tracking with auto-retry protection.
 */

import { ipcMain } from 'electron';
import crypto from 'node:crypto';
import { windowsPrinter } from '../../services/printer/windowsPrinter';
import { networkPrinter, validateNetworkDestination } from '../../services/printer/networkPrinter';
import { zplPrinter } from '../../services/printer/zplPrinter';
import { tsplPrinter } from '../../services/printer/tsplPrinter';
import { eplPrinter } from '../../services/printer/eplPrinter';
import { cpclPrinter } from '../../services/printer/cpclPrinter';
import { sbplPrinter } from '../../services/printer/sbplPrinter';
import { dplPrinter } from '../../services/printer/dplPrinter';
import { bartenderPrinter } from '../../services/printer/bartenderPrinter';
import { PrinterDefinition, PrintJobResponse } from '../../services/printer/printerAdapter';
import { auditService } from '../../services/system/auditService';
import { sessionManager } from '../../services/SessionManager';
import { getSessionPrincipal } from '../../utils/auth';
import { printPayloadStore } from '../../services/printer/printPayloadStore';
import { printAttemptService } from '../../services/printer/printAttemptService';
import { assertTrustedRenderer } from '../../security/senderValidation';
import { PrintCommandSchema, TestPrintCommandSchema } from '../../security/schemas';
import { checkPermission, PRIVILEGED_ACTIONS } from '../../config/permissions';
import { logger } from '../../utils/logger';

export function registerPrinterHandlers(): void {
  // Discover / List Available Printers
  ipcMain.handle('printer:list', async (event): Promise<PrinterDefinition[]> => {
    assertTrustedRenderer(event);
    logger.info('PrinterHandlers', 'Querying printers list');
    try {
      const winPrinters = await windowsPrinter.discover();
      const btPrinters = await bartenderPrinter.discover();
      return [...winPrinters, ...btPrinters];
    } catch (err: any) {
      logger.error('PrinterHandlers', `Failed to list printers: ${err.message}`);
      return [];
    }
  });

  // Get Default Printer
  ipcMain.handle('printer:default', async (event): Promise<PrinterDefinition | null> => {
    assertTrustedRenderer(event);
    const all = await windowsPrinter.discover();
    return all.find(p => p.isDefault) || all[0] || null;
  });

  // Print Label Request - Strict Hardened Boundary
  ipcMain.handle('printer:print', async (event, rawRequest: unknown): Promise<PrintJobResponse> => {
    assertTrustedRenderer(event);

    // 1. Runtime schema validation
    const request = PrintCommandSchema.parse(rawRequest);
    const jobId = request.jobId || `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    // 2. Main-Process Authenticated Principal (Never from renderer!)
    const principal = getSessionPrincipal();

    // 3. Authorization check
    if (!checkPermission(principal.role, PRIVILEGED_ACTIONS.PRINT)) {
      auditService.recordEvent({
        action: 'PRINT_JOB_REQUESTED',
        user: principal.userName,
        role: principal.role,
        resource: request.printerName,
        result: 'DENIED',
        details: { jobId, requiredPermission: PRIVILEGED_ACTIONS.PRINT },
        errorMessage: `User role '${principal.role}' is not authorized to print.`
      });

      return {
        success: false,
        jobId,
        error: {
          code: 'ERR_FORBIDDEN',
          message: `User role '${principal.role}' does not have permission to print.`
        }
      };
    }

    // 4. Centralized Network Destination Security Validation
    if (request.networkHost) {
      const netVal = validateNetworkDestination(request.networkHost, request.networkPort);
      if (!netVal.valid) {
        auditService.recordEvent({
          action: 'PRINT_JOB_REQUESTED',
          user: principal.userName,
          role: principal.role,
          resource: request.printerName,
          result: 'FAILURE',
          details: { jobId, networkHost: request.networkHost, networkPort: request.networkPort },
          errorMessage: netVal.error
        });

        return {
          success: false,
          jobId,
          error: {
            code: 'ERR_INVALID_NETWORK_DEST',
            message: netVal.error || 'Invalid network printer destination'
          }
        };
      }
    }

    // 5. Canonical Payload Verification (PREVIEW IS NEVER PRINTED)
    let payloadBytes: Buffer;
    let payloadHash: string;
    try {
      payloadBytes = printPayloadStore.verifyDirectPayload(request.rawPayload, request.payloadHash);
      payloadHash = crypto.createHash('sha256').update(payloadBytes).digest('hex');
    } catch (err: any) {
      auditService.recordEvent({
        action: 'PRINT_PAYLOAD_INTEGRITY',
        user: principal.userName,
        role: principal.role,
        resource: request.printerName,
        result: 'FAILURE',
        details: { jobId },
        errorMessage: err.message
      });

      return {
        success: false,
        jobId,
        error: {
          code: err.code || 'PRINT_PAYLOAD_ERROR',
          message: err.message
        }
      };
    }

    // 6. Print Attempt Tracking
    const transportType = request.networkHost
      ? 'TCP_SOCKET'
      : (request.printerType === 'bartender' ? 'BARTENDER_REST' : 'WINDOWS_SPOOLER');

    const attempt = printAttemptService.createAttempt(
      jobId,
      payloadHash,
      request.printerName,
      transportType
    );

    // 7. Dispatch to physical transport adapter
    try {
      printAttemptService.updateState(jobId, attempt.attemptId, 'TRANSMITTING');

      let result: PrintJobResponse;
      const type = (request.printerType || 'windows').toLowerCase();

      // Canonical payload wrapper for transport
      const internalRequest = {
        ...request,
        jobId,
        rawPayload: payloadBytes.toString('utf-8')
      };

      switch (type) {
        case 'network':
          result = await networkPrinter.print(internalRequest as any);
          break;
        case 'zpl':
          result = await zplPrinter.print(internalRequest as any);
          break;
        case 'tspl':
          result = await tsplPrinter.print(internalRequest as any);
          break;
        case 'epl':
          result = await eplPrinter.print(internalRequest as any);
          break;
        case 'cpcl':
          result = await cpclPrinter.print(internalRequest as any);
          break;
        case 'sbpl':
          result = await sbplPrinter.print(internalRequest as any);
          break;
        case 'dpl':
          result = await dplPrinter.print(internalRequest as any);
          break;
        case 'bartender':
          result = await bartenderPrinter.print(internalRequest as any);
          break;
        case 'windows':
        default:
          result = await windowsPrinter.print(internalRequest as any);
          break;
      }

      // 8. Accurate State Semantics:
      // TCP Transmission !== Physical Completion!
      if (result.success) {
        const finalAttemptState = transportType === 'TCP_SOCKET'
          ? 'TRANSMITTED'
          : (transportType === 'WINDOWS_SPOOLER' ? 'SPOOLER_ACCEPTED' : 'COMPLETED');

        printAttemptService.updateState(jobId, attempt.attemptId, finalAttemptState, {
          bytesSent: result.bytesWritten || payloadBytes.length
        });

        auditService.recordEvent({
          action: 'PRINT_JOB_DISPATCHED',
          user: principal.userName,
          role: principal.role,
          resource: request.printerName,
          result: 'SUCCESS',
          details: {
            jobId,
            attemptId: attempt.attemptId,
            printerType: request.printerType,
            copies: request.copies,
            payloadHash,
            bytesWritten: result.bytesWritten || payloadBytes.length,
            deliveryState: finalAttemptState
          }
        });
      } else {
        // Evaluate if transmission status is unknown
        const isUnknownState = result.error?.code === 'ERR_CONNECTION_DROPPED' ||
          result.error?.code === 'ERR_TIMEOUT_UNCERTAIN';
        const failState = isUnknownState ? 'STATUS_UNKNOWN' : 'FAILED_BEFORE_TRANSMISSION';

        printAttemptService.updateState(jobId, attempt.attemptId, failState, {
          errorCode: result.error?.code,
          errorMessageSafe: result.error?.message
        });

        auditService.recordEvent({
          action: 'PRINT_JOB_DISPATCHED',
          user: principal.userName,
          role: principal.role,
          resource: request.printerName,
          result: 'FAILURE',
          details: {
            jobId,
            attemptId: attempt.attemptId,
            deliveryState: failState,
            errorCode: result.error?.code
          },
          errorMessage: result.error?.message
        });
      }

      return {
        ...result,
        jobId
      };
    } catch (err: any) {
      logger.error('PrinterHandlers', `Unexpected error during print attempt [${attempt.attemptId}]: ${err.message}`);

      printAttemptService.updateState(jobId, attempt.attemptId, 'STATUS_UNKNOWN', {
        errorCode: 'ERR_UNEXPECTED_DISPATCH',
        errorMessageSafe: err.message
      });

      auditService.recordEvent({
        action: 'PRINT_JOB_DISPATCHED',
        user: principal.userName,
        role: principal.role,
        resource: request.printerName,
        result: 'FAILURE',
        details: { jobId, attemptId: attempt.attemptId, deliveryState: 'STATUS_UNKNOWN' },
        errorMessage: err.message
      });

      return {
        success: false,
        jobId,
        error: {
          code: 'ERR_PRINT_FAILED',
          message: err.message
        }
      };
    }
  });

  // Test Print - Strictly Authorized
  ipcMain.handle('printer:test', async (event, printerNameRaw: unknown, protocolRaw?: unknown): Promise<PrintJobResponse> => {
    assertTrustedRenderer(event);

    const validated = TestPrintCommandSchema.parse({
      printerName: printerNameRaw,
      protocol: protocolRaw || 'zpl'
    });

    const principal = getSessionPrincipal();

    if (!checkPermission(principal.role, PRIVILEGED_ACTIONS.TEST_PRINT)) {
      auditService.recordEvent({
        action: 'TEST_PRINT_DISPATCHED',
        user: principal.userName,
        role: principal.role,
        resource: validated.printerName,
        result: 'DENIED',
        errorMessage: `User role '${principal.role}' does not have permission for test prints.`
      });

      return {
        success: false,
        error: {
          code: 'ERR_FORBIDDEN',
          message: `User role '${principal.role}' does not have permission to run test prints.`
        }
      };
    }

    const proto = validated.protocol.toLowerCase();
    let res: PrintJobResponse;

    try {
      if (proto === 'tspl') {
        res = await tsplPrinter.testPrint(validated.printerName);
      } else if (proto === 'epl') {
        res = await eplPrinter.testPrint(validated.printerName);
      } else if (proto === 'cpcl') {
        res = await cpclPrinter.testPrint(validated.printerName);
      } else if (proto === 'sbpl') {
        res = await sbplPrinter.testPrint(validated.printerName);
      } else if (proto === 'dpl') {
        res = await dplPrinter.testPrint(validated.printerName);
      } else if (proto === 'bartender') {
        res = await bartenderPrinter.testPrint(validated.printerName);
      } else if (proto === 'spooler') {
        res = await windowsPrinter.testPrint(validated.printerName);
      } else {
        res = await zplPrinter.testPrint(validated.printerName);
      }

      auditService.recordEvent({
        action: 'TEST_PRINT_DISPATCHED',
        user: principal.userName,
        role: principal.role,
        resource: validated.printerName,
        result: res.success ? 'SUCCESS' : 'FAILURE',
        details: { protocol: validated.protocol },
        errorMessage: res.error?.message
      });

      return res;
    } catch (err: any) {
      auditService.recordEvent({
        action: 'TEST_PRINT_DISPATCHED',
        user: principal.userName,
        role: principal.role,
        resource: validated.printerName,
        result: 'FAILURE',
        errorMessage: err.message
      });

      return {
        success: false,
        error: {
          code: 'ERR_TEST_PRINT_FAILED',
          message: err.message
        }
      };
    }
  });
}
