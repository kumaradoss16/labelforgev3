/**
 * LabelForge Desktop - Windows RAW Spooler Native Service
 * Sends raw thermal commands (ZPL, TSPL, EPL, CPCL, SBPL, DPL) directly to Windows Spooler queue via winspool.drv RAW datatype
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { paths } from '../../config/paths';
import { logger } from '../../utils/logger';

const execFileAsync = promisify(execFile);

export interface RawPrintResult {
  success: boolean;
  jobId?: string;
  printerName: string;
  bytesWritten: number;
  errorCode?: string;
  errorMessage?: string;
}

export class WindowsRawSpoolerService {
  private spoolDir: string;

  constructor() {
    this.spoolDir = path.join(paths.getAppDataDir(), 'spool');
    if (!fs.existsSync(this.spoolDir)) {
      try {
        fs.mkdirSync(this.spoolDir, { recursive: true });
      } catch (err: any) {
        logger.warn('WindowsRawSpoolerService', `Could not create spool directory: ${err.message}`);
      }
    }
  }

  /**
   * Dispatches raw command payload directly to Windows Print Spooler with RAW datatype
   */
  public async printRaw(
    printerName: string,
    payload: Buffer | string,
    jobName: string = 'LabelForge RAW Thermal Job'
  ): Promise<RawPrintResult> {
    if (!printerName || typeof printerName !== 'string') {
      return {
        success: false,
        printerName: printerName || 'Unknown',
        bytesWritten: 0,
        errorCode: 'ERR_INVALID_PRINTER',
        errorMessage: 'Printer name must be a valid non-empty string'
      };
    }

    const bufferPayload = Buffer.isBuffer(payload) ? payload : Buffer.from(payload || '', 'utf-8');

    if (bufferPayload.length === 0) {
      return {
        success: false,
        printerName,
        bytesWritten: 0,
        errorCode: 'ERR_EMPTY_PAYLOAD',
        errorMessage: 'RAW printer payload is empty'
      };
    }

    const jobId = `raw-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const tempPrnFile = path.join(this.spoolDir, `${jobId}.prn`);

    logger.info('WindowsRawSpoolerService', `Dispatching ${bufferPayload.length} RAW bytes to printer "${printerName}" [Job ID: ${jobId}]`);

    // Write payload to temporary PRN spool file
    try {
      fs.writeFileSync(tempPrnFile, bufferPayload);
    } catch (err: any) {
      logger.error('WindowsRawSpoolerService', `Failed to write spool file: ${err.message}`);
      return {
        success: false,
        printerName,
        bytesWritten: 0,
        errorCode: 'ERR_SPOOL_FILE_WRITE',
        errorMessage: `Failed to write raw spool file: ${err.message}`
      };
    }

    // Windows Native RAW Spooler Dispatch via PowerShell Win32 P/Invoke
    if (process.platform === 'win32') {
      try {
        const psScript = `
$ErrorActionPreference = 'Stop'
$printer = ${JSON.stringify(printerName)}
$filePath = ${JSON.stringify(tempPrnFile)}
$docTitle = ${JSON.stringify(jobName)}

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendFileToPrinter(string szPrinterName, string fileName, string docName) {
        byte[] bytes = File.ReadAllBytes(fileName);
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = docName;
        di.pDataType = "RAW";
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    int dwWritten = 0;
                    bool success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                    EndDocPrinter(hPrinter);
                    ClosePrinter(hPrinter);
                    return success;
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return false;
    }
}
"@

Add-Type -TypeDefinition $code
$res = [RawPrinterHelper]::SendFileToPrinter($printer, $filePath, $docTitle)
if ($res) {
    Write-Output "SUCCESS"
} else {
    Write-Error "RAW_PRINT_FAILED"
}
`;

        const psFile = path.join(this.spoolDir, `${jobId}.ps1`);
        fs.writeFileSync(psFile, psScript, 'utf-8');

        try {
          const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psFile], {
            timeout: 10000
          });

          // Cleanup temp files
          this.safeUnlink(psFile);
          this.safeUnlink(tempPrnFile);

          if (stdout.includes('SUCCESS')) {
            logger.info('WindowsRawSpoolerService', `Raw spool job ${jobId} successfully sent to ${printerName}`);
            return {
              success: true,
              jobId,
              printerName,
              bytesWritten: bufferPayload.length
            };
          } else {
            throw new Error(`Spooler rejected job`);
          }
        } catch (execErr: any) {
          this.safeUnlink(tempPrnFile);
          logger.error('WindowsRawSpoolerService', `PowerShell raw print failed: ${execErr.message}`);
          return {
            success: false,
            printerName,
            bytesWritten: 0,
            errorCode: 'ERR_RAW_SPOOLER_FAILED',
            errorMessage: `Windows RAW spooler error: ${execErr.stderr || execErr.message}`
          };
        }
      } catch (err: any) {
        this.safeUnlink(tempPrnFile);
        return {
          success: false,
          printerName,
          bytesWritten: 0,
          errorCode: 'ERR_WIN32_SPOOLER',
          errorMessage: err.message
        };
      }
    } else {
      // Non-Windows simulation / development fallback
      logger.info('WindowsRawSpoolerService', `[Non-Windows OS] Simulated sending ${bufferPayload.length} bytes to ${printerName}`);
      this.safeUnlink(tempPrnFile);
      return {
        success: true,
        jobId,
        printerName,
        bytesWritten: bufferPayload.length
      };
    }
  }

  private safeUnlink(filePath: string) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  }
}

export const windowsRawSpooler = new WindowsRawSpoolerService();
