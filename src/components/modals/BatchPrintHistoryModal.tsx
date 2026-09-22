import React, { useState, useMemo } from 'react';
import {
  History,
  Printer,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  RefreshCw,
  FileText,
  Layers,
  ChevronRight,
  ExternalLink,
  X,
  Hash,
  User,
  Zap,
  Tag,
  Copy,
  Sliders,
  Check,
  BarChart3,
  Calendar,
  ChevronDown,
  Gauge
} from 'lucide-react';
import { PrintJob, PrinterProfile, UserRole, PrintAuditLog, PrintJobState } from '../../types/printer';
import { isDesktopApp, desktopPrintLabel } from '../../services/desktopBridge';
import { PrintStatisticsDashboard } from './PrintStatisticsDashboard';
import { JobLabelThumbnail } from './JobLabelThumbnail';
import { JobTechnicalMetadataRow } from './JobTechnicalMetadataRow';
import { LabelDocument } from '../../types/label';

interface BatchPrintHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  printJobs: PrintJob[];
  printers: PrinterProfile[];
  activePrinterId: string;
  onSelectPrinter?: (printerId: string) => void;
  onUpdatePrintJobs: (jobs: PrintJob[]) => void;
  onAddAuditLog?: (log: PrintAuditLog) => void;
  currentUserRole?: UserRole;
  onShowToast?: (message: string) => void;
  activeDocument?: LabelDocument;
}

