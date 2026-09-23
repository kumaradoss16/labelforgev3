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
  Gauge,
  ArrowUp,
  ArrowDown,
  Flame,
  Ban,
  ListOrdered,
  Sparkles,
  AlertCircle,
  CheckSquare,
  Square,
  MinusSquare,
  Radio
} from 'lucide-react';
import { PrintJob, PrinterProfile, UserRole, PrintAuditLog, PrintJobState, VIRTUAL_FALLBACK_PRINTER } from '../../types/printer';
import { isDesktopApp, desktopPrintLabel } from '../../services/desktopBridge';
import { resolveIPCPrinterType } from '../../services/printerLanguageMapper';
import { extractNetworkHostPort } from '../../services/printQueueManager';
import { PrintStatisticsDashboard } from './PrintStatisticsDashboard';
import { JobLabelThumbnail } from './JobLabelThumbnail';
import { JobTechnicalMetadataRow } from './JobTechnicalMetadataRow';
import { LabelDocument } from '../../types/label';
import { useIdentity } from '../../context/IdentityContext';

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

export const matchesPrintJobSearchQuery = (job: PrintJob, query: string): boolean => {
  const q = query.toLowerCase().trim();
  if (!q) return true;

  // 1. Job ID & Number matching
  if (job.id && job.id.toLowerCase().includes(q)) return true;
  if (job.jobNumber && job.jobNumber.toLowerCase().includes(q)) return true;
  if (job.originalPrintJobId && job.originalPrintJobId.toLowerCase().includes(q)) return true;

  // 2. Printer Name & Identifier matching
  if (job.printerName && job.printerName.toLowerCase().includes(q)) return true;
  if (job.actualPrinterName && job.actualPrinterName.toLowerCase().includes(q)) return true;
  if (job.printerId && job.printerId.toLowerCase().includes(q)) return true;
  if (job.actualPrinterId && job.actualPrinterId.toLowerCase().includes(q)) return true;

  // 3. User Name & User ID matching
  if (job.requestedByUserName && job.requestedByUserName.toLowerCase().includes(q)) return true;
  if (job.requestedByUserId && job.requestedByUserId.toLowerCase().includes(q)) return true;

  // 4. Job Name, Template & Language metadata
  if (job.jobName && job.jobName.toLowerCase().includes(q)) return true;
  if (job.templateName && job.templateName.toLowerCase().includes(q)) return true;
  if (job.outputLanguage && job.outputLanguage.toLowerCase().includes(q)) return true;

  return false;
};

/**
 * Determines if a print job is currently in an active / pending spooler state.
 */
export const isJobPending = (job: PrintJob): boolean => {
  return [
    'QUEUED',
    'PENDING',
    'SENT_TO_PRINT_SERVICE',
    'PRINTING',
    'SUBMITTING',
    'SUBMITTED',
    'DRAFT',
    'VALIDATING',
    'READY',
    'RENDERING',
    'RENDERED',
    'RETRYING'
  ].includes(job.status);
};

/**
 * Pure helper to filter print jobs by status:
 * 'ALL' | 'SUCCESS' | 'COMPLETED' | 'FAILED' | 'PENDING' | 'CANCELLED'
 */
export const filterPrintJobsByStatus = (jobs: PrintJob[], status: string): PrintJob[] => {
  if (!status || status === 'ALL') return jobs;
  if (status === 'SUCCESS' || status === 'COMPLETED') {
    return jobs.filter((job) => job.status === 'COMPLETED');
  }
  if (status === 'FAILED') {
    return jobs.filter((job) => job.status === 'FAILED');
  }
  if (status === 'PENDING') {
    return jobs.filter(isJobPending);
  }
  return jobs.filter((job) => job.status === status);
};

/**
 * Pure helper to reorder pending jobs up, down, or to the front (top) of the spooler queue.
 */
export const reorderPendingJobs = (
  jobs: PrintJob[],
  targetJobId: string,
  direction: 'UP' | 'DOWN' | 'TOP'
): PrintJob[] => {
  const pending = jobs.filter(isJobPending);
  const targetIndex = pending.findIndex((j) => j.id === targetJobId);
  if (targetIndex === -1) return jobs;

  const newPending = [...pending];
  if (direction === 'UP' && targetIndex > 0) {
    const temp = newPending[targetIndex];
    newPending[targetIndex] = newPending[targetIndex - 1];
    newPending[targetIndex - 1] = temp;
  } else if (direction === 'DOWN' && targetIndex < newPending.length - 1) {
    const temp = newPending[targetIndex];
    newPending[targetIndex] = newPending[targetIndex + 1];
    newPending[targetIndex + 1] = temp;
  } else if (direction === 'TOP' && targetIndex > 0) {
    const [moved] = newPending.splice(targetIndex, 1);
    newPending.unshift(moved);
  }

  // Update sequential queue position property
  newPending.forEach((j, idx) => {
    j.queuePosition = idx + 1;
  });

  // Merge back into original array preserving the relative ordering of non-pending jobs
  let pendingPtr = 0;
  return jobs.map((job) => {
    if (isJobPending(job)) {
      const nextPending = newPending[pendingPtr++];
      return nextPending || job;
    }
    return job;
  });
};

/**
 * Pure helper to adjust the priority level of a job in the queue.
 */
export const setJobPriority = (
  jobs: PrintJob[],
  targetJobId: string,
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW'
): PrintJob[] => {
  let updated = jobs.map((job) => {
    if (job.id === targetJobId) {
      return {
        ...job,
        priority,
      };
    }
    return job;
  });

  // If boosted to URGENT, auto-promote to top of pending queue
  if (priority === 'URGENT') {
    updated = reorderPendingJobs(updated, targetJobId, 'TOP');
  }

  return updated;
};

/**
 * Pure helper to cancel a pending print job.
 */
