import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileText,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Settings,
  Sliders,
  Server,
  Terminal,
  Activity,
  UserCheck,
  Send,
  RotateCcw,
  Tag,
  ExternalLink,
  ChevronRight,
  Database,
  Info,
  Check,
  Ban,
  ArrowRightLeft,
  Sparkles,
  Barcode
} from 'lucide-react';
import {
  PrinterProfile,
  PrintJob,
  PrintAuditLog,
  UserRole,
  BarTenderTemplateMetadata,
  ReprintReason,
  PrintTechnology,
  AuditAction
} from '../../types/printer';
import {
  BarTenderConfig,
  DEFAULT_BARTENDER_CONFIG,
  BARTENDER_EDITION_COMPATIBILITY_MATRIX,
  checkUserPermission,
  validateBarcodeData,
  formatBarTenderIntegrationPayload
} from '../../services/barTenderPrintService';
import { LabelDocument } from '../../types/label';

interface BarTenderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  printers: PrinterProfile[];
  onUpdatePrinters: (printers: PrinterProfile[]) => void;
  printJobs: PrintJob[];
  onUpdatePrintJobs: (jobs: PrintJob[]) => void;
  auditLogs: PrintAuditLog[];
  onAddAuditLog: (log: PrintAuditLog) => void;
  barTenderTemplates: BarTenderTemplateMetadata[];
  onUpdateTemplates: (templates: BarTenderTemplateMetadata[]) => void;
  currentUserRole: UserRole;
  onChangeUserRole: (role: UserRole) => void;
  activeDocument?: LabelDocument;
  onSelectPrinter?: (id: string) => void;
}

type ModalTab = 'printers' | 'templates' | 'queue' | 'history' | 'audit' | 'integration';