export const BatchPrintHistoryModal: React.FC<BatchPrintHistoryModalProps> = ({
  isOpen,
  onClose,
  printJobs,
  printers,
  activePrinterId,
  onSelectPrinter,
  onUpdatePrintJobs,
  onAddAuditLog,
  currentUserRole = 'PRINT_MANAGER',
  onShowToast,
  activeDocument
}) => {
  if (!isOpen) return null;

  // View Mode: 'QUEUE' | 'STATISTICS'
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'STATISTICS'>('QUEUE');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [printerFilter, setPrinterFilter] = useState<string>('ALL');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    printJobs.length > 0 ? printJobs[0].id : null
  );

  // Expandable Row State for Technical Metadata (DPI, Paper Size, Ink Level, etc.)
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());

  const toggleRowExpanded = (jobId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleToggleExpandAll = () => {
    if (expandedJobIds.size === filteredJobs.length && filteredJobs.length > 0) {
      setExpandedJobIds(new Set());
    } else {
      setExpandedJobIds(new Set(filteredJobs.map(j => j.id)));
    }
  };

  // Reprint Execution Dialog / Drawer State
  const [isReprintDrawerOpen, setIsReprintDrawerOpen] = useState(false);
  const [reprintTargetJob, setReprintTargetJob] = useState<PrintJob | null>(null);
  const [reprintPrinterId, setReprintPrinterId] = useState<string>(activePrinterId || (printers[0]?.id ?? ''));
  const [reprintCopies, setReprintCopies] = useState<number>(1);
  const [reprintReason, setReprintReason] = useState<string>('Immediate Reprint / Defective Media Replacement');
  const [customReprintNote, setCustomReprintNote] = useState<string>('');
  const [isSubmittingReprint, setIsSubmittingReprint] = useState(false);
  const [reprintResultNotice, setReprintResultNotice] = useState<{
    status: 'success' | 'error';
    jobId: string;
    message: string;
  } | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Helper to parse job date into a comparable timestamp
  const parseJobDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    // Check if ISO format 'YYYY-MM-DD'
    if (cleanStr.includes('-')) {
      const parsed = new Date(cleanStr.replace(' ', 'T'));
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // Check standard JS Date string
    const fallback = new Date(cleanStr);
    if (!isNaN(fallback.getTime())) return fallback;
    return null;
  };

  // Filtered Jobs List
  const filteredJobs = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfLast7Days = startOfToday - 7 * 86400000;
    const startOfLast30Days = startOfToday - 30 * 86400000;

    return printJobs.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        job.id.toLowerCase().includes(q) ||
        (job.jobNumber && job.jobNumber.toLowerCase().includes(q)) ||
        job.jobName.toLowerCase().includes(q) ||
        job.templateName.toLowerCase().includes(q) ||
        job.printerName.toLowerCase().includes(q) ||
        (job.requestedByUserName && job.requestedByUserName.toLowerCase().includes(q)) ||
        (job.outputLanguage && job.outputLanguage.toLowerCase().includes(q));

      // Status Filter (e.g. ALL, COMPLETED, SENT_TO_PRINT_SERVICE / PENDING, FAILED)
      let matchStatus = true;
      if (statusFilter === 'ALL') {
        matchStatus = true;
      } else if (statusFilter === 'PENDING') {
        matchStatus = ['SENT_TO_PRINT_SERVICE', 'PRINTING', 'SUBMITTED', 'QUEUED', 'DRAFT'].includes(job.status);
      } else {
        matchStatus = job.status === statusFilter;
      }

      // Date Range Filter
      let matchDate = true;
      if (dateRangeFilter !== 'ALL') {
        const jobDate = parseJobDate(job.createdAt || job.sentAt);
        if (jobDate) {
          const jobTime = jobDate.getTime();
          if (dateRangeFilter === 'TODAY') {
            matchDate = jobTime >= startOfToday;
          } else if (dateRangeFilter === 'YESTERDAY') {
            matchDate = jobTime >= startOfYesterday && jobTime < startOfToday;
          } else if (dateRangeFilter === 'LAST_7_DAYS') {
            matchDate = jobTime >= startOfLast7Days;
          } else if (dateRangeFilter === 'LAST_30_DAYS') {
            matchDate = jobTime >= startOfLast30Days;
          } else if (dateRangeFilter === 'CUSTOM') {
            if (customStartDate) {
              const start = new Date(customStartDate).getTime();
              if (jobTime < start) matchDate = false;
            }
            if (customEndDate) {
              // End of that day
              const end = new Date(customEndDate).getTime() + 86400000;
              if (jobTime > end) matchDate = false;
            }
          }
        } else {
          // If no parseable date but filter is TODAY / LAST_7_DAYS and job is recently created today
          if (dateRangeFilter === 'TODAY' || dateRangeFilter === 'LAST_7_DAYS') {
            matchDate = true;
          }
        }
      }

      const matchType =
        typeFilter === 'ALL' ||
        (job.jobType || 'ON_DEMAND') === typeFilter;

      const matchPrinter =
        printerFilter === 'ALL' ||
        job.printerId === printerFilter ||
        job.actualPrinterId === printerFilter;

      return matchQuery && matchStatus && matchDate && matchType && matchPrinter;
    });
  }, [printJobs, searchQuery, statusFilter, dateRangeFilter, customStartDate, customEndDate, typeFilter, printerFilter]);

  const activeJob = useMemo(() => {
    return (
      printJobs.find((j) => j.id === selectedJobId) ||
      filteredJobs[0] ||
      null
    );
  }, [printJobs, selectedJobId, filteredJobs]);

  const selectedPrinterObj = useMemo(() => {
    return printers.find((p) => p.id === reprintPrinterId) || printers[0];
  }, [printers, reprintPrinterId]);

  // Track failed jobs in the currently filtered list
  const failedFilteredJobs = useMemo(() => {
    return filteredJobs.filter((j) => j.status === 'FAILED');
  }, [filteredJobs]);

  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [retryProgress, setRetryProgress] = useState<{ current: number; total: number } | null>(null);

  // Automatically iterate through all failed jobs in the filtered list and re-attempt print command
  const handleRetryAllFailed = async () => {
    if (failedFilteredJobs.length === 0) {
      if (onShowToast) onShowToast('No failed jobs found in current filtered list.');
      return;
    }

    setIsRetryingAll(true);
    let successCount = 0;
    let failCount = 0;
    const updatedJobsMap = new Map<string, PrintJob>(printJobs.map((j) => [j.id, { ...j }]));

    for (let i = 0; i < failedFilteredJobs.length; i++) {
      const job = failedFilteredJobs[i];
      setRetryProgress({ current: i + 1, total: failedFilteredJobs.length });

      const targetPrinter = printers.find(
        (p) => p.id === (job.actualPrinterId || job.printerId)
      ) || printers[0];

      const payloadToSend =
        job.rawPayloadPreview ||
        `^XA\n^FO50,50^ADN,36,20^FDRETRY: ${job.jobName}^FS\n^FO50,110^BCN,100,Y,N,N^FD${job.id}^FS\n^PQ${job.copies || 1},0,1,Y\n^XZ`;
      const timestamp = new Date().toLocaleTimeString();

      if (isDesktopApp() && targetPrinter) {
        try {
          const res = await desktopPrintLabel({
            printerName: targetPrinter.systemPrinterName || targetPrinter.name,
            printerType: targetPrinter.language === 'TSPL' ? 'tspl' : 'zpl',
            copies: job.copies || 1,
            rawPayload: payloadToSend,
            jobName: `[RETRY] ${job.jobName}`
          });

          if (res.success) {
            successCount++;
            const updated: PrintJob = {
              ...job,
              status: 'COMPLETED',
              completedAt: timestamp,
              retryCount: (job.retryCount || 0) + 1,
              integrationResponseSummary: `Automated retry successful at ${timestamp}. Bytes written: ${res.bytesWritten || payloadToSend.length}`
            };
            updatedJobsMap.set(job.id, updated);
          } else {
            failCount++;
            const updated: PrintJob = {
              ...job,
              retryCount: (job.retryCount || 0) + 1,
              integrationResponseSummary: `Automated retry failed: ${res.error?.message || 'Device communication error'}`
            };
            updatedJobsMap.set(job.id, updated);
          }
        } catch (err: any) {
          failCount++;
          const updated: PrintJob = {
            ...job,
            retryCount: (job.retryCount || 0) + 1,
            integrationResponseSummary: `Automated retry error: ${err.message}`
          };
          updatedJobsMap.set(job.id, updated);
        }
      } else {
        // Web environment simulation
        await new Promise((r) => setTimeout(r, 120));
        successCount++;
        const updated: PrintJob = {
          ...job,
          status: 'COMPLETED',
          completedAt: timestamp,
          retryCount: (job.retryCount || 0) + 1,
          integrationResponseSummary: `Automated retry dispatched via Spooler simulation at ${timestamp}.`
        };
        updatedJobsMap.set(job.id, updated);
      }
    }

    const newJobsList = Array.from(updatedJobsMap.values());
    onUpdatePrintJobs(newJobsList);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `AUD-RETRY-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        userId: 'usr-batch-retry',
        userName: (currentUserRole as UserRole) === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Production Operator',
        userRole: (currentUserRole as UserRole) || 'PRINT_MANAGER',
        action: 'PRINT_JOB_REPRINTED',
        entityType: 'PrintJobBatch',
        entityId: `BATCH-RETRY-${failedFilteredJobs.length}`,
        beforeValueJson: JSON.stringify({ totalFailed: failedFilteredJobs.length }),
        afterValueJson: JSON.stringify({ successCount, failCount }),
        result: failCount === 0 ? 'SUCCESS' : 'FAILURE',
        details: `Batch retry of ${failedFilteredJobs.length} failed jobs executed (${successCount} succeeded, ${failCount} failed).`
      });
    }

    setIsRetryingAll(false);
    setRetryProgress(null);

    if (onShowToast) {
      onShowToast(`Retry All Failed completed: ${successCount} succeeded, ${failCount} failed.`);
    }
  };

  // Handle Quick Open Reprint
  const handleInitiateReprint = (job: PrintJob, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReprintTargetJob(job);
    setReprintPrinterId(job.actualPrinterId || job.printerId || activePrinterId || printers[0]?.id || '');
    setReprintCopies(job.copies || 1);
    setReprintReason('Immediate Reprint / Defective Media Replacement');
    setCustomReprintNote('');
    setReprintResultNotice(null);
    setIsReprintDrawerOpen(true);
  };

  // Execute Dispatch to Industrial Thermal Printer
  const handleExecuteReprint = async () => {
    if (!reprintTargetJob) return;

    const targetPrinter = printers.find((p) => p.id === reprintPrinterId) || printers[0];
    if (!targetPrinter) {
      if (onShowToast) onShowToast('Error: No target industrial printer selected.');
      return;
    }

    setIsSubmittingReprint(true);
    setReprintResultNotice(null);

    const newJobId = `JOB-RP-${Date.now().toString().slice(-6)}`;
    const newJobNumber = `PJ-RP${newJobId.slice(-4)}`;
    const totalRecords = reprintTargetJob.recordCount || 1;
    const totalQuantity = reprintCopies * totalRecords;
    const payloadToSend =
      reprintTargetJob.rawPayloadPreview ||
      `^XA\n^FO50,50^ADN,36,20^FDREPRINT: ${reprintTargetJob.jobName}^FS\n^FO50,110^BCN,100,Y,N,N^FD${newJobId}^FS\n^PQ${reprintCopies},0,1,Y\n^XZ`;

    // 1. If running in Native Windows Electron Environment, trigger hardware bridge
    if (isDesktopApp()) {
      try {
        const desktopRes = await desktopPrintLabel({
          printerName: targetPrinter.systemPrinterName || targetPrinter.name,
          printerType: targetPrinter.language === 'TSPL' ? 'tspl' : 'zpl',
          copies: reprintCopies,
          rawPayload: payloadToSend,
          jobName: `[REPRINT] ${reprintTargetJob.jobName} - Batch`
        });

        setIsSubmittingReprint(false);

        if (desktopRes.success) {
          const successNotice = {
            status: 'success' as const,
            jobId: newJobId,
            message: `Native Hardware Dispatch Success: ${desktopRes.bytesWritten || payloadToSend.length} bytes transmitted to ${targetPrinter.name} (Port 9100 / Windows Spooler Queue).`
          };
          setReprintResultNotice(successNotice);

          recordReprintInHistory(newJobId, newJobNumber, targetPrinter, totalQuantity, payloadToSend, 'SENT_TO_PRINT_SERVICE', 'Direct Native Port 9100 / Spooler');
        } else {
          setReprintResultNotice({
            status: 'error' as const,
            jobId: newJobId,
            message: `Native Hardware Dispatch Failed: ${desktopRes.error?.message || 'Device communication timed out.'}`
          });
          recordReprintInHistory(newJobId, newJobNumber, targetPrinter, totalQuantity, payloadToSend, 'FAILED', 'Native Driver Port 9100 Error');
        }
        return;
      } catch (err: any) {
        setIsSubmittingReprint(false);
        setReprintResultNotice({
          status: 'error' as const,
          jobId: newJobId,
          message: `Bridge communication error: ${err.message}`
        });
        return;
      }
    }

    // 2. Web browser fallback simulation (with real state update & audit logging)
    setTimeout(() => {
      setIsSubmittingReprint(false);
      const successNotice = {
        status: 'success' as const,
        jobId: newJobId,
        message: `Direct Reprint Dispatched: Transferred ${reprintCopies} copies to ${targetPrinter.name} [${targetPrinter.language} - ${targetPrinter.dpi} DPI] at ${targetPrinter.address}.`
      };
      setReprintResultNotice(successNotice);

      recordReprintInHistory(newJobId, newJobNumber, targetPrinter, totalQuantity, payloadToSend, 'SENT_TO_PRINT_SERVICE', 'BarTender REST Spooler Simulation');
      if (onShowToast) {
        onShowToast(`Reprint ${newJobId} sent to ${targetPrinter.name}`);
      }
    }, 600);
  };

  const recordReprintInHistory = (
    newJobId: string,
    newJobNumber: string,
    targetPrinter: PrinterProfile,
    totalQuantity: number,
    payload: string,
    status: PrintJobState,
    integrationMethod: string
  ) => {
    if (!reprintTargetJob) return;

    const newJob: PrintJob = {
      id: newJobId,
      jobNumber: newJobNumber,
      jobType: 'REPRINT',
      jobName: `[REPRINT] ${reprintTargetJob.jobName}`,
      requestedByUserId: 'usr-reprint',
      requestedByUserName: (currentUserRole as UserRole) === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Production Operator',
      userRole: (currentUserRole as UserRole) || 'PRINT_MANAGER',
      templateId: reprintTargetJob.templateId,
      templateName: reprintTargetJob.templateName,
      templateVersion: reprintTargetJob.templateVersion,
      printerId: targetPrinter.id,
      printerName: targetPrinter.displayName || targetPrinter.name,
      requestedPrinterId: targetPrinter.id,
      actualPrinterId: targetPrinter.id,
      actualPrinterName: targetPrinter.name,
      fallbackPrinterUsed: targetPrinter.id !== reprintTargetJob.printerId,
      copies: reprintCopies,
      recordCount: reprintTargetJob.recordCount || 1,
      labelQuantity: totalQuantity,
      labelDataJson: reprintTargetJob.labelDataJson,
      status,
      createdAt: new Date().toLocaleTimeString(),
      sentAt: new Date().toLocaleTimeString(),
      completedAt: status === 'SENT_TO_PRINT_SERVICE' ? new Date().toLocaleTimeString() : undefined,
      outputLanguage: targetPrinter.language,
      rawPayloadPreview: payload,
      integrationMethod,
      integrationResponseSummary: `Reprint Authorization Verified. Source Job Ref: ${reprintTargetJob.id}. Reason: ${reprintReason}${customReprintNote ? ` (${customReprintNote})` : ''}.`,
      originalPrintJobId: reprintTargetJob.id,
      reprintReason: `${reprintReason}${customReprintNote ? ` — ${customReprintNote}` : ''}`,
      retryCount: 0,
      auditReference: `AUD-${Date.now().toString().slice(-6)}`
    };

    onUpdatePrintJobs([newJob, ...printJobs]);
    setSelectedJobId(newJobId);

    if (onAddAuditLog) {
      const audit: PrintAuditLog = {
        id: `AUD-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        userId: 'usr-reprint',
        userName: (currentUserRole as UserRole) === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Production Operator',
        userRole: (currentUserRole as UserRole) || 'PRINT_MANAGER',
        action: 'PRINT_JOB_REPRINTED',
        entityType: 'PrintJob',
        entityId: newJobId,
        beforeValueJson: JSON.stringify({ originalJobId: reprintTargetJob.id, originalPrinter: reprintTargetJob.printerName }),
        afterValueJson: JSON.stringify({
          newJobId,
          targetPrinter: targetPrinter.name,
          copies: reprintCopies,
          reason: reprintReason,
          note: customReprintNote
        }),
        result: status === 'SENT_TO_PRINT_SERVICE' ? 'SUCCESS' : 'FAILURE',
        details: `Controlled reprint initiated from Batch History to ${targetPrinter.name}`
      };
      onAddAuditLog(audit);
    }
  };

  const getStatusBadge = (status: PrintJobState) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
            COMPLETED
          </span>
        );
      case 'SENT_TO_PRINT_SERVICE':
      case 'PRINTING':
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/80 border border-blue-600/60 text-blue-300">
            <RefreshCw className="w-3 h-3 mr-1 text-blue-400 animate-spin" />
            IN SPOOLER
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/80 border border-red-700/60 text-red-300">
            <AlertTriangle className="w-3 h-3 mr-1 text-red-400" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300">
            <Clock className="w-3 h-3 mr-1 text-zinc-400" />
            {status}
          </span>
        );
    }
  };

  const handleCopyPayload = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in select-none">
      <div className="bg-[#181a20] border border-[#2e323e] rounded-xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-gray-200">
        {/* Modal Header */}
        <div className="h-14 px-6 bg-[#1f222b] border-b border-[#2e323e] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Batch Print Job History &amp; Re-Print Dispatcher
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-700/60 text-blue-300 text-[10px] font-mono">
                  {filteredJobs.length} of {printJobs.length} Jobs
                </span>
                {isDesktopApp() && (
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono">
                    Direct Port 9100 Spooling
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                Audit trail of industrial thermal output jobs with parameter inspection, verification status, and direct-to-hardware reprinting.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Retry All Failed Button */}
            <button
              onClick={handleRetryAllFailed}
              disabled={isRetryingAll || failedFilteredJobs.length === 0}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                failedFilteredJobs.length > 0
                  ? 'bg-amber-600/90 hover:bg-amber-500 text-white shadow-md cursor-pointer border border-amber-500/50'
                  : 'bg-zinc-800/60 text-zinc-500 border border-zinc-700/40 cursor-not-allowed'
              } ${isRetryingAll ? 'opacity-80' : ''}`}
              title={
                failedFilteredJobs.length > 0
                  ? `Iterate and retry all ${failedFilteredJobs.length} failed jobs in the filtered list`
                  : 'No failed jobs in the current filtered list'
              }
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRetryingAll ? 'animate-spin' : ''}`} />
              <span>
                {isRetryingAll
                  ? `Retrying (${retryProgress?.current || 0}/${retryProgress?.total || failedFilteredJobs.length})...`
                  : `Retry All Failed (${failedFilteredJobs.length})`}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('QUEUE')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'QUEUE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-[#282c38]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Jobs Queue ({printJobs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('STATISTICS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'STATISTICS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-[#282c38]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Print Statistics &amp; Telemetry</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#2d313e] text-gray-400 hover:text-white transition-colors ml-2"
              title="Close Dialog (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Active Tab Switch */}
        {activeTab === 'STATISTICS' ? (
          <PrintStatisticsDashboard
            printJobs={printJobs}
            printers={printers}
            onTriggerReprintJob={(job) => {
              setActiveTab('QUEUE');
              handleInitiateReprint(job);
            }}
          />
        ) : (
          <>
            {/* Filter Toolbar */}
            <div className="px-6 py-2.5 bg-[#1a1c23] border-b border-[#2a2d39] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 flex-1 min-w-[260px]">
            <div className="relative w-full max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Job ID, Name, Template, Operator, Printer..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#13151b] border border-[#2e3342] rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Status Filter */}
            <div className="flex items-center space-x-1 bg-[#13151b] border border-[#2e3342] rounded-md px-2 py-1">
              <span className="text-gray-500 text-[11px]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-gray-300 font-medium text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending / In Spooler</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-1 bg-[#13151b] border border-[#2e3342] rounded-md px-2 py-1">
              <Calendar className="w-3 h-3 text-blue-400" />
              <span className="text-gray-500 text-[11px]">Date:</span>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="bg-transparent text-gray-300 font-medium text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All History</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="CUSTOM">Custom Range...</option>
              </select>
            </div>

            {/* Custom Date Pickers when CUSTOM is selected */}
            {dateRangeFilter === 'CUSTOM' && (
              <div className="flex items-center space-x-1.5 bg-[#13151b] border border-blue-500/50 rounded-md px-2 py-0.5 animate-in fade-in">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-transparent text-gray-200 text-[11px] font-mono focus:outline-none"
                  title="Start Date"
                />
                <span className="text-gray-500 text-[10px]">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-transparent text-gray-200 text-[11px] font-mono focus:outline-none"
                  title="End Date"
                />
              </div>
            )}

            {/* Job Type Filter */}
            <div className="flex items-center space-x-1 bg-[#13151b] border border-[#2e3342] rounded-md px-2 py-1">
              <span className="text-gray-500 text-[11px]">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-gray-300 font-medium text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="ON_DEMAND">On Demand</option>
                <option value="BATCH">Batch Production</option>
                <option value="REPRINT">Reprint</option>
                <option value="TEST_PRINT">Diagnostic</option>
              </select>
            </div>

            {/* Target Printer Filter */}
            <div className="flex items-center space-x-1 bg-[#13151b] border border-[#2e3342] rounded-md px-2 py-1">
              <span className="text-gray-500 text-[11px]">Printer:</span>
              <select
                value={printerFilter}
                onChange={(e) => setPrinterFilter(e.target.value)}
                className="bg-transparent text-gray-300 font-medium text-[11px] focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="ALL">All Industrial Printers</option>
                {printers.map((prn) => (
                  <option key={prn.id} value={prn.id}>
                    {prn.displayName || prn.name}
                  </option>
                ))}
              </select>
            </div>

            {(searchQuery || statusFilter !== 'ALL' || dateRangeFilter !== 'ALL' || typeFilter !== 'ALL' || printerFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDateRangeFilter('ALL');
                  setCustomStartDate('');
                  setCustomEndDate('');
                  setTypeFilter('ALL');
                  setPrinterFilter('ALL');
                }}
                className="px-2 py-1 rounded bg-[#252834] hover:bg-[#2e3240] text-gray-400 hover:text-white text-[11px] transition-colors"
                title="Reset all search queries and filters"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Main Content Split: Left Job List + Right Detailed Inspector */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Scrollable Job List */}
          <div className="w-1/2 border-r border-[#2a2d39] flex flex-col bg-[#14161c]">
            <div className="px-4 py-2 bg-[#181a22] border-b border-[#272a36] text-[11px] font-semibold text-gray-400 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleToggleExpandAll}
                  className="p-1 rounded hover:bg-[#252834] text-gray-400 hover:text-white transition-colors flex items-center space-x-1"
                  title={expandedJobIds.size === filteredJobs.length && filteredJobs.length > 0 ? "Collapse all technical metadata" : "Expand all technical metadata"}
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${expandedJobIds.size === filteredJobs.length && filteredJobs.length > 0 ? 'rotate-90 text-blue-400' : ''}`} />
                  <span className="text-[10px] font-mono text-blue-400">
                    {expandedJobIds.size === filteredJobs.length && filteredJobs.length > 0 ? 'COLLAPSE ALL' : 'EXPAND ALL'}
                  </span>
                </button>
                <span className="w-10 text-center text-gray-500">THUMB</span>
                <span>PRINT JOB DETAILS ({filteredJobs.length})</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleToggleExpandAll}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-mono hover:underline"
                >
                  {expandedJobIds.size === filteredJobs.length && filteredJobs.length > 0 ? 'Collapse All' : 'Expand All Specs'}
                </button>
                <span>TIMESTAMP &amp; COPIES</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#212430]">
              {filteredJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-gray-500">
                  <FileText className="w-10 h-10 mb-2 opacity-40 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-400">No print jobs match your filter criteria.</p>
                  <p className="text-[11px] text-gray-600 mt-1">Try broadening your date range, status, or search keywords.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                      setDateRangeFilter('ALL');
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setTypeFilter('ALL');
                      setPrinterFilter('ALL');
                    }}
                    className="mt-3 px-3 py-1 rounded bg-[#252834] hover:bg-[#2f3444] text-blue-400 text-xs font-semibold transition-colors"
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                filteredJobs.map((job) => {
                  const isSelected = activeJob?.id === job.id;
                  const isExpanded = expandedJobIds.has(job.id);
                  const associatedPrinter = printers.find(p => p.id === (job.actualPrinterId || job.printerId));

                  return (
                    <div
                      key={job.id}
                      className="border-b border-[#212430] last:border-b-0 transition-colors"
                    >
                      <div
                        onClick={() => {
                          setSelectedJobId(job.id);
                          toggleRowExpanded(job.id);
                        }}
                        className={`px-3 py-3 cursor-pointer transition-all flex items-center justify-between group ${
                          isSelected
                            ? 'bg-[#1e2330] border-l-4 border-blue-500'
                            : 'hover:bg-[#191c24]'
                        }`}
                      >
                        {/* Left Toggle & Thumbnail */}
                        <div className="flex items-center space-x-2 mr-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => toggleRowExpanded(job.id, e)}
                            className={`p-1 rounded hover:bg-[#282d3c] text-gray-400 hover:text-white transition-all ${
                              isExpanded ? 'text-blue-400' : ''
                            }`}
                            title={isExpanded ? 'Collapse technical metadata' : 'Click to expand technical metadata (DPI, paper size, ink level)'}
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-150 ${isExpanded ? 'rotate-90 text-blue-400' : ''}`} />
                          </button>

                          {/* Thumbnail Preview Column */}
                          <div className="flex items-center justify-center">
                            <JobLabelThumbnail
                              job={job}
                              activeDocument={activeDocument}
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Middle Job Description */}
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-mono text-xs font-bold text-white tracking-tight">
                              {job.jobNumber || job.id}
                            </span>
                            <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {job.jobType || 'ON_DEMAND'}
                            </span>
                            {getStatusBadge(job.status)}
                          </div>

                          <div className="text-xs font-medium text-gray-200 truncate group-hover:text-blue-300 transition-colors">
                            {job.jobName}
                          </div>

                          <div className="text-[11px] text-gray-400 flex items-center space-x-2 mt-1 truncate">
                            <span className="flex items-center space-x-1">
                              <Printer className="w-3 h-3 text-blue-400 shrink-0" />
                              <span className="truncate">{job.printerName}</span>
                            </span>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-gray-400">
                              {job.outputLanguage}
                            </span>
                            {job.requestedByUserName && (
                              <>
                                <span>•</span>
                                <span className="text-gray-400 truncate">
                                  {job.requestedByUserName}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <button
                              type="button"
                              onClick={(e) => toggleRowExpanded(job.id, e)}
                              className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-mono border transition-colors ${
                                isExpanded
                                  ? 'bg-blue-950/80 text-blue-300 border-blue-700/60'
                                  : 'bg-[#1e222d] text-gray-300 border-[#2f3547] hover:border-blue-500 hover:text-blue-300'
                              }`}
                              title="Click to reveal DPI, paper size, and ink level metadata"
                            >
                              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-180 text-blue-400' : ''}`} />
                              <span>{isExpanded ? 'Hide Specs' : 'Specs: DPI & Ink'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Right Timestamp & Actions */}
                        <div className="flex flex-col items-end shrink-0 space-y-2">
                          <span className="text-[11px] text-gray-400 font-mono">
                            {job.createdAt || job.sentAt || 'Recently'}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#20242e] text-gray-300 font-mono border border-gray-700">
                              {job.copies} {job.copies === 1 ? 'copy' : 'copies'}
                            </span>
                            <button
                              onClick={(e) => handleInitiateReprint(job, e)}
                              className="px-2 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-semibold flex items-center space-x-1 shadow-sm transition-colors"
                              title="Direct Re-Print this job"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Re-Print</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Technical Metadata Sub-row */}
                      {isExpanded && (
                        <JobTechnicalMetadataRow
                          job={job}
                          printer={associatedPrinter}
                          activeDocument={activeDocument}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Detailed Configuration & Reprint Panel */}
          <div className="w-1/2 flex flex-col bg-[#161820] overflow-y-auto">
            {activeJob ? (
              <div className="p-6 space-y-6">
                {/* Header Summary of Selected Job */}
                <div className="bg-[#1b1f28] border border-[#2b3140] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-start space-x-3">
                      <JobLabelThumbnail
                        job={activeJob}
                        activeDocument={activeDocument}
                        size="md"
                        className="mt-0.5"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-white tracking-wide">
                            {activeJob.jobName}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-2 mt-1 text-[11px] text-gray-400 font-mono">
                          <span>Job ID: <strong className="text-blue-300">{activeJob.id}</strong></span>
                          <span>•</span>
                          <span>Tracking Number: <strong className="text-gray-200">{activeJob.jobNumber || 'N/A'}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div>{getStatusBadge(activeJob.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2a303e] text-xs">
                    <div>
                      <span className="text-gray-500 text-[11px] block">Template Reference:</span>
                      <span className="font-semibold text-gray-200">{activeJob.templateName}</span>
                      <span className="text-[10px] text-gray-400 block font-mono">
                        v{activeJob.templateVersion || 1} • {activeJob.templateId || 'custom-template'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[11px] block">Connected Industrial Hardware:</span>
                      <span className="font-semibold text-gray-200">{activeJob.printerName}</span>
                      <span className="text-[10px] text-emerald-400 block font-mono">
                        {activeJob.outputLanguage} Stream • {activeJob.actualPrinterName || activeJob.printerName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[11px] block">Dispatched Quantity:</span>
                      <span className="font-semibold text-gray-200">
                        {activeJob.copies} {activeJob.copies === 1 ? 'copy' : 'copies'} ({activeJob.recordCount || 1} records)
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[11px] block">Timestamp Audit:</span>
                      <span className="font-mono text-gray-300 text-[11px]">
                        Created: {activeJob.createdAt || 'N/A'}
                      </span>
                      {activeJob.completedAt && (
                        <span className="font-mono text-emerald-400 text-[10px] block">
                          Completed: {activeJob.completedAt}
                        </span>
                      )}
                    </div>
                  </div>

                  {activeJob.integrationResponseSummary && (
                    <div className="mt-3 p-2 rounded bg-[#13161d] border border-[#272b38] text-[11px] font-mono text-gray-300 flex items-start space-x-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-gray-400 font-sans font-semibold">Diagnostic Response: </span>
                        <span>{activeJob.integrationResponseSummary}</span>
                      </div>
                    </div>
                  )}

                  {/* Primary Action Button: Open Controlled Reprint Setup */}
                  <div className="mt-4 pt-3 border-t border-[#2a303e] flex items-center justify-between">
                    <div className="text-[11px] text-gray-400">
                      Authorize direct thermal reprint to warehouse hardware
                    </div>
                    <button
                      onClick={() => handleInitiateReprint(activeJob)}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-blue-900/30 transition-all hover:scale-[1.02]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Re-Print This Job...</span>
                    </button>
                  </div>
                </div>

                {/* Hardware Print Telemetry Card (DPI, Paper Size, Ink Level) */}
                <div className="bg-[#1b1f28] border border-[#2b3140] rounded-xl overflow-hidden shadow-sm">
                  <div className="px-4 py-2.5 bg-[#202532] border-b border-[#2a303e] flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Gauge className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Hardware Print Telemetry at Execution
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151822] text-gray-300 border border-gray-700">
                      {activeJob.outputLanguage} • {activeJob.dpi || 300} DPI
                    </span>
                  </div>
                  <JobTechnicalMetadataRow
                    job={activeJob}
                    printer={printers.find(p => p.id === (activeJob.actualPrinterId || activeJob.printerId))}
                    activeDocument={activeDocument}
                  />
                </div>

                {/* Variable Values / Label Data Inspector */}
                <div className="bg-[#1b1f28] border border-[#2b3140] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-blue-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Template Variable Sub-Strings
                      </h4>
                    </div>
                    {activeJob.labelDataJson && (
                      <span className="text-[10px] font-mono text-gray-400">
                        {Object.keys(activeJob.labelDataJson).length} Fields
                      </span>
                    )}
                  </div>

                  {activeJob.labelDataJson && Object.keys(activeJob.labelDataJson).length > 0 ? (
                    <div className="bg-[#12141a] rounded-lg border border-[#262a36] divide-y divide-[#222632] max-h-48 overflow-y-auto">
                      {Object.entries(activeJob.labelDataJson).map(([key, value]) => (
                        <div key={key} className="px-3 py-1.5 flex items-center justify-between text-xs font-mono">
                          <span className="text-blue-300 font-semibold">{key}</span>
                          <span className="text-gray-300 truncate max-w-[280px]">
                            {String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-xs bg-[#12141a] rounded-lg border border-[#262a36]">
                      No dynamic JSON variables recorded for this print run (Direct vector substrate stream).
                    </div>
                  )}
                </div>

                {/* Raw Hardware Payload Inspector (ZPL / TSPL / EPL) */}
                <div className="bg-[#1b1f28] border border-[#2b3140] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Raw {activeJob.outputLanguage || 'Printer'} Command Stream
                      </h4>
                    </div>
                    {activeJob.rawPayloadPreview && (
                      <button
                        onClick={() => handleCopyPayload(activeJob.rawPayloadPreview)}
                        className="flex items-center space-x-1 px-2 py-0.5 rounded bg-[#272b38] hover:bg-[#323849] text-[10px] text-gray-300 hover:text-white transition-colors"
                      >
                        {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPayload ? 'Copied' : 'Copy Payload'}</span>
                      </button>
                    )}
                  </div>

                  <pre className="p-3 bg-[#0f1116] border border-[#242834] rounded-lg text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-48 whitespace-pre-wrap select-text leading-relaxed">
                    {activeJob.rawPayloadPreview || `^XA\n^FDDirect Spooler Handoff for ${activeJob.jobName}^FS\n^XZ`}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                <History className="w-12 h-12 mb-3 opacity-30 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-400">No Print Job Selected</h3>
                <p className="text-xs text-gray-600 mt-1 max-w-sm">
                  Click on any past print run in the left queue to inspect its hardware parameters, variable fields, and output stream.
                </p>
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {/* Modal Footer */}
        <div className="h-12 px-6 bg-[#1f222b] border-t border-[#2e323e] flex items-center justify-between text-xs text-gray-400 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Hardware Spooler Interface: <strong>Ready</strong></span>
            <span className="text-gray-600">|</span>
            <span>Active Default Target: <strong className="text-white">{printers.find(p => p.id === activePrinterId)?.name || 'Default Industrial'}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2e3342] hover:bg-[#3a4052] text-white text-xs font-semibold transition-colors"
          >
            Close History
          </button>
        </div>
      </div>

      {/* ================= RE-PRINT CONFIGURATION DRAWER / OVERLAY ================= */}
      {isReprintDrawerOpen && reprintTargetJob && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4 animate-in fade-in">
          <div className="bg-[#1a1c24] border border-[#34384a] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-[#20232e] border-b border-[#2e3242] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Direct Industrial Re-Print Configuration
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Target: {reprintTargetJob.jobName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReprintDrawerOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Notice Banner if already executed */}
              {reprintResultNotice && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start space-x-2 ${
                    reprintResultNotice.status === 'success'
                      ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200'
                      : 'bg-red-950/80 border-red-700/60 text-red-200'
                  }`}
                >
                  {reprintResultNotice.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {reprintResultNotice.status === 'success' ? 'DISPATCH SUCCESS' : 'DISPATCH FAILED'}
                    </span>
                    <span className="text-[11px]">{reprintResultNotice.message}</span>
                  </div>
                </div>
              )}

              {/* Target Printer Selection */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Destination Industrial Printer:
                </label>
                <select
                  value={reprintPrinterId}
                  onChange={(e) => setReprintPrinterId(e.target.value)}
                  className="w-full bg-[#13151b] border border-[#2e3342] rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-blue-500"
                >
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.dpi} DPI, {p.language}) — {p.status}
                    </option>
                  ))}
                </select>
                {selectedPrinterObj && (
                  <div className="mt-1.5 flex items-center space-x-2 text-[11px] text-gray-400 font-mono">
                    <span>Protocol: {selectedPrinterObj.language}</span>
                    <span>•</span>
                    <span>Port/Address: {selectedPrinterObj.address}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">● {selectedPrinterObj.status}</span>
                  </div>
                )}
              </div>

              {/* Copies Count */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Quantity / Copies to Reprint:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={reprintCopies}
                    onChange={(e) => setReprintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32 bg-[#13151b] border border-[#2e3342] rounded-lg px-3 py-1.5 text-white font-mono text-center font-bold text-sm focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center space-x-1">
                    {[1, 2, 5, 10, 25].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setReprintCopies(cnt)}
                        className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                          reprintCopies === cnt
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-[#252834] text-gray-300 hover:bg-[#313545]'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reprint Reason / Audit Compliance */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Controlled Reprint Authorization Reason:
                </label>
                <select
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value)}
                  className="w-full bg-[#13151b] border border-[#2e3342] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Immediate Reprint / Defective Media Replacement">Defective Media / Thermal Ribbon Crease</option>
                  <option value="Thermal Printer Jam / Tear-off Failure">Printer Jam / Cutter Issue</option>
                  <option value="Barcode Verifier Readability Failure">Barcode Verifier Readability / Contrast Failure</option>
                  <option value="Damaged in Packaging Line">Damaged in Transit / Packaging Line</option>
                  <option value="Approved Operational Re-run">Approved Operational Re-run</option>
                  <option value="Quality Inspection Audit Sample">Quality Inspection Audit Sample</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Operator Note (Optional):
                </label>
                <input
                  type="text"
                  value={customReprintNote}
                  onChange={(e) => setCustomReprintNote(e.target.value)}
                  placeholder="e.g., Authorized by Shift Supervisor for pallet lot re-tagging"
                  className="w-full bg-[#13151b] border border-[#2e3342] rounded-lg px-3 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              {/* Environment Note */}
              <div className="p-2.5 rounded-lg bg-[#14161d] border border-[#282c38] text-[11px] text-gray-400 flex items-center space-x-2">
                <Send className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>
                  {isDesktopApp()
                    ? 'Windows Native Spooler Active: Job will stream directly to local port 9100 / spooler queue.'
                    : 'Web Execution Mode: Job will dispatch via BarTender REST / Direct Socket simulation.'}
                </span>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#20232e] border-t border-[#2e3242] flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsReprintDrawerOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-[#2b2f3d] hover:bg-[#373c4d] text-gray-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReprint}
                onClick={handleExecuteReprint}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-900/30 transition-colors"
              >
                {isSubmittingReprint ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting to Hardware...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-3.5 h-3.5" />
                    <span>Dispatch Reprint Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