export const cancelPrintJob = (
  jobs: PrintJob[],
  targetJobId: string,
  operatorRole = 'PRINT_MANAGER'
): PrintJob[] => {
  const timestamp = new Date().toLocaleString();
  const timeOnly = new Date().toLocaleTimeString();

  return jobs.map((job) => {
    if (job.id === targetJobId) {
      return {
        ...job,
        status: 'CANCELLED',
        completedAt: timestamp,
        integrationResponseSummary: `Print job cancelled by operator (${operatorRole}) at ${timeOnly}. Hardware transmission terminated.`,
      };
    }
    return job;
  });
};

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

  const { identity } = useIdentity();

  // View Mode: 'QUEUE' | 'PENDING_QUEUE' | 'STATISTICS'
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'PENDING_QUEUE' | 'STATISTICS'>('QUEUE');

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

  // Multi-Selection State for Historical Print Jobs
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Batch Re-Print Modal State
  const [isBatchReprintModalOpen, setIsBatchReprintModalOpen] = useState(false);
  const [batchReprintCopiesMode, setBatchReprintCopiesMode] = useState<'ORIGINAL' | 'CUSTOM'>('ORIGINAL');
  const [batchCustomCopies, setBatchCustomCopies] = useState<number>(1);
  const [batchReprintReason, setBatchReprintReason] = useState<string>('Immediate Reprint / Defective Media Replacement');
  const [batchCustomNote, setBatchCustomNote] = useState<string>('');
  const [isSubmittingBatchReprint, setIsSubmittingBatchReprint] = useState(false);
  const [batchReprintProgress, setBatchReprintProgress] = useState<{
    current: number;
    total: number;
    currentJobName?: string;
  } | null>(null);
  const [batchReprintResultNotice, setBatchReprintResultNotice] = useState<{
    status: 'success' | 'error';
    message: string;
    count: number;
  } | null>(null);

  // Priority dropdown menu state for individual jobs
  const [openPriorityMenuJobId, setOpenPriorityMenuJobId] = useState<string | null>(null);

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

  // Multi-selection toggle helpers
  const toggleJobSelection = (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allFilteredSelected = filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.has(j.id));
    if (allFilteredSelected) {
      setSelectedJobIds(new Set());
    } else {
      const next = new Set(selectedJobIds);
      filteredJobs.forEach(j => next.add(j.id));
      setSelectedJobIds(next);
    }
  };

  const handleClearSelection = () => {
    setSelectedJobIds(new Set());
  };

  // Resolve the original printer profile assigned to a historical job
  const getOriginalPrinterForJob = (job: PrintJob): PrinterProfile => {
    return (
      printers.find(p => p.id === (job.actualPrinterId || job.printerId || job.requestedPrinterId)) ||
      printers.find(p => (p.displayName || p.name).toLowerCase() === (job.actualPrinterName || job.printerName || '').toLowerCase()) ||
      printers[0]
    );
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

  // Job status metrics for header status filter dropdown and badges
  const totalJobsCount = printJobs.length;
  const successJobsCount = useMemo(() => {
    return printJobs.filter((j) => j.status === 'COMPLETED').length;
  }, [printJobs]);
  const failedJobsCount = useMemo(() => {
    return printJobs.filter((j) => j.status === 'FAILED').length;
  }, [printJobs]);

  // List of active pending print jobs
  const pendingJobs = useMemo(() => {
    return printJobs.filter(isJobPending);
  }, [printJobs]);
  const pendingJobsCount = pendingJobs.length;

  // Queue Action Handlers
  const handleCancelJob = (job: PrintJob, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = cancelPrintJob(printJobs, job.id, currentUserRole);
    onUpdatePrintJobs(updated);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `AUD-CANCEL-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        userId: identity.userId,
        userName: identity.userName,
        userRole: identity.role,
        action: 'PRINT_JOB_CANCELLED',
        entityType: 'PrintJob',
        entityId: job.id,
        beforeValueJson: JSON.stringify({ status: job.status, priority: job.priority || 'NORMAL' }),
        afterValueJson: JSON.stringify({ status: 'CANCELLED' }),
        result: 'SUCCESS',
        ipAddress: identity.ipAddress,
        details: `Print job ${job.jobNumber || job.id} (${job.jobName}) was cancelled from the print queue.`
      });
    }

    if (onShowToast) {
      onShowToast(`Print job ${job.jobNumber || job.id} has been cancelled.`);
    }
  };

  const handleCancelAllPending = () => {
    if (pendingJobs.length === 0) return;
    let currentList = [...printJobs];
    pendingJobs.forEach(job => {
      currentList = cancelPrintJob(currentList, job.id, currentUserRole);
    });
    onUpdatePrintJobs(currentList);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `AUD-CANCEL-ALL-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        userId: identity.userId,
        userName: identity.userName,
        userRole: identity.role,
        action: 'PRINT_JOB_CANCELLED',
        entityType: 'PrintJobBatch',
        entityId: `BATCH-CANCEL-${pendingJobs.length}`,
        beforeValueJson: JSON.stringify({ count: pendingJobs.length }),
        afterValueJson: JSON.stringify({ status: 'CANCELLED' }),
        result: 'SUCCESS',
        ipAddress: identity.ipAddress,
        details: `Cancelled all ${pendingJobs.length} pending spooler jobs in queue.`
      });
    }

    if (onShowToast) {
      onShowToast(`Cancelled all ${pendingJobs.length} pending jobs in the print queue.`);
    }
  };

  const handleChangePriority = (
    job: PrintJob,
    priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const oldPriority = job.priority || 'NORMAL';
    const updated = setJobPriority(printJobs, job.id, priority);
    onUpdatePrintJobs(updated);
    setOpenPriorityMenuJobId(null);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `AUD-PRIORITY-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        userId: identity.userId,
        userName: identity.userName,
        userRole: identity.role,
        action: 'PRINT_JOB_PRIORITY_CHANGED',
        entityType: 'PrintJob',
        entityId: job.id,
        beforeValueJson: JSON.stringify({ priority: oldPriority }),
        afterValueJson: JSON.stringify({ priority }),
        result: 'SUCCESS',
        ipAddress: identity.ipAddress,
        details: `Priority for print job ${job.jobNumber || job.id} changed from ${oldPriority} to ${priority}.`
      });
    }

    if (onShowToast) {
      onShowToast(`Priority updated to ${priority} for ${job.jobNumber || job.id}.`);
    }
  };

  const handleReorderPending = (
    jobId: string,
    direction: 'UP' | 'DOWN' | 'TOP',
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    const targetJob = printJobs.find(j => j.id === jobId);
    const updated = reorderPendingJobs(printJobs, jobId, direction);
    onUpdatePrintJobs(updated);

    if (onAddAuditLog && targetJob) {
      onAddAuditLog({
        id: `AUD-REORDER-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        userId: identity.userId,
        userName: identity.userName,
        userRole: identity.role,
        action: 'PRINT_JOB_REORDERED',
        entityType: 'PrintJob',
        entityId: jobId,
        beforeValueJson: JSON.stringify({ direction, oldPos: targetJob.queuePosition || 'N/A' }),
        afterValueJson: JSON.stringify({ direction }),
        result: 'SUCCESS',
        ipAddress: identity.ipAddress,
        details: `Spooler queue reordered (${direction}) for job ${targetJob.jobNumber || targetJob.id}.`
      });
    }

    if (onShowToast && targetJob) {
      const dirText = direction === 'UP' ? 'moved up' : direction === 'DOWN' ? 'moved down' : 'promoted to front';
      onShowToast(`Print queue sequence: ${targetJob.jobNumber || targetJob.id} ${dirText}.`);
    }
  };

  // Helper to parse job date into a comparable timestamp
  const parseJobDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const cleanStr = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
      const isoLike = cleanStr.includes('T') ? cleanStr : cleanStr.replace(' ', 'T');
      const parsed = new Date(isoLike);
      if (!isNaN(parsed.getTime())) return parsed;
    }
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
    const startOfLast90Days = startOfToday - 90 * 86400000;

    return printJobs.filter((job) => {
      const matchQuery = matchesPrintJobSearchQuery(job, searchQuery);

      // Status Filter (ALL, SUCCESS / COMPLETED, FAILED, PENDING, CANCELLED, etc.)
      let matchStatus = true;
      if (statusFilter === 'ALL') {
        matchStatus = true;
      } else if (statusFilter === 'SUCCESS' || statusFilter === 'COMPLETED') {
        matchStatus = job.status === 'COMPLETED';
      } else if (statusFilter === 'FAILED') {
        matchStatus = job.status === 'FAILED';
      } else if (statusFilter === 'PENDING') {
        matchStatus = isJobPending(job);
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
          } else if (dateRangeFilter === 'LAST_90_DAYS') {
            matchDate = jobTime >= startOfLast90Days;
          } else if (dateRangeFilter === 'CUSTOM') {
            if (customStartDate) {
              const start = new Date(customStartDate + 'T00:00:00').getTime();
              if (jobTime < start) matchDate = false;
            }
            if (customEndDate) {
              const end = new Date(customEndDate + 'T23:59:59.999').getTime();
              if (jobTime > end) matchDate = false;
            }
          }
        } else {
          // Fallback if no parseable date
          if (dateRangeFilter === 'TODAY' || dateRangeFilter === 'LAST_7_DAYS' || dateRangeFilter === 'LAST_30_DAYS') {
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
    return printers.find((p) => p.id === reprintPrinterId) || printers[0] || VIRTUAL_FALLBACK_PRINTER;
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
      ) || printers[0] || VIRTUAL_FALLBACK_PRINTER;

      const payloadToSend =
        job.rawPayloadPreview ||
        `^XA\n^FO50,50^ADN,36,20^FDRETRY: ${job.jobName}^FS\n^FO50,110^BCN,100,Y,N,N^FD${job.id}^FS\n^PQ${job.copies || 1},0,1,Y\n^XZ`;
      const timestamp = new Date().toLocaleTimeString();

      if (isDesktopApp() && targetPrinter) {
        try {
          const network = extractNetworkHostPort(targetPrinter.address);
          const res = await desktopPrintLabel({
            printerName: targetPrinter.systemPrinterName || targetPrinter.name,
            printerType: resolveIPCPrinterType(targetPrinter),
            networkHost: network.host,
            networkPort: network.port,
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

    const targetPrinter = printers.find((p) => p.id === reprintPrinterId) || printers[0] || VIRTUAL_FALLBACK_PRINTER;
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
        const network = extractNetworkHostPort(targetPrinter.address);
        const desktopRes = await desktopPrintLabel({
          printerName: targetPrinter.systemPrinterName || targetPrinter.name,
          printerType: resolveIPCPrinterType(targetPrinter),
          networkHost: network.host,
          networkPort: network.port,
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

  // Trigger Re-Print Job Action (Handles single inspected job or multi-selected historical jobs)
  const handleTriggerReprintAction = () => {
    if (selectedJobIds.size === 0) {
      if (activeJob) {
        handleInitiateReprint(activeJob);
      } else {
        if (onShowToast) onShowToast('Please select at least one historical print job to re-print.');
      }
      return;
    }

    if (selectedJobIds.size === 1) {
      const selectedJob = printJobs.find(j => selectedJobIds.has(j.id));
      if (selectedJob) {
        handleInitiateReprint(selectedJob);
        return;
      }
    }

    // Multiple historical jobs selected -> open batch re-print modal
    setBatchReprintCopiesMode('ORIGINAL');
    setBatchCustomCopies(1);
    setBatchReprintReason('Immediate Reprint / Defective Media Replacement');
    setBatchCustomNote('');
    setBatchReprintResultNotice(null);
    setIsBatchReprintModalOpen(true);
  };

  // Execute Multi-Job Batch Re-Print sending each job back to its original printer profile
  const handleExecuteBatchReprint = async () => {
    const selectedJobsList = printJobs.filter(j => selectedJobIds.has(j.id));
    if (selectedJobsList.length === 0) return;

    setIsSubmittingBatchReprint(true);
    setBatchReprintProgress({ current: 0, total: selectedJobsList.length });
    setBatchReprintResultNotice(null);

    let successCount = 0;
    let failCount = 0;
    const newReprintJobs: PrintJob[] = [];
    const timestamp = new Date().toLocaleTimeString();
    const dateStr = new Date().toLocaleDateString();
    const targetPrintersSummary = new Set<string>();

    for (let i = 0; i < selectedJobsList.length; i++) {
      const job = selectedJobsList[i];
      setBatchReprintProgress({
        current: i + 1,
        total: selectedJobsList.length,
        currentJobName: job.jobName
      });

      // Look up and enforce the job's original printer profile
      const originalPrinter = getOriginalPrinterForJob(job);
      targetPrintersSummary.add(originalPrinter.displayName || originalPrinter.name);

      const copiesToSend = batchReprintCopiesMode === 'CUSTOM' ? batchCustomCopies : (job.copies || 1);
      const totalRecords = job.recordCount || 1;
      const totalQuantity = copiesToSend * totalRecords;
      const newJobId = `JOB-RP-${Date.now().toString().slice(-6)}-${i + 1}`;
      const newJobNumber = `PJ-RP${newJobId.slice(-4)}`;
      const payloadToSend =
        job.rawPayloadPreview ||
        `^XA\n^FO50,50^ADN,36,20^FDREPRINT: ${job.jobName}^FS\n^FO50,110^BCN,100,Y,N,N^FD${newJobId}^FS\n^PQ${copiesToSend},0,1,Y\n^XZ`;

      let jobStatus: PrintJobState = 'SENT_TO_PRINT_SERVICE';
      let integrationMethod = isDesktopApp() ? 'Direct Native Port 9100 / Spooler' : 'BarTender REST Spooler Simulation';
      let responseSummary = `Multi-job batch reprint dispatched to original printer profile (${originalPrinter.name}). Source Job Ref: ${job.id}. Reason: ${batchReprintReason}${batchCustomNote ? ` (${batchCustomNote})` : ''}.`;

      if (isDesktopApp()) {
        try {
          const network = extractNetworkHostPort(originalPrinter.address);
          const res = await desktopPrintLabel({
            printerName: originalPrinter.systemPrinterName || originalPrinter.name,
            printerType: resolveIPCPrinterType(originalPrinter),
            networkHost: network.host,
            networkPort: network.port,
            copies: copiesToSend,
            rawPayload: payloadToSend,
            jobName: `[BATCH-REPRINT] ${job.jobName}`
          });

          if (res.success) {
            successCount++;
            responseSummary = `Native Hardware Dispatch Success to original profile ${originalPrinter.name}: ${res.bytesWritten || payloadToSend.length} bytes transmitted.`;
          } else {
            failCount++;
            jobStatus = 'FAILED';
            responseSummary = `Native Hardware Dispatch Failed for ${originalPrinter.name}: ${res.error?.message || 'Device communication error.'}`;
          }
        } catch (err: any) {
          failCount++;
          jobStatus = 'FAILED';
          responseSummary = `Native bridge error transmitting to ${originalPrinter.name}: ${err.message}`;
        }
      } else {
        // Web simulation with short delay
        await new Promise(r => setTimeout(r, 120));
        successCount++;
      }

      const newJob: PrintJob = {
        id: newJobId,
        jobNumber: newJobNumber,
        jobType: 'REPRINT',
        jobName: `[REPRINT] ${job.jobName}`,
        requestedByUserId: 'usr-reprint',
        requestedByUserName: (currentUserRole as UserRole) === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Production Operator',
        userRole: (currentUserRole as UserRole) || 'PRINT_MANAGER',
        templateId: job.templateId,
        templateName: job.templateName,
        templateVersion: job.templateVersion,
        printerId: originalPrinter.id,
        printerName: originalPrinter.displayName || originalPrinter.name,
        requestedPrinterId: originalPrinter.id,
        actualPrinterId: originalPrinter.id,
        actualPrinterName: originalPrinter.name,
        fallbackPrinterUsed: false,
        copies: copiesToSend,
        recordCount: totalRecords,
        labelQuantity: totalQuantity,
        labelDataJson: job.labelDataJson,
        status: jobStatus,
        createdAt: `${dateStr} ${timestamp}`,
        sentAt: `${dateStr} ${timestamp}`,
        completedAt: jobStatus === 'SENT_TO_PRINT_SERVICE' ? `${dateStr} ${timestamp}` : undefined,
        outputLanguage: originalPrinter.language,
        rawPayloadPreview: payloadToSend,
        integrationMethod,
        integrationResponseSummary: responseSummary,
        originalPrintJobId: job.id,
        reprintReason: `${batchReprintReason}${batchCustomNote ? ` — ${batchCustomNote}` : ''}`,
        retryCount: 0,
        auditReference: `AUD-${Date.now().toString().slice(-6)}`
      };

      newReprintJobs.push(newJob);
    }

    // Prepend new jobs to history
    onUpdatePrintJobs([...newReprintJobs, ...printJobs]);

    if (onAddAuditLog) {
      const targetPrintersList = Array.from(targetPrintersSummary).join(', ');
      onAddAuditLog({
        id: `AUD-BATCH-RP-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toLocaleString(),
        userId: 'usr-batch-reprint',
        userName: (currentUserRole as UserRole) === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Production Operator',
        userRole: (currentUserRole as UserRole) || 'PRINT_MANAGER',
        action: 'PRINT_JOB_REPRINTED',
        entityType: 'PrintJobBatch',
        entityId: `BATCH-RP-${selectedJobsList.length}`,
        beforeValueJson: JSON.stringify({
          jobIds: selectedJobsList.map(j => j.id),
          totalJobs: selectedJobsList.length
        }),
        afterValueJson: JSON.stringify({
          newJobIds: newReprintJobs.map(j => j.id),
          targetPrinters: targetPrintersList,
          successCount,
          failCount,
          reason: batchReprintReason
        }),
        result: failCount === 0 ? 'SUCCESS' : 'FAILURE',
        details: `Batch re-printed ${selectedJobsList.length} historical print jobs to original printer profiles (${targetPrintersList}).`
      });
    }

    setIsSubmittingBatchReprint(false);
    setBatchReprintProgress(null);

    const printersStr = Array.from(targetPrintersSummary).join(', ');
    if (onShowToast) {
      onShowToast(
        `Re-printed ${selectedJobsList.length} ${selectedJobsList.length === 1 ? 'job' : 'jobs'} to original printer profiles (${printersStr}).`
      );
    }

    // Select the first newly created reprint job
    if (newReprintJobs.length > 0) {
      setSelectedJobId(newReprintJobs[0].id);
    }

    // Clear selection and close modal
    setSelectedJobIds(new Set());
    setIsBatchReprintModalOpen(false);
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
      case 'QUEUED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/80 border border-blue-600/60 text-blue-300">
            <RefreshCw className="w-3 h-3 mr-1 text-blue-400 animate-spin" />
            IN SPOOLER
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800/90 border border-zinc-600/70 text-zinc-400">
            <Ban className="w-3 h-3 mr-1 text-zinc-400" />
            CANCELLED
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

  const getPriorityBadge = (priority?: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW') => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-950/80 border border-rose-600/70 text-rose-300">
            <Flame className="w-2.5 h-2.5 mr-1 text-rose-400 fill-rose-400" />
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950/80 border border-amber-600/70 text-amber-300">
            <ArrowUp className="w-2.5 h-2.5 mr-0.5 text-amber-400" />
            HIGH
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-zinc-800/80 border border-zinc-700 text-zinc-400">
            <ArrowDown className="w-2.5 h-2.5 mr-0.5 text-zinc-500" />
            LOW
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-950/60 border border-blue-800/60 text-blue-300">
            NORMAL
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
                {pendingJobs.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/70 text-amber-300 text-[10px] font-mono flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>{pendingJobs.length} In Spooler Queue</span>
                  </span>
                )}
                {isDesktopApp() && (
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono">
                    Direct Port 9100 Spooling
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                Audit trail of industrial thermal output jobs with active queue management, parameter inspection, and hardware reprinting.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Status View Filtering Dropdown in Header */}
            <div
              className={`flex items-center space-x-1.5 bg-[#14161f] border rounded-lg px-2.5 py-1 text-xs transition-colors shadow-sm ${
                statusFilter !== 'ALL'
                  ? statusFilter === 'COMPLETED' || statusFilter === 'SUCCESS'
                    ? 'border-emerald-600/70 bg-emerald-950/20'
                    : statusFilter === 'FAILED'
                    ? 'border-rose-600/70 bg-rose-950/20'
                    : statusFilter === 'PENDING'
                    ? 'border-amber-600/70 bg-amber-950/20'
                    : 'border-blue-500/70'
                  : 'border-[#303546] hover:border-blue-500/50'
              }`}
            >
              {statusFilter === 'COMPLETED' || statusFilter === 'SUCCESS' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : statusFilter === 'FAILED' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : statusFilter === 'PENDING' ? (
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              ) : (
                <Filter className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
              <label
                htmlFor="batch-history-header-status-filter"
                className="text-gray-400 text-[11px] font-medium shrink-0 cursor-pointer"
              >
                Status:
              </label>
              <select
                id="batch-history-header-status-filter"
                aria-label="Filter print jobs by status: Success, Failed, or Pending"
                value={statusFilter === 'COMPLETED' ? 'SUCCESS' : statusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  const normalizedVal = val === 'SUCCESS' ? 'COMPLETED' : val;
                  setStatusFilter(normalizedVal);
                  if (activeTab === 'PENDING_QUEUE' && normalizedVal !== 'PENDING' && normalizedVal !== 'ALL') {
                    setActiveTab('QUEUE');
                  }
                }}
                className="bg-transparent text-gray-100 font-semibold text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-[#181a20] text-gray-200">
                  All Jobs ({totalJobsCount})
                </option>
                <option value="SUCCESS" className="bg-[#181a20] text-emerald-400 font-medium">
                  Success ({successJobsCount})
                </option>
                <option value="FAILED" className="bg-[#181a20] text-rose-400 font-medium">
                  Failed ({failedJobsCount})
                </option>
                <option value="PENDING" className="bg-[#181a20] text-amber-400 font-medium">
                  Pending ({pendingJobsCount})
                </option>
              </select>
            </div>

            {/* Re-Print Job Action Button */}
            <button
              id="batch-reprint-job-header-btn"
              onClick={handleTriggerReprintAction}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                selectedJobIds.size > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 shadow-blue-900/30'
                  : 'bg-[#252936] hover:bg-[#303546] text-blue-300 border border-blue-700/40 hover:text-white'
              }`}
              title={
                selectedJobIds.size > 0
                  ? `Re-send ${selectedJobIds.size} selected historical print jobs to their original printer profiles`
                  : 'Re-print inspected job or batch re-print selected jobs'
              }
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-300" />
              <span>
                {selectedJobIds.size > 0
                  ? `Re-Print Job (${selectedJobIds.size})`
                  : 'Re-Print Job'}
              </span>
            </button>

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

            {/* Tab 1: All Print History */}
            <button
              id="batch-print-history-tab-history"
              onClick={() => setActiveTab('QUEUE')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'QUEUE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-[#282c38]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Print History</span>
            </button>

            {/* Tab 2: Print Queue System */}
            <button
              id="batch-print-history-tab-queue"
              onClick={() => setActiveTab('PENDING_QUEUE')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                activeTab === 'PENDING_QUEUE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-[#282c38]'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Print Queue</span>
              {pendingJobs.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'PENDING_QUEUE'
                    ? 'bg-white text-blue-800'
                    : 'bg-amber-500/90 text-black animate-pulse'
                }`}>
                  {pendingJobs.length}
                </span>
              )}
            </button>

            {/* Tab 3: Print Analytics */}
            <button
              id="batch-print-history-tab-analytics"
              onClick={() => setActiveTab('STATISTICS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'STATISTICS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-[#282c38]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Print Analytics</span>
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

        {/* Filter Toolbar (Shared across Queue and Analytics tabs) */}
        <div className="px-6 py-2.5 bg-[#1a1c23] border-b border-[#2a2d39] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 flex-1 min-w-[280px]">
            <div className="relative w-full max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                id="batch-print-history-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Job ID, Printer Name, or User Name..."
                aria-label="Filter print logs by job ID, printer name, or user name in real-time"
                className="w-full pl-8 pr-8 py-1.5 bg-[#13151b] border border-[#2e3342] rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
              {searchQuery && (
                <button
                  id="batch-print-history-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 transition-colors"
                  title="Clear search query"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <span className="text-[11px] font-mono text-blue-400 shrink-0 bg-blue-950/70 border border-blue-800/50 px-2 py-0.5 rounded">
                {filteredJobs.length} match{filteredJobs.length === 1 ? '' : 'es'}
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Status Filter */}
            <div className="flex items-center space-x-1 bg-[#13151b] border border-[#2e3342] rounded-md px-2 py-1">
              <span className="text-gray-500 text-[11px]">Status:</span>
              <select
                id="batch-print-history-status-select"
                aria-label="Filter print jobs by status"
                value={statusFilter === 'COMPLETED' ? 'SUCCESS' : statusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setStatusFilter(val === 'SUCCESS' ? 'COMPLETED' : val);
                }}
                className="bg-transparent text-gray-300 font-medium text-[11px] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Statuses ({totalJobsCount})</option>
                <option value="SUCCESS">Success ({successJobsCount})</option>
                <option value="FAILED">Failed ({failedJobsCount})</option>
                <option value="PENDING">Pending / In Spooler ({pendingJobsCount})</option>
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
                <option value="LAST_90_DAYS">Last 90 Days</option>
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

        {/* Modal Body: Active Tab Switch */}
        {activeTab === 'STATISTICS' ? (
          <PrintStatisticsDashboard
            printJobs={filteredJobs}
            allPrintJobs={printJobs}
            printers={printers}
            dateRangeFilter={dateRangeFilter}
            onDateRangeFilterChange={setDateRangeFilter}
            customStartDate={customStartDate}
            onCustomStartDateChange={setCustomStartDate}
            customEndDate={customEndDate}
            onCustomEndDateChange={setCustomEndDate}
            onTriggerReprintJob={(job) => {
              setActiveTab('QUEUE');
              handleInitiateReprint(job);
            }}
          />
        ) : activeTab === 'PENDING_QUEUE' ? (
          /* DEDICATED PRINT QUEUE VIEW */
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT: Active Spooler Queue List */}
            <div className="w-1/2 border-r border-[#2a2d39] flex flex-col bg-[#14161c]">
              <div className="px-4 py-2.5 bg-[#181a22] border-b border-[#272a36] text-[11px] font-semibold text-gray-400 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ListOrdered className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-bold">ACTIVE SPOOLER QUEUE</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-700/60 text-blue-300 font-mono text-[10px]">
                    {pendingJobs.length} Pending
                  </span>
                </div>
                {pendingJobs.length > 0 && (
                  <button
                    onClick={handleCancelAllPending}
                    className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-[10px] font-semibold flex items-center space-x-1 transition-colors"
                    title="Cancel all pending jobs currently in the spooler"
                  >
                    <Ban className="w-3 h-3" />
                    <span>Cancel All Pending ({pendingJobs.length})</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-[#212430]">
                {pendingJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-gray-500">
                    <CheckCircle2 className="w-12 h-12 mb-3 text-emerald-500/60" />
                    <h3 className="text-sm font-semibold text-gray-300">Print Queue is Empty</h3>
                    <p className="text-[11px] text-gray-500 mt-1 max-w-sm">
                      All industrial print jobs have completed transmission to thermal hardware spoolers.
                    </p>
                    <button
                      onClick={() => setActiveTab('QUEUE')}
                      className="mt-4 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>View Print History</span>
                    </button>
                  </div>
                ) : (
                  pendingJobs.map((job, idx) => {
                    const isSelected = activeJob?.id === job.id;
                    const isUrgent = job.priority === 'URGENT';
                    const isHigh = job.priority === 'HIGH';

                    return (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`p-3.5 cursor-pointer transition-all border-l-4 flex flex-col space-y-2 group ${
                          isSelected
                            ? 'bg-[#1d222e] border-blue-500'
                            : isUrgent
                            ? 'bg-[#20171a]/50 hover:bg-[#20171a] border-rose-500/70'
                            : isHigh
                            ? 'bg-[#1f1d18]/50 hover:bg-[#1f1d18] border-amber-500/70'
                            : 'hover:bg-[#191c24] border-transparent'
                        }`}
                      >
                        {/* Top row: Queue position, Job Name, Priority, and Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              idx === 0
                                ? 'bg-emerald-950 border-emerald-600 text-emerald-300'
                                : 'bg-[#1a1d26] border-[#313749] text-gray-300'
                            }`}>
                              #{idx + 1} in Queue
                            </span>
                            <span className="font-mono text-xs font-bold text-white tracking-tight">
                              {job.jobNumber || job.id}
                            </span>
                            {getPriorityBadge(job.priority)}
                            {getStatusBadge(job.status)}
                          </div>

                          {/* Quick Cancel button */}
                          <button
                            onClick={(e) => handleCancelJob(job, e)}
                            className="px-2 py-1 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-700/50 text-rose-300 text-[10px] font-semibold flex items-center space-x-1 transition-colors"
                            title="Cancel this pending print job and remove from spooler"
                          >
                            <Ban className="w-2.5 h-2.5" />
                            <span>Cancel</span>
                          </button>
                        </div>

                        {/* Middle row: Job name and specs */}
                        <div className="flex items-center justify-between text-xs text-gray-300">
                          <div className="font-medium text-white group-hover:text-blue-300 transition-colors truncate max-w-[280px]">
                            {job.jobName}
                          </div>
                          <div className="text-[11px] font-mono text-gray-400">
                            {job.copies} {job.copies === 1 ? 'copy' : 'copies'}
                          </div>
                        </div>

                        {/* Bottom row: Printer & Reorder / Priority Controls */}
                        <div className="flex items-center justify-between pt-1 text-[11px] text-gray-400 border-t border-[#232734]">
                          <div className="flex items-center space-x-1.5 truncate">
                            <Printer className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate">{job.printerName}</span>
                            <span className="text-gray-600">•</span>
                            <span className="font-mono text-[10px] text-gray-500">{job.outputLanguage}</span>
                          </div>

                          {/* Reorder and Priority Actions */}
                          <div className="flex items-center space-x-1 shrink-0">
                            {/* Priority Selector Pill Dropdown */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenPriorityMenuJobId(openPriorityMenuJobId === job.id ? null : job.id);
                                }}
                                className="px-2 py-0.5 rounded bg-[#202534] hover:bg-[#2c3346] text-gray-300 hover:text-white text-[10px] font-medium border border-[#32394d] flex items-center space-x-1 transition-colors"
                                title="Change Queue Priority"
                              >
                                <span>Priority: {job.priority || 'NORMAL'}</span>
                                <ChevronDown className="w-2.5 h-2.5" />
                              </button>

                              {openPriorityMenuJobId === job.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 bottom-full mb-1 w-32 bg-[#1b1f2b] border border-[#373e52] rounded-lg shadow-xl z-30 py-1 divide-y divide-[#282f42] animate-in fade-in"
                                >
                                  <div className="px-2 py-1 text-[9px] text-gray-400 font-bold uppercase">
                                    Set Priority
                                  </div>
                                  <button
                                    onClick={(e) => handleChangePriority(job, 'URGENT', e)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-950/60 flex items-center space-x-1.5 font-bold"
                                  >
                                    <Flame className="w-3 h-3 text-rose-400 fill-rose-400" />
                                    <span>URGENT</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleChangePriority(job, 'HIGH', e)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-950/60 flex items-center space-x-1.5 font-semibold"
                                  >
                                    <ArrowUp className="w-3 h-3 text-amber-400" />
                                    <span>HIGH</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleChangePriority(job, 'NORMAL', e)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-blue-300 hover:bg-blue-950/60 flex items-center space-x-1.5"
                                  >
                                    <span>NORMAL</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleChangePriority(job, 'LOW', e)}
                                    className="w-full text-left px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800/60 flex items-center space-x-1.5"
                                  >
                                    <ArrowDown className="w-3 h-3 text-zinc-500" />
                                    <span>LOW</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Move Up */}
                            <button
                              onClick={(e) => handleReorderPending(job.id, 'UP', e)}
                              disabled={idx === 0}
                              className={`p-1 rounded text-[10px] border transition-colors ${
                                idx === 0
                                  ? 'text-gray-600 border-gray-800 bg-[#15171e] cursor-not-allowed'
                                  : 'text-gray-300 hover:text-white border-[#31374a] bg-[#202534] hover:bg-[#2b3348]'
                              }`}
                              title="Move Up in Spooler Queue"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>

                            {/* Move Down */}
                            <button
                              onClick={(e) => handleReorderPending(job.id, 'DOWN', e)}
                              disabled={idx === pendingJobs.length - 1}
                              className={`p-1 rounded text-[10px] border transition-colors ${
                                idx === pendingJobs.length - 1
                                  ? 'text-gray-600 border-gray-800 bg-[#15171e] cursor-not-allowed'
                                  : 'text-gray-300 hover:text-white border-[#31374a] bg-[#202534] hover:bg-[#2b3348]'
                              }`}
                              title="Move Down in Spooler Queue"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>

                            {/* Rush to Top */}
                            <button
                              onClick={(e) => handleReorderPending(job.id, 'TOP', e)}
                              disabled={idx === 0}
                              className={`px-1.5 py-1 rounded text-[10px] font-bold border transition-colors flex items-center space-x-0.5 ${
                                idx === 0
                                  ? 'text-gray-600 border-gray-800 bg-[#15171e] cursor-not-allowed'
                                  : 'text-amber-300 hover:text-white border-amber-600/60 bg-amber-950/60 hover:bg-amber-900'
                              }`}
                              title="Rush to Top (#1 in Queue)"
                            >
                              <Flame className="w-2.5 h-2.5 text-amber-400" />
                              <span>Top</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT: Detailed Configuration & Queue Control Panel */}
            <div className="w-1/2 flex flex-col bg-[#161820] overflow-y-auto">
              {activeJob ? (
                <div className="p-6 space-y-6">
                  {/* Active Queue Control Card (if job is pending) */}
                  {isJobPending(activeJob) && (
                    <div className="bg-gradient-to-r from-[#1c2333] to-[#1e1b2e] border border-blue-600/40 rounded-xl p-4 shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <ListOrdered className="w-4 h-4 text-blue-400" />
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Active Print Queue Controls
                          </h4>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-blue-950/90 border border-blue-700/60 text-blue-300 font-mono text-[11px] font-bold">
                          Queue Rank #{pendingJobs.findIndex(j => j.id === activeJob.id) + 1} of {pendingJobs.length}
                        </span>
                      </div>

                      {/* Quick Priority Selector */}
                      <div className="mb-4">
                        <label className="text-[11px] text-gray-400 block mb-1.5 font-semibold">
                          Queue Priority Level:
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map((p) => {
                            const isCurrent = (activeJob.priority || 'NORMAL') === p;
                            return (
                              <button
                                key={p}
                                onClick={(e) => handleChangePriority(activeJob, p, e)}
                                className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 border ${
                                  isCurrent
                                    ? p === 'URGENT'
                                      ? 'bg-rose-900 border-rose-500 text-white shadow-md'
                                      : p === 'HIGH'
                                      ? 'bg-amber-900 border-amber-500 text-white shadow-md'
                                      : p === 'LOW'
                                      ? 'bg-zinc-800 border-zinc-500 text-white shadow-md'
                                      : 'bg-blue-800 border-blue-500 text-white shadow-md'
                                    : 'bg-[#151822] border-[#292e3e] text-gray-400 hover:text-white hover:bg-[#202534]'
                                }`}
                              >
                                {p === 'URGENT' && <Flame className="w-3 h-3 text-rose-400 fill-rose-400" />}
                                {p === 'HIGH' && <ArrowUp className="w-3 h-3 text-amber-400" />}
                                {p === 'LOW' && <ArrowDown className="w-3 h-3 text-zinc-400" />}
                                <span>{p}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Reorder and Cancel Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#2d3448]">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => handleReorderPending(activeJob.id, 'UP', e)}
                            disabled={pendingJobs.findIndex(j => j.id === activeJob.id) === 0}
                            className="px-3 py-1.5 rounded-lg bg-[#242b3b] hover:bg-[#2f384d] disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-200 font-semibold flex items-center space-x-1 transition-colors"
                          >
                            <ArrowUp className="w-3 h-3" />
                            <span>Move Up</span>
                          </button>
                          <button
                            onClick={(e) => handleReorderPending(activeJob.id, 'DOWN', e)}
                            disabled={pendingJobs.findIndex(j => j.id === activeJob.id) === pendingJobs.length - 1}
                            className="px-3 py-1.5 rounded-lg bg-[#242b3b] hover:bg-[#2f384d] disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-200 font-semibold flex items-center space-x-1 transition-colors"
                          >
                            <ArrowDown className="w-3 h-3" />
                            <span>Move Down</span>
                          </button>
                          <button
                            onClick={(e) => handleReorderPending(activeJob.id, 'TOP', e)}
                            disabled={pendingJobs.findIndex(j => j.id === activeJob.id) === 0}
                            className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-amber-300 font-semibold border border-amber-600/50 flex items-center space-x-1 transition-colors"
                          >
                            <Flame className="w-3 h-3 text-amber-400" />
                            <span>Rush to #1</span>
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleCancelJob(activeJob, e)}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-semibold flex items-center space-x-1 shadow-md transition-colors"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Cancel Job</span>
                        </button>
                      </div>
                    </div>
                  )}

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
                            <span>Tracking: <strong className="text-gray-200">{activeJob.jobNumber || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {getStatusBadge(activeJob.status)}
                        {getPriorityBadge(activeJob.priority)}
                      </div>
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
                        <span className="text-gray-500 text-[11px] block">Target Industrial Hardware:</span>
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
                  </div>

                  {/* Hardware Print Telemetry Card */}
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
                  <ListOrdered className="w-12 h-12 mb-3 opacity-30 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-400">No Job Selected in Queue</h3>
                  <p className="text-xs text-gray-600 mt-1 max-w-sm">
                    Select any job from the queue list to inspect parameters, adjust priority, reorder spool sequence, or cancel.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Main Content Split: Left Job List (Print History) + Right Detailed Inspector */
          <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Scrollable Job List */}
          <div className="w-1/2 border-r border-[#2a2d39] flex flex-col bg-[#14161c]">
            {/* Active Queue Banner if pending jobs exist */}
            {pendingJobs.length > 0 && (
              <div className="px-4 py-2 bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border-b border-blue-700/40 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-blue-200 font-medium">
                    {pendingJobs.length} active print {pendingJobs.length === 1 ? 'job' : 'jobs'} currently queued in spooler
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('PENDING_QUEUE')}
                  className="px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] flex items-center space-x-1 shadow-sm transition-colors"
                >
                  <span>Manage Queue</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Sticky Multi-Job Selection Actions Bar */}
            {selectedJobIds.size > 0 && (
              <div className="px-4 py-2 bg-[#1e2333] border-b border-blue-500/40 flex items-center justify-between text-xs animate-in slide-in-from-top-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-white font-semibold">
                    {selectedJobIds.size} {selectedJobIds.size === 1 ? 'job' : 'jobs'} selected
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                    (Ready to re-send to original printer profiles)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleClearSelection}
                    className="px-2 py-1 rounded bg-[#2a3042] hover:bg-[#373e54] text-gray-300 text-[11px] font-medium transition-colors"
                  >
                    Deselect All
                  </button>
                  <button
                    id="batch-reprint-selected-btn"
                    onClick={handleTriggerReprintAction}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center space-x-1.5 shadow-md transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Re-Print Job ({selectedJobIds.size})</span>
                  </button>
                </div>
              </div>
            )}

            <div className="px-4 py-2 bg-[#181a22] border-b border-[#272a36] text-[11px] font-semibold text-gray-400 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Select All Checkbox */}
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="p-0.5 rounded text-gray-400 hover:text-white transition-colors"
                  title={
                    filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.has(j.id))
                      ? 'Deselect all filtered jobs'
                      : 'Select all filtered jobs'
                  }
                >
                  {filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.has(j.id)) ? (
                    <CheckSquare className="w-4 h-4 text-blue-400" />
                  ) : filteredJobs.some(j => selectedJobIds.has(j.id)) ? (
                    <MinusSquare className="w-4 h-4 text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-500" />
                  )}
                </button>

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
                <span className="w-8 text-center text-gray-500">THUMB</span>
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
                <span>TIMESTAMP &amp; ACTIONS</span>
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
                  const isActive = activeJob?.id === job.id;
                  const isChecked = selectedJobIds.has(job.id);
                  const isExpanded = expandedJobIds.has(job.id);
                  const isPending = isJobPending(job);
                  const associatedPrinter = printers.find(p => p.id === (job.actualPrinterId || job.printerId));

                  return (
                    <div
                      key={job.id}
                      className="border-b border-[#212430] last:border-b-0 transition-colors"
                    >
                      <div
                        onClick={() => {
                          setSelectedJobId(job.id);
                        }}
                        className={`px-3 py-3 cursor-pointer transition-all flex items-center justify-between group ${
                          isChecked
                            ? 'bg-[#192236] border-l-4 border-blue-400'
                            : isActive
                            ? 'bg-[#1e2330] border-l-4 border-blue-500'
                            : 'hover:bg-[#191c24]'
                        }`}
                      >
                        {/* Checkbox, Left Toggle & Thumbnail */}
                        <div className="flex items-center space-x-2 mr-2 shrink-0">
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => toggleJobSelection(job.id, e)}
                            className="p-1 rounded hover:bg-[#282d3c] text-gray-400 hover:text-white transition-colors"
                            title={isChecked ? 'Deselect job' : 'Select job for multi-job re-print'}
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                            )}
                          </button>

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
                          <div className="flex items-center space-x-2 mb-1 flex-wrap gap-y-1">
                            <span className="font-mono text-xs font-bold text-white tracking-tight">
                              {job.jobNumber || job.id}
                            </span>
                            <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                              {job.jobType || 'ON_DEMAND'}
                            </span>
                            {getPriorityBadge(job.priority)}
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

                            {/* Pending Job Specific Cancel and Priority Buttons */}
                            {isPending ? (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => handleCancelJob(job, e)}
                                  className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-[10px] font-semibold flex items-center space-x-0.5 shadow-sm transition-colors"
                                  title="Cancel print job from queue"
                                >
                                  <Ban className="w-2.5 h-2.5" />
                                  <span>Cancel</span>
                                </button>
                                <button
                                  onClick={(e) => handleInitiateReprint(job, e)}
                                  className="px-2 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-semibold flex items-center space-x-1 shadow-sm transition-colors"
                                  title="Duplicate / Re-Print this job"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Re-Print</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => handleInitiateReprint(job, e)}
                                className="px-2 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-semibold flex items-center space-x-1 shadow-sm transition-colors"
                                title="Direct Re-Print this job"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Re-Print</span>
                              </button>
                            )}
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
                {/* Active Queue Control Card (if inspected job is pending) */}
                {isJobPending(activeJob) && (
                  <div className="bg-gradient-to-r from-[#1c2333] to-[#1e1b2e] border border-blue-600/40 rounded-xl p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <ListOrdered className="w-4 h-4 text-blue-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Active Print Queue Controls
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-950/90 border border-blue-700/60 text-blue-300 font-mono text-[11px] font-bold">
                        Queue Rank #{pendingJobs.findIndex(j => j.id === activeJob.id) + 1} of {pendingJobs.length}
                      </span>
                    </div>

                    {/* Quick Priority Selector */}
                    <div className="mb-4">
                      <label className="text-[11px] text-gray-400 block mb-1.5 font-semibold">
                        Queue Priority Level:
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map((p) => {
                          const isCurrent = (activeJob.priority || 'NORMAL') === p;
                          return (
                            <button
                              key={p}
                              onClick={(e) => handleChangePriority(activeJob, p, e)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 border ${
                                isCurrent
                                  ? p === 'URGENT'
                                    ? 'bg-rose-900 border-rose-500 text-white shadow-md'
                                    : p === 'HIGH'
                                    ? 'bg-amber-900 border-amber-500 text-white shadow-md'
                                    : p === 'LOW'
                                    ? 'bg-zinc-800 border-zinc-500 text-white shadow-md'
                                    : 'bg-blue-800 border-blue-500 text-white shadow-md'
                                  : 'bg-[#151822] border-[#292e3e] text-gray-400 hover:text-white hover:bg-[#202534]'
                              }`}
                            >
                              {p === 'URGENT' && <Flame className="w-3 h-3 text-rose-400 fill-rose-400" />}
                              {p === 'HIGH' && <ArrowUp className="w-3 h-3 text-amber-400" />}
                              {p === 'LOW' && <ArrowDown className="w-3 h-3 text-zinc-400" />}
                              <span>{p}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reorder and Cancel Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#2d3448]">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => handleReorderPending(activeJob.id, 'UP', e)}
                          disabled={pendingJobs.findIndex(j => j.id === activeJob.id) === 0}
                          className="px-3 py-1.5 rounded-lg bg-[#242b3b] hover:bg-[#2f384d] disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-200 font-semibold flex items-center space-x-1 transition-colors"
                        >
                          <ArrowUp className="w-3 h-3" />
                          <span>Move Up</span>
                        </button>
                        <button
                          onClick={(e) => handleReorderPending(activeJob.id, 'DOWN', e)}
                          disabled={pendingJobs.findIndex(j => j.id === activeJob.id) === pendingJobs.length - 1}
                          className="px-3 py-1.5 rounded-lg bg-[#242b3b] hover:bg-[#2f384d] disabled:opacity-40 disabled:cursor-not-allowed text-xs text-gray-200 font-semibold flex items-center space-x-1 transition-colors"
                        >
                          <ArrowDown className="w-3 h-3" />
                          <span>Move Down</span>
                        </button>
                        <button
                          onClick={(e) => handleReorderPending(activeJob.id, 'TOP', e)}
                          disabled={pendingJobs.findIndex(j => j.id === activeJob.id) === 0}
                          className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 disabled:opacity-40 disabled:cursor-not-allowed text-xs text-amber-300 font-semibold border border-amber-600/50 flex items-center space-x-1 transition-colors"
                        >
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Rush to #1</span>
                        </button>
                      </div>

                      <button
                        onClick={(e) => handleCancelJob(activeJob, e)}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-semibold flex items-center space-x-1 shadow-md transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel Job</span>
                      </button>
                    </div>
                  </div>
                )}

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

      {/* Batch Re-Print Modal (Multi-job routing to original printer profiles) */}
      {isBatchReprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1c1f28] border border-[#333849] rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden text-gray-200">
            {/* Modal Header */}
            <div className="h-14 px-6 bg-[#232733] border-b border-[#333849] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Batch Re-Print Dispatcher
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-600/70 text-blue-300 text-[10px] font-mono font-bold">
                      {selectedJobIds.size} Jobs Selected
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Re-send multiple historical jobs back to their original factory printer profiles.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingBatchReprint) setIsBatchReprintModalOpen(false);
                }}
                className="p-1.5 rounded-lg hover:bg-[#303546] text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Selected Jobs & Original Printer Target Table */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                  Destination Printer Routing Map ({selectedJobIds.size} Historical Jobs):
                </label>
                <div className="bg-[#14161c] border border-[#2c303f] rounded-xl overflow-hidden divide-y divide-[#222634] max-h-48 overflow-y-auto">
                  {printJobs
                    .filter(j => selectedJobIds.has(j.id))
                    .map((job) => {
                      const origPrinter = getOriginalPrinterForJob(job);
                      return (
                        <div key={job.id} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            <span className="font-mono text-[11px] font-bold text-blue-400 shrink-0">
                              {job.jobNumber || job.id}
                            </span>
                            <span className="text-gray-200 truncate font-medium">
                              {job.jobName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">
                              {job.copies} {job.copies === 1 ? 'orig copy' : 'orig copies'}
                            </span>
                            <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-950/80 border border-blue-700/60 text-blue-300 text-[10px] font-medium">
                              <Printer className="w-3 h-3 text-blue-400" />
                              <span className="font-mono">{origPrinter.displayName || origPrinter.name}</span>
                              <span className="text-[9px] text-gray-400">({origPrinter.language})</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Copies Configuration Mode */}
              <div className="bg-[#181a22] border border-[#2c303f] rounded-xl p-4 space-y-3">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Re-Print Copies Configuration:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBatchReprintCopiesMode('ORIGINAL')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      batchReprintCopiesMode === 'ORIGINAL'
                        ? 'bg-blue-950/60 border-blue-500 text-white shadow-md'
                        : 'bg-[#14161c] border-[#2c303f] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Original Copies</span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${batchReprintCopiesMode === 'ORIGINAL' ? 'border-blue-400 bg-blue-500' : 'border-gray-600'}`}>
                        {batchReprintCopiesMode === 'ORIGINAL' && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Retain each historical print job's original copy count.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchReprintCopiesMode('CUSTOM')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      batchReprintCopiesMode === 'CUSTOM'
                        ? 'bg-blue-950/60 border-blue-500 text-white shadow-md'
                        : 'bg-[#14161c] border-[#2c303f] text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white">Uniform Custom Copies</span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${batchReprintCopiesMode === 'CUSTOM' ? 'border-blue-400 bg-blue-500' : 'border-gray-600'}`}>
                        {batchReprintCopiesMode === 'CUSTOM' && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Apply a fixed quantity of copies across all selected jobs.
                    </p>
                  </button>
                </div>

                {batchReprintCopiesMode === 'CUSTOM' && (
                  <div className="pt-2 flex items-center space-x-3">
                    <label className="text-xs text-gray-300 font-medium">
                      Copies Per Job:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={batchCustomCopies}
                      onChange={(e) => setBatchCustomCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 bg-[#14161c] border border-[#2c303f] rounded-lg px-2.5 py-1 text-white font-mono text-center font-bold text-sm focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center space-x-1">
                      {[1, 2, 5, 10].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setBatchCustomCopies(cnt)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                            batchCustomCopies === cnt
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-[#252834] text-gray-300 hover:bg-[#313545]'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reason & Authorization */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Audit Authorization Reason:
                  </label>
                  <select
                    value={batchReprintReason}
                    onChange={(e) => setBatchReprintReason(e.target.value)}
                    className="w-full bg-[#14161c] border border-[#2c303f] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
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
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
                    Operator Audit Note (Optional):
                  </label>
                  <input
                    type="text"
                    value={batchCustomNote}
                    onChange={(e) => setBatchCustomNote(e.target.value)}
                    placeholder="e.g., Authorized batch replacement for Work Order #10492"
                    className="w-full bg-[#14161c] border border-[#2c303f] rounded-xl px-3 py-2 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Submitting Progress Indicator */}
              {isSubmittingBatchReprint && batchReprintProgress && (
                <div className="p-3.5 rounded-xl bg-blue-950/60 border border-blue-600/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-200 font-semibold flex items-center space-x-2">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                      <span>
                        Transmitting Job {batchReprintProgress.current} of {batchReprintProgress.total}...
                      </span>
                    </span>
                    <span className="font-mono text-blue-300 font-bold">
                      {Math.round((batchReprintProgress.current / batchReprintProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-blue-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-200"
                      style={{
                        width: `${(batchReprintProgress.current / batchReprintProgress.total) * 100}%`
                      }}
                    />
                  </div>
                  {batchReprintProgress.currentJobName && (
                    <p className="text-[11px] text-blue-300 font-mono truncate">
                      Job: {batchReprintProgress.currentJobName}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#232733] border-t border-[#333849] flex items-center justify-between">
              <div className="text-[11px] text-gray-400">
                {isDesktopApp() ? (
                  <span className="text-emerald-400 font-mono">● Direct Windows Port 9100 / Spooler</span>
                ) : (
                  <span className="text-blue-400 font-mono">● REST Spooler Simulation</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isSubmittingBatchReprint}
                  onClick={() => setIsBatchReprintModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#2a3042] hover:bg-[#373e54] text-gray-300 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="batch-reprint-modal-confirm-btn"
                  disabled={isSubmittingBatchReprint || selectedJobIds.size === 0}
                  onClick={handleExecuteBatchReprint}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-900/30 transition-colors disabled:opacity-50"
                >
                  {isSubmittingBatchReprint ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Re-Printing Jobs ({batchReprintProgress?.current || 0}/{selectedJobIds.size})...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Re-Send {selectedJobIds.size} {selectedJobIds.size === 1 ? 'Job' : 'Jobs'} to Original Printers</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
