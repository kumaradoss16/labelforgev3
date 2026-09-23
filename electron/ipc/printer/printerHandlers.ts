/**
 * LabelForge Desktop - Printer IPC Handlers
 * Validates requests and dispatches print jobs to Windows Spooler, RAW Sockets, or BarTender
 */

import { ipcMain } from 'electron';
import { windowsPrinter } from '../../services/printer/windowsPrinter';
import { networkPrinter, validateNetworkDestination } from '../../services/printer/networkPrinter';
import { zplPrinter } from '../../services/printer/zplPrinter';
import { tsplPrinter } from '../../services/printer/tsplPrinter';
import { eplPrinter } from '../../services/printer/eplPrinter';
import { cpclPrinter } from '../../services/printer/cpclPrinter';
import { sbplPrinter } from '../../services/printer/sbplPrinter';
import { dplPrinter } from '../../services/printer/dplPrinter';
import { bartenderPrinter } from '../../services/printer/bartenderPrinter';
import { PrintJobRequest, PrinterDefinition, PrintJobResponse } from '../../services/printer/printerAdapter';
import { validatePrintRequest } from '../../utils/validation';
import { auditService } from '../../services/system/auditService';
import { logger } from '../../utils/logger';

import { checkPermission, PRIVILEGED_ACTIONS } from '../../config/permissions';

export function registerPrinterHandlers(): void {
  // Discover / List Available Printers
  ipcMain.handle('printer:list', async (): Promise<PrinterDefinition[]> => {
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
  ipcMain.handle('printer:default', async (): Promise<PrinterDefinition | null> => {
    const all = await windowsPrinter.discover();
    return all.find(p => p.isDefault) || all[0] || null;
  });

  // Print Label Request
  ipcMain.handle('printer:print', async (_event, request: PrintJobRequest): Promise<PrintJobResponse> => {
    logger.info('PrinterHandlers', `Received print request for printer "${request.printerName}" (type: ${request.printerType})`);

    const identity = request.identity || { userId: 'default-op', userName: 'Default Operator', role: 'OPERATOR' };

    try {
      validatePrintRequest(request);

      if (!checkPermission(identity.role, PRIVILEGED_ACTIONS.PRINT)) {
        auditService.recordEvent({
          action: 'PRINT_JOB_REQUESTED',
          user: identity.userName,
          role: identity.role,
          resource: request.printerName || 'Unknown',
          result: 'DENIED',
          errorMessage: `ERR_FORBIDDEN: User does not have ${PRIVILEGED_ACTIONS.PRINT} permission.`
        });
        return {
          success: false,
          error: {
            code: 'ERR_FORBIDDEN',
            message: `User role '${identity.role}' does not have permission to print.`
          }
        };
      }

      if (request.networkHost) {
        const netVal = validateNetworkDestination(request.networkHost, request.networkPort);
        if (!netVal.valid) {
          auditService.recordEvent({
            action: 'PRINT_JOB_REQUESTED',
            user: identity.userName,
            role: identity.role,
            resource: request.printerName || 'Network Printer',
            result: 'FAILURE',
            errorMessage: netVal.error
          });
          return {
            success: false,
            error: {
              code: 'ERR_INVALID_NETWORK_DEST',
              message: netVal.error || 'Invalid network printer destination'
            }
          };
        }
      }

      let result: PrintJobResponse;
      const type = (request.printerType || 'windows').toLowerCase();

      switch (type) {
        case 'network':
          result = await networkPrinter.print(request);
          break;
        case 'zpl':
          result = await zplPrinter.print(request);
          break;
        case 'tspl':
          result = await tsplPrinter.print(request);
          break;
        case 'epl':
          result = await eplPrinter.print(request);
          break;
        case 'cpcl':
          result = await cpclPrinter.print(request);
          break;
        case 'sbpl':
          result = await sbplPrinter.print(request);
          break;
        case 'dpl':
          result = await dplPrinter.print(request);
          break;
        case 'bartender':
          result = await bartenderPrinter.print(request);
          break;
        case 'windows':
        default:
          result = await windowsPrinter.print(request);
          break;
      }

      auditService.recordEvent({
        action: 'PRINT_JOB_REQUESTED',
        user: identity.userName,
        role: identity.role,
        resource: request.printerName,
        result: result.success ? 'SUCCESS' : 'FAILURE',
        details: {
          printerType: request.printerType,
          copies: request.copies || 1,
          jobId: result.jobId,
          bytesWritten: result.bytesWritten
        },
        errorMessage: result.error?.message
      });

      return result;
    } catch (err: any) {
      logger.error('PrinterHandlers', `Print job dispatch error: ${err.message}`);
      auditService.recordEvent({
        action: 'PRINT_JOB_REQUESTED',
        user: identity.userName,
        role: identity.role,
        resource: request.printerName || 'Unknown',
        result: 'FAILURE',
        errorMessage: err.message
      });
      return {
        success: false,
        error: {
          code: 'ERR_PRINT_FAILED',
          message: err.message
        }
      };
    }
  });

  // Test Print
  ipcMain.handle('printer:test', async (_event, printerName: string, protocol: string = 'zpl', identityArg?: any): Promise<PrintJobResponse> => {
    logger.info('PrinterHandlers', `Test print triggered for ${printerName} with protocol ${protocol}`);
    
    const identity = identityArg || { userId: 'default-op', userName: 'Default Operator', role: 'OPERATOR' };

    try {
      if (!checkPermission(identity.role, PRIVILEGED_ACTIONS.TEST_PRINT)) {
        auditService.recordEvent({
          action: 'TEST_PRINT_DISPATCHED',
          user: identity.userName,
          role: identity.role,
          resource: printerName || 'Unknown',
          result: 'DENIED',
          errorMessage: `ERR_FORBIDDEN: User does not have ${PRIVILEGED_ACTIONS.TEST_PRINT} permission.`
        });
        return {
          success: false,
          error: {
            code: 'ERR_FORBIDDEN',
            message: `User role '${identity.role}' does not have permission to run test prints.`
          }
        };
      }

      const proto = protocol.toLowerCase();
      let res: PrintJobResponse;

      if (proto === 'tspl') {
        res = await tsplPrinter.testPrint(printerName);
      } else if (proto === 'epl') {
        res = await eplPrinter.testPrint(printerName);
      } else if (proto === 'cpcl') {
        res = await cpclPrinter.testPrint(printerName);
      } else if (proto === 'sbpl') {
        res = await sbplPrinter.testPrint(printerName);
      } else if (proto === 'dpl') {
        res = await dplPrinter.testPrint(printerName);
      } else if (proto === 'bartender') {
        res = await bartenderPrinter.testPrint(printerName);
      } else if (proto === 'spooler') {
        res = await windowsPrinter.testPrint(printerName);
      } else {
        res = await zplPrinter.testPrint(printerName);
      }

      auditService.recordEvent({
        action: 'TEST_PRINT_DISPATCHED',
        user: identity.userName,
        role: identity.role,
        resource: printerName,
        result: res.success ? 'SUCCESS' : 'FAILURE',
        details: { protocol },
        errorMessage: res.error?.message
      });

      return res;
    } catch (err: any) {
      logger.error('PrinterHandlers', `Test print failed: ${err.message}`);
      auditService.recordEvent({
        action: 'TEST_PRINT_DISPATCHED',
        user: identity.userName,
        role: identity.role,
        resource: printerName,
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