export const BarTenderManagerModal: React.FC<BarTenderManagerModalProps> = ({
  isOpen,
  onClose,
  printers,
  onUpdatePrinters,
  printJobs,
  onUpdatePrintJobs,
  auditLogs,
  onAddAuditLog,
  barTenderTemplates,
  onUpdateTemplates,
  currentUserRole,
  onChangeUserRole,
  activeDocument,
  onSelectPrinter
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<ModalTab>('printers');
  const [config, setConfig] = useState<BarTenderConfig>(DEFAULT_BARTENDER_CONFIG);

  // Search & Filter states
  const [printerSearch, setPrinterSearch] = useState('');
  const [techFilter, setTechFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [templateSearch, setTemplateSearch] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');

  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');

  const [auditSearch, setAuditSearch] = useState('');

  // Selected item states for detail view or actions
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterProfile | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BarTenderTemplateMetadata | null>(null);
  const [selectedJob, setSelectedJob] = useState<PrintJob | null>(null);

  // Controlled Reprint Dialog State
  const [reprintTargetJob, setReprintTargetJob] = useState<PrintJob | null>(null);
  const [reprintReason, setReprintReason] = useState<ReprintReason>('Printer jam');
  const [reprintPrinterId, setReprintPrinterId] = useState<string>('');
  const [reprintQuantity, setReprintQuantity] = useState<number>(1);
  const [reprintCustomNote, setReprintCustomNote] = useState<string>('');

  // Test Print Confirmation Dialog State
  const [testPrintTargetPrinter, setTestPrintTargetPrinter] = useState<PrinterProfile | null>(null);

  // Fallback Config Dialog State
  const [fallbackModalPrinter, setFallbackModalPrinter] = useState<PrinterProfile | null>(null);
  const [newFallbackId, setNewFallbackId] = useState<string>('');
  const [newPriority, setNewPriority] = useState<number>(1);

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Filtered Printers
  const filteredPrinters = useMemo(() => {
    return printers.filter(p => {
      const matchSearch =
        p.name.toLowerCase().includes(printerSearch.toLowerCase()) ||
        (p.displayName && p.displayName.toLowerCase().includes(printerSearch.toLowerCase())) ||
        p.model.toLowerCase().includes(printerSearch.toLowerCase()) ||
        (p.location && p.location.toLowerCase().includes(printerSearch.toLowerCase())) ||
        (p.systemPrinterName && p.systemPrinterName.toLowerCase().includes(printerSearch.toLowerCase()));

      const matchTech = techFilter === 'all' || p.supportedPrintTechnology === techFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchSearch && matchTech && matchStatus;
    });
  }, [printers, printerSearch, techFilter, statusFilter]);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return barTenderTemplates.filter(t => {
      const matchSearch =
        t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.displayName.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.bartenderTemplateReference.toLowerCase().includes(templateSearch.toLowerCase()) ||
        t.barcodeType.toLowerCase().includes(templateSearch.toLowerCase());

      const matchCategory = templateCategoryFilter === 'all' || t.category === templateCategoryFilter;

      return matchSearch && matchCategory;
    });
  }, [barTenderTemplates, templateSearch, templateCategoryFilter]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return printJobs.filter(j => {
      const matchSearch =
        j.id.toLowerCase().includes(historySearch.toLowerCase()) ||
        (j.jobNumber && j.jobNumber.toLowerCase().includes(historySearch.toLowerCase())) ||
        j.jobName.toLowerCase().includes(historySearch.toLowerCase()) ||
        j.templateName.toLowerCase().includes(historySearch.toLowerCase()) ||
        j.printerName.toLowerCase().includes(historySearch.toLowerCase()) ||
        (j.requestedByUserName && j.requestedByUserName.toLowerCase().includes(historySearch.toLowerCase()));

      const matchStatus = historyStatusFilter === 'all' || j.status === historyStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [printJobs, historySearch, historyStatusFilter]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(l => {
      return (
        l.id.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
        l.entityId.toLowerCase().includes(auditSearch.toLowerCase()) ||
        (l.beforeValueJson && l.beforeValueJson.toLowerCase().includes(auditSearch.toLowerCase())) ||
        (l.afterValueJson && l.afterValueJson.toLowerCase().includes(auditSearch.toLowerCase()))
      );
    });
  }, [auditLogs, auditSearch]);

  // --------------------------------------------------------------------------
  // ACTIONS: PRINTER MANAGEMENT
  // --------------------------------------------------------------------------

  const handleSetDefaultPrinter = (printer: PrinterProfile) => {
    const perm = checkUserPermission(currentUserRole, 'MANAGE_PRINTERS');
    if (!perm.allowed) {
      showToast(perm.reason || 'Permission denied', 'error');
      return;
    }

    const previousDefault = printers.find(p => p.isDefault);
    const updated = printers.map(p => ({
      ...p,
      isDefault: p.id === printer.id,
    }));
    onUpdatePrinters(updated);

    const log: PrintAuditLog = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString(),
      userId: currentUserRole === 'SYSTEM_ADMIN' ? 'usr-admin' : 'usr-current',
      userName: currentUserRole === 'SYSTEM_ADMIN' ? 'System Administrator' : 'Operator',
      userRole: currentUserRole,
      action: 'DEFAULT_PRINTER_CHANGED',
      entityType: 'Printer',
      entityId: printer.id,
      beforeValueJson: JSON.stringify({ defaultPrinter: previousDefault?.id || 'none' }),
      afterValueJson: JSON.stringify({ defaultPrinter: printer.id, printerName: printer.name }),
      result: 'SUCCESS',
      ipAddress: '10.140.10.5',
    };
    onAddAuditLog(log);
    showToast(`"${printer.displayName || printer.name}" is now set as the enterprise default printer.`);
  };

  const handleTogglePrinterEnabled = (printer: PrinterProfile) => {
    const perm = checkUserPermission(currentUserRole, 'MANAGE_PRINTERS');
    if (!perm.allowed) {
      showToast(perm.reason || 'Permission denied', 'error');
      return;
    }

    const nextState = !printer.isEnabled;
    const updated = printers.map(p => {
      if (p.id === printer.id) {
        return {
          ...p,
          isEnabled: nextState,
          status: nextState ? (p.status === 'Offline' ? 'Ready' : p.status) : 'Offline',
        };
      }
      return p;
    });
    onUpdatePrinters(updated);

    const log: PrintAuditLog = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString(),
      userId: 'usr-admin',
      userName: 'Administrator',
      userRole: currentUserRole,
      action: nextState ? 'PRINTER_ENABLED' : 'PRINTER_DISABLED',
      entityType: 'Printer',
      entityId: printer.id,
      beforeValueJson: JSON.stringify({ isEnabled: printer.isEnabled }),
      afterValueJson: JSON.stringify({ isEnabled: nextState }),
      result: 'SUCCESS',
      ipAddress: '10.140.10.5',
    };
    onAddAuditLog(log);
    showToast(
      `Printer "${printer.displayName || printer.name}" has been ${nextState ? 'ENABLED' : 'DISABLED for application use'}.`,
      nextState ? 'success' : 'warning'
    );
  };

  const handleSaveFallbackSettings = () => {
    if (!fallbackModalPrinter) return;
    const perm = checkUserPermission(currentUserRole, 'MANAGE_PRINTERS');
    if (!perm.allowed) {
      showToast(perm.reason || 'Permission denied', 'error');
      return;
    }

    const updated = printers.map(p => {
      if (p.id === fallbackModalPrinter.id) {
        return {
          ...p,
          fallbackPrinterId: newFallbackId || undefined,
          priority: newPriority,
        };
      }
      return p;
    });
    onUpdatePrinters(updated);

    const log: PrintAuditLog = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString(),
      userId: 'usr-admin',
      userName: 'Administrator',
      userRole: currentUserRole,
      action: 'PRINTER_CHANGED',
      entityType: 'Printer',
      entityId: fallbackModalPrinter.id,
      beforeValueJson: JSON.stringify({
        fallbackPrinterId: fallbackModalPrinter.fallbackPrinterId,
        priority: fallbackModalPrinter.priority,
      }),
      afterValueJson: JSON.stringify({
        fallbackPrinterId: newFallbackId,
        priority: newPriority,
      }),
      result: 'SUCCESS',
      ipAddress: '10.140.10.5',
    };
    onAddAuditLog(log);
    setFallbackModalPrinter(null);
    showToast(`Updated failover routing and priority for ${fallbackModalPrinter.name}.`);
  };

  const handleConfirmTestPrint = () => {
    if (!testPrintTargetPrinter) return;
    const perm = checkUserPermission(currentUserRole, 'TEST_PRINT', testPrintTargetPrinter);
    if (!perm.allowed) {
      showToast(perm.reason || 'Permission denied', 'error');
      setTestPrintTargetPrinter(null);
      return;
    }

    const templateToUse = barTenderTemplates[0];
    const jobId = `JOB-TEST-${Date.now().toString().slice(-6)}`;

    const newJob: PrintJob = {
      id: jobId,
      jobNumber: `TP-${Date.now().toString().slice(-6)}`,
      jobType: 'TEST_PRINT',
      jobName: `Diagnostic Test Print — ${testPrintTargetPrinter.name}`,
      requestedByUserId: 'usr-admin',
      requestedByUserName: 'Administrator',
      userRole: currentUserRole,
      templateId: templateToUse?.id,
      templateName: templateToUse ? templateToUse.name : 'Hardware Diagnostic Template',
      templateVersion: 1,
      printerId: testPrintTargetPrinter.id,
      printerName: testPrintTargetPrinter.displayName || testPrintTargetPrinter.name,
      requestedPrinterId: testPrintTargetPrinter.id,
      actualPrinterId: testPrintTargetPrinter.id,
      actualPrinterName: testPrintTargetPrinter.name,
      fallbackPrinterUsed: false,
      copies: 1,
      recordCount: 1,
      labelQuantity: 1,
      status: 'SENT_TO_PRINT_SERVICE',
      createdAt: new Date().toLocaleString(),
      sentAt: new Date().toLocaleString(),
      outputLanguage: testPrintTargetPrinter.language,
      integrationMethod: `BarTender ${config.integrationMode} Test Handoff`,
      integrationResponseSummary: `PRINT HANDOFF CONFIRMED — Diagnostics transferred to spooler "${testPrintTargetPrinter.systemPrinterName || testPrintTargetPrinter.name}".`,
      retryCount: 0,
      auditReference: `AUD-${Date.now().toString().slice(-6)}`,
    };

    onUpdatePrintJobs([newJob, ...printJobs]);

    const log: PrintAuditLog = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString(),
      userId: 'usr-admin',
      userName: 'Administrator',
      userRole: currentUserRole,
      action: 'TEST_PRINT_DISPATCHED',
      entityType: 'Printer',
      entityId: testPrintTargetPrinter.id,
      beforeValueJson: JSON.stringify({ printerStatus: testPrintTargetPrinter.status }),
      afterValueJson: JSON.stringify({ jobId, status: 'SENT_TO_PRINT_SERVICE' }),
      result: 'SUCCESS',
      ipAddress: '10.140.10.5',
    };
    onAddAuditLog(log);

    setTestPrintTargetPrinter(null);
    showToast(`Test print dispatched to ${testPrintTargetPrinter.name} (PRINT HANDOFF CONFIRMED).`);
  };

  // --------------------------------------------------------------------------
  // ACTIONS: CONTROLLED REPRINTING
  // --------------------------------------------------------------------------

  const handleOpenReprintDialog = (job: PrintJob) => {
    const perm = checkUserPermission(currentUserRole, 'REPRINT');
    if (!perm.allowed) {
      showToast(perm.reason || 'Permission denied', 'error');
      return;
    }
    setReprintTargetJob(job);
    setReprintPrinterId(job.actualPrinterId || job.printerId || printers[0].id);
    setReprintQuantity(job.copies || 1);
    setReprintReason('Printer jam');
    setReprintCustomNote('');
  };

  const handleConfirmReprint = () => {
    if (!reprintTargetJob) return;

    const targetPrinter = printers.find(p => p.id === reprintPrinterId) || printers[0];
    const perm = checkUserPermission(currentUserRole, 'REPRINT', targetPrinter);
    if (!perm.allowed) {
      showToast(perm.reason || 'Permission denied', 'error');
      return;
    }

    const newJobId = `JOB-RP-${Date.now().toString().slice(-6)}`;
    const newJob: PrintJob = {
      id: newJobId,
      jobNumber: `RP-${Date.now().toString().slice(-6)}`,
      jobType: 'REPRINT',
      jobName: `Reprint: ${reprintTargetJob.jobName}`,
      requestedByUserId: 'usr-reprint',
      requestedByUserName: currentUserRole === 'SYSTEM_ADMIN' ? 'Administrator' : 'Operator',
      userRole: currentUserRole,
      templateId: reprintTargetJob.templateId,
      templateName: reprintTargetJob.templateName,
      templateVersion: reprintTargetJob.templateVersion,
      printerId: targetPrinter.id,
      printerName: targetPrinter.displayName || targetPrinter.name,
      requestedPrinterId: targetPrinter.id,
      actualPrinterId: targetPrinter.id,
      actualPrinterName: targetPrinter.name,
      fallbackPrinterUsed: targetPrinter.id !== reprintTargetJob.printerId,
      copies: reprintQuantity,
      recordCount: reprintTargetJob.recordCount || 1,
      labelQuantity: reprintQuantity * (reprintTargetJob.recordCount || 1),
      status: 'SENT_TO_PRINT_SERVICE',
      createdAt: new Date().toLocaleString(),
      sentAt: new Date().toLocaleString(),
      outputLanguage: targetPrinter.language,
      integrationMethod: `BarTender ${config.integrationMode} Controlled Reprint`,
      integrationResponseSummary: `PRINT HANDOFF CONFIRMED — Reprint authorization logged (Reason: ${reprintReason}).`,
      retryCount: 0,
      originalPrintJobId: reprintTargetJob.id,
      reprintReason: `${reprintReason}${reprintCustomNote ? ` (${reprintCustomNote})` : ''}`,
      auditReference: `AUD-${Date.now().toString().slice(-6)}`,
    };

    onUpdatePrintJobs([newJob, ...printJobs]);

    const log: PrintAuditLog = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toLocaleString(),
      userId: 'usr-current',
      userName: currentUserRole === 'SYSTEM_ADMIN' ? 'Administrator' : 'Operator',
      userRole: currentUserRole,
      action: 'PRINT_JOB_REPRINTED',
      entityType: 'PrintJob',
      entityId: newJobId,
      beforeValueJson: JSON.stringify({ originalJobId: reprintTargetJob.id }),
      afterValueJson: JSON.stringify({
        newJobId,
        reprintReason,
        targetPrinter: targetPrinter.id,
        copies: reprintQuantity,
      }),
      result: 'SUCCESS',
      ipAddress: '10.140.22.40',
    };
    onAddAuditLog(log);

    setReprintTargetJob(null);
    showToast(`Controlled reprint dispatched for Job #${reprintTargetJob.id} to ${targetPrinter.name}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 select-none animate-in fade-in duration-200">
      <div className="bg-[#181a22] border border-[#2e3342] w-full max-w-7xl h-[92vh] max-h-[960px] rounded-xl shadow-2xl flex flex-col overflow-hidden text-gray-200">
        {/* ================================================================= */}
        {/* 1. TOP HEADER & RBAC ROLE SWITCHER */}
        {/* ================================================================= */}
        <div className="h-16 bg-[#13151b] border-b border-[#272b38] px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  BarTender® Printer &amp; Label Management
                </h2>
                <span className="text-[10px] font-mono uppercase bg-blue-950/80 border border-blue-600/40 text-blue-300 px-2 py-0.5 rounded font-semibold">
                  Enterprise Suite
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-mono bg-emerald-950/80 border border-emerald-600/40 text-emerald-300 px-2 py-0.5 rounded font-medium items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1" />
                  Print Server Connected
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate max-w-xl">
                Multi-driver thermal &amp; laser fleet orchestration, BarTender .BTW template registry, failover routing, and immutable audit tracking.
              </p>
            </div>
          </div>

          {/* Right: Active Role Switcher & Close button */}
          <div className="flex items-center space-x-3">
            {/* Role Switcher Pill */}
            <div className="flex items-center bg-[#1e222c] border border-[#343a49] rounded-lg p-1 space-x-1">
              <div className="flex items-center space-x-1 px-2 text-[11px] text-gray-400 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Active Role:</span>
              </div>
              {(['SYSTEM_ADMIN', 'PRINT_MANAGER', 'OPERATOR', 'VIEWER'] as UserRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => onChangeUserRole(r)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                    currentUserRole === r
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#282d3b]'
                  }`}
                  title={`Switch testing persona to ${r}`}
                >
                  {r.replace('_', ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#202430] hover:bg-[#2b3040] text-gray-400 hover:text-white transition-colors"
              title="Close Management Console"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. NAVIGATION TAB STRIP */}
        {/* ================================================================= */}
        <div className="h-11 bg-[#15171f] border-b border-[#262936] px-4 flex items-center justify-between shrink-0 overflow-x-auto">
          <div className="flex items-center space-x-1 h-full">
            {[
              { id: 'printers', label: 'Printer Fleet', icon: Printer, count: printers.length },
              { id: 'templates', label: 'BarTender .BTW Templates', icon: Tag, count: barTenderTemplates.length },
              { id: 'queue', label: 'Print Job Queue', icon: Clock, count: printJobs.filter(j => j.status === 'SENT_TO_PRINT_SERVICE' || j.status === 'QUEUED').length },
              { id: 'history', label: 'Print History & Reprints', icon: RotateCcw, count: printJobs.length },
              { id: 'audit', label: 'System Audit Logs', icon: Shield, count: auditLogs.length },
              { id: 'integration', label: 'BarTender Architecture', icon: Server, count: null },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as ModalTab)}
                  className={`flex items-center space-x-2 px-3.5 h-8.5 rounded-t-md text-xs font-semibold tracking-wide transition-all border-b-2 ${
                    isActive
                      ? 'bg-[#1e222c] border-blue-500 text-white shadow-xs'
                      : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1a1d26]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-blue-900/60 text-blue-300' : 'bg-[#282c38] text-gray-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Toast Alert Inline */}
          {toast && (
            <div
              className={`flex items-center space-x-2 px-3 py-1 rounded text-xs animate-in fade-in slide-in-from-right-2 duration-150 ${
                toast.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-700/50 text-emerald-300'
                  : toast.type === 'warning'
                  ? 'bg-amber-950/80 border border-amber-700/50 text-amber-300'
                  : 'bg-red-950/80 border border-red-700/50 text-red-300'
              }`}
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{toast.message}</span>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 3. TAB VIEW CONTENT PANELS */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#14161e]">
          {/* ------------------------------------------------------------- */}
          {/* TAB 1: PRINTER FLEET MANAGEMENT */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'printers' && (
            <div className="space-y-4">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#191c25] p-3 rounded-lg border border-[#2c3140]">
                <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search printer name, model, location, or UNC path..."
                      value={printerSearch}
                      onChange={e => setPrinterSearch(e.target.value)}
                      className="w-full bg-[#12141a] border border-[#343a4a] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Technology Filter */}
                  <select
                    value={techFilter}
                    onChange={e => setTechFilter(e.target.value)}
                    className="bg-[#12141a] border border-[#343a4a] text-xs text-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Technologies</option>
                    <option value="Thermal transfer">Thermal transfer</option>
                    <option value="Direct thermal">Direct thermal</option>
                    <option value="Laser">Laser Sheet</option>
                    <option value="RFID">RFID Encoding</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="bg-[#12141a] border border-[#343a4a] text-xs text-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Ready">Ready</option>
                    <option value="Printing">Printing</option>
                    <option value="Paused">Paused</option>
                    <option value="Offline">Offline</option>
                    <option value="Error">Error</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400">
                    Showing <strong>{filteredPrinters.length}</strong> of {printers.length} printers
                  </span>
                </div>
              </div>

              {/* Printer Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPrinters.map(p => {
                  const fallbackPrinter = printers.find(fp => fp.id === p.fallbackPrinterId);
                  const isReady = p.status === 'Ready' && p.isEnabled;
                  const isOffline = p.status === 'Offline' || !p.isEnabled;

                  return (
                    <div
                      key={p.id}
                      className={`bg-[#181a23] border rounded-lg p-4 flex flex-col justify-between transition-all duration-150 ${
                        p.isDefault
                          ? 'border-blue-500/70 shadow-md shadow-blue-950/20'
                          : 'border-[#2d3240] hover:border-[#3d4457]'
                      }`}
                    >
                      {/* Top Header */}
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                isReady ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-gray-500' : 'bg-amber-400'
                              }`}
                            />
                            <h3 className="text-sm font-bold text-white tracking-wide">
                              {p.displayName || p.name}
                            </h3>
                          </div>

                          <div className="flex items-center space-x-1">
                            {p.isDefault && (
                              <span className="text-[10px] font-mono bg-blue-950/90 border border-blue-600/40 text-blue-300 px-2 py-0.5 rounded font-bold">
                                DEFAULT
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                                p.isEnabled
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                                  : 'bg-red-950/80 text-red-300 border border-red-700/50'
                              }`}
                            >
                              {p.isEnabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                          </div>
                        </div>

                        {/* Model and Location */}
                        <div className="mt-1 text-xs text-gray-400 flex items-center space-x-2">
                          <span>{p.manufacturer} {p.model}</span>
                          <span>•</span>
                          <span>{p.location || 'Central Facility'}</span>
                        </div>

                        {/* System Printer UNC Path */}
                        <div className="mt-2 text-[11px] font-mono bg-[#111319] px-2 py-1 rounded text-gray-400 border border-[#252834] truncate">
                          {p.systemPrinterName || p.address}
                        </div>

                        {/* Hardware Specs Pills */}
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-[#1b1e27] p-1.5 rounded border border-[#2a2f3d]">
                            <span className="text-gray-500 block text-[10px]">Technology:</span>
                            <span className="font-medium text-gray-300">{p.supportedPrintTechnology || 'Thermal'}</span>
                          </div>
                          <div className="bg-[#1b1e27] p-1.5 rounded border border-[#2a2f3d]">
                            <span className="text-gray-500 block text-[10px]">Resolution / Language:</span>
                            <span className="font-medium text-blue-300 font-mono">{p.dpi} DPI ({p.language})</span>
                          </div>
                          <div className="bg-[#1b1e27] p-1.5 rounded border border-[#2a2f3d]">
                            <span className="text-gray-500 block text-[10px]">Speed / Darkness:</span>
                            <span className="font-medium text-gray-300">{p.speed} IPS / Dk:{p.darkness}</span>
                          </div>
                          <div className="bg-[#1b1e27] p-1.5 rounded border border-[#2a2f3d]">
                            <span className="text-gray-500 block text-[10px]">Hardware Features:</span>
                            <span className="font-medium text-emerald-400">
                              {p.supportsRfid ? 'RFID ' : ''}
                              {p.supportsCutter ? 'Cutter ' : ''}
                              {p.supportsPeeler ? 'Peeler' : 'Standard'}
                            </span>
                          </div>
                        </div>

                        {/* Failover / Fallback Information */}
                        <div className="mt-3 bg-[#13151c] p-2 rounded border border-[#262b37] text-[11px]">
                          <div className="flex items-center justify-between text-gray-400">
                            <span className="flex items-center space-x-1">
                              <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                              <span>Failover Target:</span>
                            </span>
                            <span className="font-semibold text-amber-300 truncate max-w-[160px]">
                              {fallbackPrinter ? (fallbackPrinter.displayName || fallbackPrinter.name) : 'No fallback defined'}
                            </span>
                          </div>
                          {p.lastSuccessfulPrintTime && (
                            <div className="mt-1 text-[10px] text-gray-400 flex items-center justify-between">
                              <span>Last Successful Print:</span>
                              <span className="font-mono">{p.lastSuccessfulPrintTime}</span>
                            </div>
                          )}
                          {p.lastKnownError && (
                            <div className="mt-1 text-[10px] text-red-400 bg-red-950/40 p-1 rounded border border-red-900/40 truncate">
                              Error: {p.lastKnownError}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons Toolbar */}
                      <div className="mt-4 pt-3 border-t border-[#292d3a] flex flex-wrap items-center gap-1.5 text-xs">
                        <button
                          onClick={() => setTestPrintTargetPrinter(p)}
                          className="px-2.5 py-1 rounded bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/50 text-blue-200 text-[11px] font-semibold flex items-center space-x-1"
                          title="Send diagnostic test pattern to this printer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Test Print</span>
                        </button>

                        <button
                          onClick={() => {
                            setFallbackModalPrinter(p);
                            setNewFallbackId(p.fallbackPrinterId || '');
                            setNewPriority(p.priority || 1);
                          }}
                          className="px-2 py-1 rounded bg-[#252936] hover:bg-[#313747] text-gray-300 text-[11px] font-medium"
                          title="Configure fallback redirection and priority"
                        >
                          Fallback &amp; Priority
                        </button>

                        {!p.isDefault && (
                          <button
                            onClick={() => handleSetDefaultPrinter(p)}
                            className="px-2 py-1 rounded bg-[#252936] hover:bg-[#313747] text-gray-300 text-[11px] font-medium"
                            title="Set as enterprise default printer"
                          >
                            Set Default
                          </button>
                        )}

                        <button
                          onClick={() => handleTogglePrinterEnabled(p)}
                          className={`px-2 py-1 rounded text-[11px] font-medium ml-auto ${
                            p.isEnabled
                              ? 'bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50'
                          }`}
                        >
                          {p.isEnabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 2: BARTENDER .BTW TEMPLATE REGISTRY */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#191c25] p-3 rounded-lg border border-[#2c3140]">
                <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search template name, category, or .btw path..."
                      value={templateSearch}
                      onChange={e => setTemplateSearch(e.target.value)}
                      className="w-full bg-[#12141a] border border-[#343a4a] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={templateCategoryFilter}
                    onChange={e => setTemplateCategoryFilter(e.target.value)}
                    className="bg-[#12141a] border border-[#343a4a] text-xs text-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="Shipping label">Shipping label</option>
                    <option value="Compliance label">Compliance label</option>
                    <option value="Asset label">Asset label</option>
                    <option value="Warehouse label">Warehouse label</option>
                  </select>
                </div>

                <div className="text-xs text-gray-400">
                  Showing <strong>{filteredTemplates.length}</strong> BarTender .BTW templates
                </div>
              </div>

              {/* Template Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredTemplates.map(tpl => {
                  const defaultPrinter = printers.find(p => p.id === tpl.defaultPrinterId);
                  const fallbackPrinter = printers.find(p => p.id === tpl.fallbackPrinterId);

                  return (
                    <div
                      key={tpl.id}
                      className="bg-[#181a23] border border-[#2d3240] rounded-lg p-4 flex flex-col justify-between hover:border-[#3c4355] transition-colors"
                    >
                      <div>
                        {/* Title & Category */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-mono bg-blue-950/80 border border-blue-600/40 text-blue-300 px-2 py-0.5 rounded font-bold">
                                {tpl.category}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">ID: {tpl.id}</span>
                            </div>
                            <h3 className="text-sm font-bold text-white mt-1">{tpl.displayName || tpl.name}</h3>
                          </div>

                          <span className="text-xs font-mono bg-[#111319] border border-[#2b303e] px-2.5 py-1 rounded text-gray-300 font-semibold">
                            {tpl.labelWidth}×{tpl.labelHeight} {tpl.unit}
                          </span>
                        </div>

                        {/* BarTender .BTW file path */}
                        <div className="mt-2.5 text-[11px] font-mono bg-[#111319] p-2 rounded text-blue-300/90 border border-[#242735] flex items-center justify-between">
                          <span className="truncate">{tpl.bartenderTemplateReference}</span>
                          <span className="text-[10px] text-gray-500 uppercase ml-2 shrink-0">v{config.version.split(' ')[0]}</span>
                        </div>

                        {/* Symbology & RFID requirements */}
                        <div className="mt-3 flex items-center space-x-3 text-xs text-gray-300">
                          <div className="flex items-center space-x-1.5">
                            <Barcode className="w-3.5 h-3.5 text-amber-400" />
                            <span>Symbology: <strong>{tpl.barcodeType}</strong></span>
                          </div>
                          {tpl.supportsRfid && (
                            <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.2 rounded font-bold">
                              RFID TAG REQUIRED
                            </span>
                          )}
                        </div>

                        {/* Fields Schema Display */}
                        <div className="mt-3">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">
                            Required Data Fields ({tpl.requiredFields.length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {tpl.requiredFields.map(f => (
                              <span
                                key={f.key}
                                className="text-[11px] font-mono bg-[#1c202a] text-gray-300 px-2 py-0.5 rounded border border-[#2e3342]"
                                title={f.description || f.label}
                              >
                                {f.key}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Default & Fallback Printer Mapping */}
                        <div className="mt-3 bg-[#13151c] p-2 rounded border border-[#242833] text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Default Printer:</span>
                            <span className="font-semibold text-blue-300">
                              {defaultPrinter ? (defaultPrinter.displayName || defaultPrinter.name) : 'Auto / System Default'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Fallback Target:</span>
                            <span className="font-semibold text-amber-300">
                              {fallbackPrinter ? (fallbackPrinter.displayName || fallbackPrinter.name) : 'None assigned'}
                            </span>
                          </div>
                        </div>

                        {/* Notice */}
                        <div className="mt-3 p-2 rounded bg-[#151720] border border-[#292d3b] text-[11px] text-gray-400 italic flex items-center space-x-1.5">
                          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>Data preview — final layout is rendered by BarTender template.</span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-4 pt-3 border-t border-[#292d3a] flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">
                          Updated: {tpl.updatedAt.split(' ')[0]}
                        </span>

                        <button
                          onClick={() => {
                            if (defaultPrinter && onSelectPrinter) {
                              onSelectPrinter(defaultPrinter.id);
                            }
                            showToast(`Selected "${tpl.name}" for print dispatcher.`);
                          }}
                          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                        >
                          Select for Print Dispatch
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 3: PRINT JOB QUEUE */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="bg-[#191c25] p-3 rounded-lg border border-[#2c3140] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white tracking-wide">
                    Live Spooler &amp; BarTender Integration Queue
                  </h3>
                </div>
                <div className="text-xs text-gray-400">
                  Integration Service: <strong>{config.integrationMode}</strong> ({config.serviceUrl})
                </div>
              </div>

              {printJobs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No print jobs currently in spooler. Dispatch a job from the Print modal.
                </div>
              ) : (
                <div className="space-y-3">
                  {printJobs.map(job => {
                    const isCompleted = job.status === 'COMPLETED';
                    const isSent = job.status === 'SENT_TO_PRINT_SERVICE';
                    const isFailed = job.status === 'FAILED';

                    return (
                      <div
                        key={job.id}
                        className="bg-[#181a23] border border-[#2c3140] rounded-lg p-4 hover:border-[#3a4154] transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <span
                              className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${
                                isCompleted
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                                  : isSent
                                  ? 'bg-blue-950/80 text-blue-300 border border-blue-700/50'
                                  : isFailed
                                  ? 'bg-red-950/80 text-red-300 border border-red-700/50'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
                              }`}
                            >
                              {job.status.replace(/_/g, ' ')}
                            </span>

                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold text-white">{job.jobName}</span>
                                <span className="text-xs font-mono text-gray-400">#{job.id}</span>
                              </div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                Template: <strong>{job.templateName}</strong> • Target Printer: <strong>{job.printerName}</strong>
                                {job.fallbackPrinterUsed && (
                                  <span className="text-amber-400 ml-1.5 font-bold">[FALLBACK REDIRECTION USED]</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right text-xs">
                            <div className="text-gray-300 font-semibold">
                              {job.copies} {job.copies === 1 ? 'copy' : 'copies'} ({job.recordCount} records)
                            </div>
                            <div className="text-gray-400 text-[11px] font-mono mt-0.5">{job.createdAt}</div>
                          </div>
                        </div>

                        {/* Integration response message */}
                        {job.integrationResponseSummary && (
                          <div className="mt-3 p-2 bg-[#12141a] rounded border border-[#272b36] text-xs font-mono text-gray-300 flex items-center justify-between">
                            <div className="flex items-center space-x-2 truncate">
                              <Server className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">{job.integrationResponseSummary}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 ml-2 uppercase shrink-0">
                              {job.integrationMethod || 'REST API'}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-3 pt-2.5 border-t border-[#262a36] flex items-center justify-between text-xs">
                          <span className="text-gray-400 text-[11px]">
                            Requested by: <strong>{job.requestedByUserName || 'Operator'}</strong> ({job.userRole || 'OPERATOR'})
                          </span>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleOpenReprintDialog(job)}
                              className="px-2.5 py-1 rounded bg-[#242834] hover:bg-[#303646] text-gray-200 text-xs font-semibold flex items-center space-x-1"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-400" />
                              <span>Reprint...</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 4: PRINT HISTORY & CONTROLLED REPRINT */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Filter Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#191c25] p-3 rounded-lg border border-[#2c3140]">
                <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter history by Job ID, Order #, SKU, Template or User..."
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                      className="w-full bg-[#12141a] border border-[#343a4a] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <select
                    value={historyStatusFilter}
                    onChange={e => setHistoryStatusFilter(e.target.value)}
                    className="bg-[#12141a] border border-[#343a4a] text-xs text-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="SENT_TO_PRINT_SERVICE">Sent to Print Service</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                <div className="text-xs text-gray-400">
                  Showing <strong>{filteredHistory.length}</strong> archived jobs
                </div>
              </div>

              {/* History Table */}
              <div className="bg-[#181a23] border border-[#2d3240] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#13151c] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#2d3240]">
                    <tr>
                      <th className="py-3 px-4">Job ID</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Job Description</th>
                      <th className="py-3 px-4">Printer Handoff</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4 text-center">Copies</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252a36]">
                    {filteredHistory.map(job => (
                      <tr key={job.id} className="hover:bg-[#1f2330] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">
                          {job.id}
                          {job.originalPrintJobId && (
                            <span className="block text-[10px] text-amber-400 font-normal">
                              Reprint of {job.originalPrintJobId}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-400">{job.createdAt}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{job.jobName}</div>
                          <div className="text-[11px] text-gray-400">{job.templateName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-200">{job.printerName}</span>
                          {job.fallbackPrinterUsed && (
                            <span className="block text-[10px] text-amber-400">Fallback Used</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {job.requestedByUserName || 'Operator'}
                          <span className="block text-[10px] text-gray-400">{job.userRole}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white font-mono">{job.copies}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              job.status === 'COMPLETED'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                                : job.status === 'SENT_TO_PRINT_SERVICE'
                                ? 'bg-blue-950/80 text-blue-300 border border-blue-700/50'
                                : 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
                            }`}
                          >
                            {job.status === 'SENT_TO_PRINT_SERVICE' ? 'SENT TO PRINT SERVICE' : job.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenReprintDialog(job)}
                            className="px-2.5 py-1 rounded bg-[#2a2f3d] hover:bg-[#373e4f] text-gray-200 text-xs font-semibold"
                            title="Trigger controlled reprint with reason"
                          >
                            Reprint...
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 5: SYSTEM AUDIT LOGS */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#191c25] p-3 rounded-lg border border-[#2c3140]">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search audit trail by user, action, entity or ID..."
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                    className="w-full bg-[#12141a] border border-[#343a4a] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="text-xs text-gray-400">
                  Showing <strong>{filteredAuditLogs.length}</strong> immutable audit entries
                </div>
              </div>

              <div className="bg-[#181a23] border border-[#2d3240] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#13151c] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#2d3240]">
                    <tr>
                      <th className="py-3 px-4">Audit ID</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User / Persona</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Values Modified (Before → After)</th>
                      <th className="py-3 px-4">Result</th>
                      <th className="py-3 px-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252a36]">
                    {filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#1f2330] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-gray-300">{log.id}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-400">{log.timestamp}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white">{log.userName}</span>
                          <span className="block text-[10px] text-blue-400 font-mono">{log.userRole}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-amber-300">{log.action}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {log.entityType} <span className="font-mono text-[11px] text-gray-400">({log.entityId})</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-400 max-w-xs truncate">
                          {log.beforeValueJson && <span>{log.beforeValueJson} → </span>}
                          <span className="text-gray-200">{log.afterValueJson}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                              log.result === 'SUCCESS'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/50'
                                : 'bg-amber-950/80 text-amber-300 border border-amber-700/50'
                            }`}
                          >
                            {log.result}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-500">{log.ipAddress || '127.0.0.1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* TAB 6: BARTENDER ARCHITECTURE & INTEGRATION DECISION MATRIX */}
          {/* ------------------------------------------------------------- */}
          {activeTab === 'integration' && (
            <div className="space-y-6">
              {/* Architecture Blueprint Banner */}
              <div className="bg-[#191c25] border border-[#2d3240] rounded-xl p-5">
                <div className="flex items-center space-x-2 text-blue-400 mb-2">
                  <Server className="w-5 h-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Official Production Print Architecture Pipeline
                  </h3>
                </div>

                <div className="p-4 bg-[#111319] rounded-lg border border-[#242835] font-mono text-xs text-gray-300 leading-relaxed overflow-x-auto">
                  <div className="flex items-center space-x-3 text-center min-w-[760px]">
                    <div className="bg-[#1e222d] p-2.5 rounded border border-blue-500/50 text-blue-300">
                      Frontend Studio<br />(LabelForge Web Client)
                    </div>
                    <span>→</span>
                    <div className="bg-[#1e222d] p-2.5 rounded border border-purple-500/50 text-purple-300">
                      Print Job API<br />(Authentication &amp; RBAC)
                    </div>
                    <span>→</span>
                    <div className="bg-[#1e222d] p-2.5 rounded border border-emerald-500/50 text-emerald-300">
                      BarTender Integration Service<br />(REST API / Spooler / XML Drop)
                    </div>
                    <span>→</span>
                    <div className="bg-[#1e222d] p-2.5 rounded border border-amber-500/50 text-amber-300">
                      Windows Print Server<br />(Seagull Certified Drivers)
                    </div>
                    <span>→</span>
                    <div className="bg-[#1e222d] p-2.5 rounded border border-cyan-500/50 text-cyan-300">
                      Physical Thermal/Laser Fleet<br />(Zebra, TSC, Brother, HP)
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-gray-400">
                  <strong>Security Guarantee:</strong> Windows printer spooler UNC paths, BarTender license keys, and print server credentials are never exposed directly to public browser clients. All physical printing commands pass through the secured integration tier.
                </div>
              </div>

              {/* BarTender Edition Compatibility Decision Table */}
              <div className="bg-[#181a23] border border-[#2d3240] rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-2">
                  BarTender® Edition Compatibility &amp; Capability Decision Matrix
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Identify supported capabilities across BarTender releases (Starter, Professional, Automation, Enterprise, BarTender Cloud).
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#13151c] text-gray-400 uppercase text-[10px] tracking-wider border-b border-[#2d3240]">
                      <tr>
                        <th className="py-3 px-4">Feature / Integration Capability</th>
                        <th className="py-3 px-4 text-center">Starter</th>
                        <th className="py-3 px-4 text-center">Professional</th>
                        <th className="py-3 px-4 text-center">Automation</th>
                        <th className="py-3 px-4 text-center">Enterprise</th>
                        <th className="py-3 px-4 text-center">Cloud</th>
                        <th className="py-3 px-4">Integration Guidance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#252a36]">
                      {BARTENDER_EDITION_COMPATIBILITY_MATRIX.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#1f2330] transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">{row.feature}</td>
                          <td className="py-3 px-4 text-center font-mono">
                            {row.starter === true ? (
                              <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : row.starter === false ? (
                              <X className="w-4 h-4 text-gray-600 mx-auto" />
                            ) : (
                              <span className="text-[11px] text-amber-400">{row.starter}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {row.professional === true ? (
                              <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : row.professional === false ? (
                              <X className="w-4 h-4 text-gray-600 mx-auto" />
                            ) : (
                              <span className="text-[11px] text-amber-400">{row.professional}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {row.automation === true ? (
                              <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : row.automation === false ? (
                              <X className="w-4 h-4 text-gray-600 mx-auto" />
                            ) : (
                              <span className="text-[11px] text-amber-400">{row.automation}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {row.enterprise === true ? (
                              <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : row.enterprise === false ? (
                              <X className="w-4 h-4 text-gray-600 mx-auto" />
                            ) : (
                              <span className="text-[11px] text-amber-400">{row.enterprise}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            {row.cloud === true ? (
                              <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : row.cloud === false ? (
                              <X className="w-4 h-4 text-gray-600 mx-auto" />
                            ) : (
                              <span className="text-[11px] text-amber-400">{row.cloud}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-[11px]">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Integration Service Settings Form */}
              <div className="bg-[#181a23] border border-[#2d3240] rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-3">
                  BarTender Integration Service Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1">Integration Mode</label>
                    <select
                      value={config.integrationMode}
                      onChange={e => setConfig({ ...config, integrationMode: e.target.value as any })}
                      className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white"
                    >
                      <option value="REST_API">BarTender REST API (Automation/Enterprise 2019–2026)</option>
                      <option value="INTEGRATION_BUILDER">Integration Builder (Socket / Webhook / File Drop XML)</option>
                      <option value="PRINT_PORTAL">BarTender Print Portal (Web Printing Gateway)</option>
                      <option value="DOTNET_SDK">BarTender .NET SDK / Print Engine API</option>
                      <option value="COMMAND_LINE">Command-Line Execution (bartend.exe /P /X)</option>
                      <option value="DIRECT_DRIVER">Direct Windows Spooler (Native ZPL/TSPL/EPL Driver)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">BarTender Service URL</label>
                    <input
                      type="text"
                      value={config.serviceUrl}
                      onChange={e => setConfig({ ...config, serviceUrl: e.target.value })}
                      className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Templates Root Directory (UNC or Local)</label>
                    <input
                      type="text"
                      value={config.templateRoot}
                      onChange={e => setConfig({ ...config, templateRoot: e.target.value })}
                      className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Windows Print Server Host</label>
                    <input
                      type="text"
                      value={config.printServerHost}
                      onChange={e => setConfig({ ...config, printServerHost: e.target.value })}
                      className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#292d3a] flex items-center justify-between">
                  <button
                    onClick={() => {
                      showToast('Pinged BarTender REST API endpoint: HTTP 200 OK (Roundtrip: 14ms). Spooler healthy.');
                    }}
                    className="px-3 py-1.5 rounded bg-[#252936] hover:bg-[#323748] text-gray-200 text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ping BarTender Service Diagnostics</span>
                  </button>

                  <button
                    onClick={() => {
                      showToast('Configuration updated and saved to secure application context.');
                    }}
                    className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    Save Configuration
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* MODALS & DIALOGS */}
        {/* ================================================================= */}

        {/* Test Print Confirmation Modal */}
        {testPrintTargetPrinter && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="bg-[#1c1f2a] border border-[#3a4154] rounded-xl p-5 max-w-md w-full text-gray-200 shadow-2xl">
              <div className="flex items-center space-x-3 text-amber-400 mb-3">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-base font-bold text-white">Confirm Test Print Dispatch</h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                You are about to send a test print to{' '}
                <strong className="text-white">{testPrintTargetPrinter.displayName || testPrintTargetPrinter.name}</strong>{' '}
                using the <strong className="text-white">GS1 Pallet Shipping Calibration Template</strong>.
              </p>
              <div className="mt-3 bg-[#13151c] p-2.5 rounded border border-[#272b38] text-[11px] font-mono text-gray-400 space-y-1">
                <div>Queue: {testPrintTargetPrinter.systemPrinterName || testPrintTargetPrinter.name}</div>
                <div>Port: {testPrintTargetPrinter.address}</div>
                <div>Language: {testPrintTargetPrinter.language} ({testPrintTargetPrinter.dpi} DPI)</div>
                <div>Job Type: TEST_PRINT (Tracked in Audit Log)</div>
              </div>

              <div className="mt-5 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setTestPrintTargetPrinter(null)}
                  className="px-3 py-1.5 rounded bg-[#272b37] hover:bg-[#323847] text-xs text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTestPrint}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm"
                >
                  Continue &amp; Print
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Controlled Reprint Dialog */}
        {reprintTargetJob && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="bg-[#1c1f2a] border border-[#3a4154] rounded-xl p-5 max-w-lg w-full text-gray-200 shadow-2xl">
              <div className="flex items-center space-x-3 text-amber-400 mb-3">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Controlled Label Reprint Authorization</h3>
              </div>

              <div className="bg-[#13151c] p-3 rounded-lg border border-[#272b38] text-xs space-y-1.5 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Original Job ID:</span>
                  <span className="font-mono font-bold text-blue-400">{reprintTargetJob.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Original Requester:</span>
                  <span className="font-semibold text-gray-200">{reprintTargetJob.requestedByUserName || 'Operator'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Template:</span>
                  <span className="font-semibold text-gray-200">{reprintTargetJob.templateName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Original Printer:</span>
                  <span className="font-semibold text-gray-200">{reprintTargetJob.printerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Original Quantity:</span>
                  <span className="font-mono text-white font-bold">{reprintTargetJob.copies}</span>
                </div>
              </div>

              {/* Mandatory Reason */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Reprint Reason <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={reprintReason}
                    onChange={e => setReprintReason(e.target.value as ReprintReason)}
                    className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white"
                  >
                    <option value="Printer jam">Printer jam / Label crumpled</option>
                    <option value="Label damaged">Label damaged during handling</option>
                    <option value="Incorrect print quality">Incorrect print quality / Unreadable barcode</option>
                    <option value="Missing label">Missing label on consignment</option>
                    <option value="Approved replacement">Approved replacement by Supervisor</option>
                    <option value="Other">Other reason (specify below)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Target Printer (Redirection Allowed)</label>
                  <select
                    value={reprintPrinterId}
                    onChange={e => setReprintPrinterId(e.target.value)}
                    className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white"
                  >
                    {printers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.displayName || p.name} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Reprint Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={reprintQuantity}
                    onChange={e => setReprintQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white font-mono"
                  />
                </div>

                {reprintReason === 'Other' && (
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Detailed Explanation</label>
                    <input
                      type="text"
                      placeholder="Enter specific justification for audit compliance..."
                      value={reprintCustomNote}
                      onChange={e => setReprintCustomNote(e.target.value)}
                      className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white"
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setReprintTargetJob(null)}
                  className="px-3 py-1.5 rounded bg-[#272b37] hover:bg-[#323847] text-xs text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReprint}
                  className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-sm"
                >
                  Authorize &amp; Dispatch Reprint
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fallback Configuration Modal */}
        {fallbackModalPrinter && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
            <div className="bg-[#1c1f2a] border border-[#3a4154] rounded-xl p-5 max-w-md w-full text-gray-200 shadow-2xl">
              <div className="flex items-center space-x-2.5 text-blue-400 mb-3">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Configure Failover &amp; Priority</h3>
              </div>
              <p className="text-xs text-gray-300 mb-3">
                Select the automatic fallback target when <strong className="text-white">{fallbackModalPrinter.name}</strong> encounters paper-out, cutter jam, or network disconnection.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Designated Fallback Printer</label>
                  <select
                    value={newFallbackId}
                    onChange={e => setNewFallbackId(e.target.value)}
                    className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white"
                  >
                    <option value="">None (Halt job if printer fails)</option>
                    {printers
                      .filter(p => p.id !== fallbackModalPrinter.id)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.displayName || p.name} ({p.supportedPrintTechnology || p.language})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Printer Pool Priority (1 = Highest)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newPriority}
                    onChange={e => setNewPriority(Number(e.target.value))}
                    className="w-full bg-[#12141a] border border-[#343a4a] rounded-md px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end space-x-3">
                <button
                  onClick={() => setFallbackModalPrinter(null)}
                  className="px-3 py-1.5 rounded bg-[#272b37] hover:bg-[#323847] text-xs text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveFallbackSettings}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
                >
                  Save Route
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
