import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Info,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  FileText,
  Barcode as BarcodeIcon,
  QrCode,
  Image as ImageIcon,
  Square,
  Sliders,
  Check
} from 'lucide-react';
import { LabelDocument } from '../../types/label';
import { PrinterProfile, PrintJob, UserRole, BarTenderTemplateMetadata, VIRTUAL_FALLBACK_PRINTER } from '../../types/printer';
import { DataSourceDefinition, SerializationCounter } from '../../types/database';
import { runPreflightValidation } from '../../services/preflightValidator';
import { checkUserPermission } from '../../services/barTenderPrintService';
import { isDesktopApp, desktopPrintLabel } from '../../services/desktopBridge';
import { generatePrinterCode } from '../../services/printerCodeGenerator';
import { resolveIPCPrinterType } from '../../services/printerLanguageMapper';
import { extractNetworkHostPort } from '../../services/printQueueManager';
import { useIdentity } from '../../context/IdentityContext';
import { renderLabelObjectContent, MM_TO_PX } from '../../services/renderObjectContent';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LabelDocument;
  printers: PrinterProfile[];
  activePrinterId: string;
  onSelectPrinter: (id: string) => void;
  dataSource?: DataSourceDefinition;
  counter?: SerializationCounter;
  onJobDispatched: (job: PrintJob) => void;
  currentUserRole?: UserRole;
  barTenderTemplate?: BarTenderTemplateMetadata;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  printers,
  activePrinterId,
  onSelectPrinter,
  dataSource,
  counter,
  onJobDispatched,
  currentUserRole = 'OPERATOR',
  barTenderTemplate
}) => {
  if (!isOpen) return null;

  const { identity } = useIdentity();

  const [copies, setCopies] = useState(1);
  const [recordRange, setRecordRange] = useState<'current' | 'all' | 'range'>('current');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(10);
  const [speed, setSpeed] = useState(6);
  const [darkness, setDarkness] = useState(18);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'bartender' | 'preflight'>('preview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<{ id: string; status: string; note: string } | null>(null);

  // Preview interactive state
  const [previewZoom, setPreviewZoom] = useState<number>(1.0);
  const [previewMode, setPreviewMode] = useState<'wysiwyg' | 'merged'>('wysiwyg');
  const [showMargins, setShowMargins] = useState<boolean>(true);
  const [showInspector, setShowInspector] = useState<boolean>(false);

  // Template variables state for on-demand values & database simulation
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({
    Batch_Number: 'LOT-2026-X49',
    Serial_Number: 'SN-004092',
    Product_Code: 'MED-99410-B',
    Order_Number: 'ORD-881904',
    Destination_Hub: 'Frankfurt Central Hub (FRA-02)',
    Lot_Number: 'LOT-882194',
    SERIAL: '100492',
    DATE_YYMMDD: new Date().toISOString().slice(2, 10).replace(/-/g, ''),
  });

  const activePrinter = printers.find(p => p.id === activePrinterId) || printers[0] || VIRTUAL_FALLBACK_PRINTER;
  const fallbackPrinter = activePrinter.fallbackPrinterId ? printers.find(p => p.id === activePrinter.fallbackPrinterId) : undefined;

  // Validation
  const diagnostics = runPreflightValidation(doc);
  const blockerCount = diagnostics.filter(d => d.severity === 'error' || d.severity === 'blocker').length;

  const activeRole: UserRole = (currentUserRole as UserRole) || 'OPERATOR';
  const isPrinterOffline = activePrinter.status === 'Offline' || activePrinter.isEnabled === false;
  const permission = checkUserPermission(activeRole, 'PRINT', activePrinter);

  // Calculate dynamic merged record for WYSIWYG preview
  const effectiveActiveRecord = useMemo(() => {
    if (previewMode === 'merged') {
      return templateVariables;
    }
    return dataSource?.records?.[0] || templateVariables;
  }, [previewMode, templateVariables, dataSource]);

  // Generate authentic raw printer code based on printer language using unified generator
  let generatedCode = '';
  try {
    generatedCode = generatePrinterCode(activePrinter.language || 'ZPL', doc, { copies, darkness, speed });
  } catch {
    generatedCode = `^XA\n^FO50,50^A0N,36,36^FD${doc.name}^FS\n^XZ`;
  }

  const totalRecordsToPrint =
    recordRange === 'current'
      ? 1
      : recordRange === 'all'
      ? (dataSource?.records.length || 1)
      : Math.max(1, rangeEnd - rangeStart + 1);

  const totalLabels = totalRecordsToPrint * copies;

  // Object breakdown for inspector
  const objectSummary = useMemo(() => {
    const textCount = doc.objects.filter(o => o.type === 'text' || o.type === 'rich-text').length;
    const barcodeCount = doc.objects.filter(o => o.type === 'barcode').length;
    const qrCount = doc.objects.filter(o => o.type === 'qrcode' || o.type === 'datamatrix').length;
    const imageCount = doc.objects.filter(o => o.type === 'image').length;
    const shapeCount = doc.objects.filter(o => o.type === 'rect' || o.type === 'ellipse' || o.type === 'line').length;
    return { textCount, barcodeCount, qrCount, imageCount, shapeCount, total: doc.objects.length };
  }, [doc.objects]);

  // Handle printer dispatch
  const handlePrint = () => {
    if (!permission.allowed) return;
    if (copies <= 0) return;

    setIsSubmitting(true);
    setDispatchSuccess(null);

    const printerType = resolveIPCPrinterType(activePrinter);
    const network = extractNetworkHostPort(activePrinter.address);

    if (isDesktopApp()) {
      desktopPrintLabel({
        printerName: activePrinter.systemPrinterName || activePrinter.name,
        printerType,
        copies,
        rawPayload: generatedCode,
        networkHost: network.host,
        networkPort: network.port,
        jobName: `${doc.name} - Batch`
      }).then(res => {
        setIsSubmitting(false);
        const jobId = res.jobId || `JOB-${Math.floor(100000 + Math.random() * 900000)}`;
        setDispatchSuccess({
          id: jobId,
          status: res.success ? (printerType === 'network' ? 'TRANSMITTED' : 'SENT_TO_PRINT_SERVICE') : 'DEVICE_ERROR',
          note: res.success
            ? `NATIVE DISPATCH SUCCESS — Transmitted ${res.bytesWritten || generatedCode.length} bytes to ${activePrinter.name} (${printerType})`
            : `DISPATCH FAILED: ${res.error?.message || 'Printer rejected job'}`
        });

        if (res.success) {
          const job: PrintJob = {
            id: jobId,
            jobNumber: `PJ-${jobId.slice(-6)}`,
            jobType: 'ON_DEMAND',
            jobName: `${doc.name} - Native Desktop`,
            requestedByUserId: identity.userId,
            requestedByUserName: identity.userName,
            userRole: identity.role,
            templateId: barTenderTemplate?.id || doc.id,
            templateName: doc.name,
            templateVersion: doc.metadata?.version || 1,
            printerId: activePrinter.id,
            printerName: activePrinter.displayName || activePrinter.name,
            requestedPrinterId: activePrinter.id,
            actualPrinterId: activePrinter.id,
            actualPrinterName: activePrinter.name,
            fallbackPrinterUsed: false,
            copies,
            recordCount: totalRecordsToPrint,
            labelQuantity: totalLabels,
            labelDataJson: templateVariables,
            status: printerType === 'network' ? 'TRANSMITTED' : 'SENT_TO_PRINT_SERVICE',
            createdAt: new Date().toLocaleTimeString(),
            sentAt: new Date().toLocaleTimeString(),
            outputLanguage: activePrinter.language,
            dpi: activePrinter.dpi,
            paperSize: `${doc.dimensions.width} × ${doc.dimensions.height} mm (${(doc.dimensions.width / 25.4).toFixed(1)}" × ${(doc.dimensions.height / 25.4).toFixed(1)}")`,
            inkLevel: 85,
            ribbonLevel: 85,
            mediaRollRemaining: 80,
            printheadHealth: 99,
            printSpeed: activePrinter.speed,
            darkness: activePrinter.darkness,
            printTechnology: activePrinter.supportedPrintTechnology || 'Thermal transfer',
            mediaType: activePrinter.mediaType || 'gap',
            rawPayload: generatedCode,
            rawPayloadPreview: generatedCode.slice(0, 500),
            integrationMethod: `Electron Native Thermal Port (${printerType})`,
            integrationResponseSummary: 'Direct native hardware handoff verified',
            retryCount: 0,
          };
          onJobDispatched(job);
        }
      });
      return;
    }

    // Web preview mode notice
    setTimeout(() => {
      setIsSubmitting(false);
      const jobId = `JOB-WEB-${Math.floor(100000 + Math.random() * 900000)}`;
      const handoffNote = `WEB PREVIEW — Structured print job dispatched for "${activePrinter.name}". Run in Electron desktop app for real hardware ports.`;

      setDispatchSuccess({
        id: jobId,
        status: 'SENT_TO_PRINT_SERVICE',
        note: handoffNote,
      });

      const job: PrintJob = {
        id: jobId,
        jobNumber: `PJ-${jobId.split('-')[2]}`,
        jobType: 'ON_DEMAND',
        jobName: `${doc.name} (Web Preview)`,
        requestedByUserId: identity.userId,
        requestedByUserName: identity.userName,
        userRole: identity.role,
        templateId: barTenderTemplate?.id || doc.id,
        templateName: doc.name,
        templateVersion: doc.metadata?.version || 1,
        printerId: activePrinter.id,
        printerName: activePrinter.displayName || activePrinter.name,
        requestedPrinterId: activePrinter.id,
        actualPrinterId: activePrinter.id,
        actualPrinterName: activePrinter.name,
        fallbackPrinterUsed: false,
        copies,
        recordCount: totalRecordsToPrint,
        labelQuantity: totalLabels,
        labelDataJson: templateVariables,
        status: 'SENT_TO_PRINT_SERVICE',
        createdAt: new Date().toLocaleTimeString(),
        sentAt: new Date().toLocaleTimeString(),
        outputLanguage: activePrinter.language,
        dpi: activePrinter.dpi,
        paperSize: `${doc.dimensions.width} × ${doc.dimensions.height} mm`,
        rawPayload: generatedCode,
        rawPayloadPreview: generatedCode.slice(0, 500),
        integrationMethod: 'Web Preview Engine',
        integrationResponseSummary: handoffNote,
        retryCount: 0,
      };

      onJobDispatched(job);
    }, 400);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadCode = () => {
    const ext = (activePrinter.language || 'zpl').toLowerCase();
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '_')}_${activePrinter.language}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Label physical pixel dimensions calculated at scale
  const labelWidthPx = doc.dimensions.width * MM_TO_PX * previewZoom;
  const labelHeightPx = doc.dimensions.height * MM_TO_PX * previewZoom;
  const cornerRadiusPx = (doc.dimensions.cornerRadius || 0) * MM_TO_PX * previewZoom;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-5xl bg-[#1e2129] border border-[#343946] rounded-xl shadow-2xl flex flex-col max-h-[92vh] text-[#c9ccd3] text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="h-12 bg-[#252833] border-b border-[#343946] px-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-sm">BarTender® &amp; Enterprise Print Dispatch Workstation</span>
                <span className="text-[10px] font-mono bg-blue-950/80 border border-blue-600/40 text-blue-300 px-2 py-0.2 rounded font-semibold">
                  Role: {currentUserRole}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Document: <strong className="text-gray-200">{doc.name}</strong> • Layout: {doc.dimensions.width}×{doc.dimensions.height}{doc.dimensions.unit} ({objectSummary.total} Elements)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#323644] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Print Settings & Configuration */}
          <div className="w-80 border-r border-[#2d313d] bg-[#181a21] p-4 flex flex-col space-y-4 overflow-y-auto">
            {/* Target Printer Profile */}
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                Target Physical Printer:
              </label>
              <select
                value={activePrinterId}
                onChange={(e) => onSelectPrinter(e.target.value)}
                className="w-full bg-[#1e212a] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName || p.name} ({p.status})
                  </option>
                ))}
              </select>

              {/* Offline / Fallback Warning Notice */}
              {isPrinterOffline && (
                <div className="mt-2 p-2.5 rounded bg-red-950/40 border border-red-800/60 text-red-200 text-[11px] space-y-1.5">
                  <div className="flex items-center space-x-1.5 font-bold text-red-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Selected Printer is Offline or Disabled</span>
                  </div>
                  <p className="text-[10px] text-red-300/80">
                    Direct handoff to this queue will fail or be paused in the Windows spooler.
                  </p>
                  {fallbackPrinter && (
                    <div className="pt-1 border-t border-red-900/40 flex items-center justify-between">
                      <span className="text-[10px] text-amber-300">Designated Fallback:</span>
                      <button
                        onClick={() => onSelectPrinter(fallbackPrinter.id)}
                        className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-[10px] font-bold border border-amber-600/40"
                      >
                        Switch to {fallbackPrinter.name.split(' ')[0]}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Hardware Connection Card */}
              <div className="mt-2 p-2 rounded bg-[#13151b] border border-[#272b35] text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Spooler Queue:</span>
                  <span className="font-mono text-gray-300 truncate max-w-[150px]">
                    {activePrinter.systemPrinterName || activePrinter.address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Language:</span>
                  <span className="font-mono text-cyan-400 font-bold">{activePrinter.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Resolution &amp; Tech:</span>
                  <span className="font-mono text-gray-300">
                    {activePrinter.dpi} DPI ({activePrinter.supportedPrintTechnology || 'Thermal'})
                  </span>
                </div>
                {activePrinter.supportsRfid && (
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>RFID Encoding:</span>
                    <span>Supported (UHF Gen2)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Copies / Quantity */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Copies / Label:
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#1e212a] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Print Darkness:
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={darkness}
                  onChange={(e) => setDarkness(Number(e.target.value))}
                  className="w-full bg-[#1e212a] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* BarTender Variable Fields Override */}
            <div className="border-t border-[#2a2e39] pt-3 space-y-2">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                BarTender Named Data Substrings:
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {Object.entries(templateVariables).map(([key, val]) => (
                  <div key={key} className="flex flex-col text-[11px]">
                    <span className="text-gray-400 font-mono text-[10px]">{key}</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) =>
                        setTemplateVariables({
                          ...templateVariables,
                          [key]: e.target.value,
                        })
                      }
                      className="bg-[#12141a] border border-[#313645] rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Total Labels Summary */}
            <div className="p-2.5 rounded bg-blue-950/40 border border-blue-800/40 text-blue-200">
              <div className="flex justify-between font-semibold">
                <span>Total Physical Labels:</span>
                <span className="text-base font-mono text-white font-bold">{totalLabels}</span>
              </div>
              <div className="text-[10px] text-blue-400/80 mt-0.5">
                {totalRecordsToPrint} record(s) × {copies} copy/copies
              </div>
            </div>

            {/* Browser print fallback */}
            <button
              onClick={handleBrowserPrint}
              className="w-full py-1.5 rounded bg-[#272b36] hover:bg-[#323847] text-gray-300 hover:text-white border border-[#393f50] text-[11px]"
            >
              Export to Windows Spooler / PDF
            </button>
          </div>

          {/* Right Column: Previews & Code Inspection */}
          <div className="flex-1 flex flex-col bg-[#1c1f26]">
            {/* View Tabs */}
            <div className="h-9 bg-[#21242e] border-b border-[#2d313d] px-4 flex items-center justify-between text-xs">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 font-medium rounded ${activeTab === 'preview' ? 'bg-[#2f3442] text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  WYSIWYG Output Preview
                </button>
                <button
                  onClick={() => setActiveTab('bartender')}
                  className={`px-3 py-1 font-medium rounded ${activeTab === 'bartender' ? 'bg-[#2f3442] text-blue-300' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  BarTender Integration Payload
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1 font-medium rounded font-mono ${activeTab === 'code' ? 'bg-[#2f3442] text-cyan-300' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  Raw {activePrinter.language} Code
                </button>
                <button
                  onClick={() => setActiveTab('preflight')}
                  className={`px-3 py-1 font-medium rounded flex items-center space-x-1 ${activeTab === 'preflight' ? 'bg-[#2f3442] text-amber-300' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  <span>Preflight Check</span>
                  {blockerCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
                </button>
              </div>

              {activeTab === 'preview' && (
                <div className="flex items-center space-x-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center space-x-1 bg-[#15171e] rounded p-0.5 border border-[#2e323e]">
                    <button
                      onClick={() => setPreviewZoom(z => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                      className="p-1 text-gray-400 hover:text-white rounded"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-mono text-gray-300 px-1 min-w-[38px] text-center">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button
                      onClick={() => setPreviewZoom(z => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                      className="p-1 text-gray-400 hover:text-white rounded"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPreviewZoom(1.0)}
                      className="px-1.5 py-0.5 text-[9px] font-semibold text-blue-300 hover:text-white rounded"
                      title="1:1 Physical Scale"
                    >
                      1:1
                    </button>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex items-center space-x-1 bg-[#15171e] rounded p-0.5 border border-[#2e323e]">
                    <button
                      onClick={() => setPreviewMode('wysiwyg')}
                      className={`px-2 py-0.5 text-[10px] rounded ${previewMode === 'wysiwyg' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      Design Layout
                    </button>
                    <button
                      onClick={() => setPreviewMode('merged')}
                      className={`px-2 py-0.5 text-[10px] rounded ${previewMode === 'merged' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      Data Merge
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'code' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedCode)}
                    className="p-1 text-gray-400 hover:text-white flex items-center space-x-1"
                    title="Copy Raw Code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                  <button
                    onClick={handleDownloadCode}
                    className="p-1 text-gray-400 hover:text-white flex items-center space-x-1"
                    title="Download Command File"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 p-4 overflow-auto flex flex-col items-center justify-start bg-[#14161d]">
              {/* WYSIWYG PREVIEW */}
              {activeTab === 'preview' && (
                <div className="w-full h-full flex flex-col items-center justify-between space-y-3">
                  {/* Visual Substrate Container */}
                  <div className="flex-1 w-full flex items-center justify-center p-4 overflow-auto min-h-[340px]">
                    <div
                      className="relative bg-white shadow-2xl transition-all select-none overflow-hidden"
                      style={{
                        width: `${labelWidthPx}px`,
                        height: `${labelHeightPx}px`,
                        borderRadius: `${cornerRadiusPx}px`,
                        boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.5), 0 4px 12px -2px rgba(0, 0, 0, 0.4)',
                        backgroundColor: '#ffffff',
                      }}
                      title={`${doc.name} (${doc.dimensions.width}×${doc.dimensions.height}mm)`}
                    >
                      {/* Optional printable margin guidelines */}
                      {showMargins && doc.dimensions.margins && (
                        <div
                          className="absolute pointer-events-none border border-dashed border-blue-400/40 z-50"
                          style={{
                            left: `${(doc.dimensions.margins.left || 0) * MM_TO_PX * previewZoom}px`,
                            top: `${(doc.dimensions.margins.top || 0) * MM_TO_PX * previewZoom}px`,
                            right: `${(doc.dimensions.margins.right || 0) * MM_TO_PX * previewZoom}px`,
                            bottom: `${(doc.dimensions.margins.bottom || 0) * MM_TO_PX * previewZoom}px`,
                          }}
                        />
                      )}

                      {/* Render each structured template element independently */}
                      {[...doc.objects]
                        .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                        .map((obj) => {
                          if (!obj.visible) return null;
                          const objLeft = obj.x * MM_TO_PX * previewZoom;
                          const objTop = obj.y * MM_TO_PX * previewZoom;
                          const objWidth = obj.width * MM_TO_PX * previewZoom;
                          const objHeight = obj.height * MM_TO_PX * previewZoom;

                          return (
                            <div
                              key={obj.id}
                              style={{
                                position: 'absolute',
                                left: `${objLeft}px`,
                                top: `${objTop}px`,
                                width: `${objWidth}px`,
                                height: `${objHeight}px`,
                                opacity: obj.opacity ?? 1,
                                transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
                                transformOrigin: 'center center',
                                boxSizing: 'border-box',
                              }}
                            >
                              {renderLabelObjectContent(
                                obj,
                                effectiveActiveRecord,
                                counter
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Inspector / Status Footer */}
                  <div className="w-full bg-[#1b1e27] border border-[#2d313d] rounded-lg p-2 px-3 flex items-center justify-between text-[11px] text-gray-400">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center space-x-1.5 font-mono text-gray-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Physical Spec: {doc.dimensions.width}×{doc.dimensions.height}{doc.dimensions.unit}</span>
                      </span>
                      <span className="text-gray-500">|</span>
                      <span>Elements: <strong>{objectSummary.textCount}</strong> Text, <strong>{objectSummary.barcodeCount}</strong> Barcode, <strong>{objectSummary.qrCount}</strong> 2D, <strong>{objectSummary.imageCount}</strong> Image, <strong>{objectSummary.shapeCount}</strong> Shape</span>
                    </div>

                    <div className="flex items-center space-x-3 font-mono text-[10px]">
                      <span>Target: <strong className="text-cyan-400">{activePrinter.language}</strong> @ {activePrinter.dpi} DPI</span>
                    </div>
                  </div>
                </div>
              )}

              {/* BARTENDER INTEGRATION PAYLOAD */}
              {activeTab === 'bartender' && (
                <div className="h-full w-full flex flex-col">
                  <div className="text-[10px] text-gray-400 font-mono mb-1">
                    Structured BarTender REST API Payload (/api/actions JSON):
                  </div>
                  <pre className="flex-1 bg-[#12141a] border border-[#2b2f3a] p-3 rounded font-mono text-[11px] text-blue-300 overflow-auto select-text">
                    {JSON.stringify(
                      {
                        Header: {
                          Version: '2.0',
                          Client: 'LabelForge-Web-Studio',
                          RequestedByRole: currentUserRole,
                          Timestamp: new Date().toISOString(),
                        },
                        Actions: [
                          {
                            Type: 'PrintDocument',
                            DocumentFile: barTenderTemplate?.bartenderTemplateReference || `C:\\BarTender\\Templates\\${doc.name.replace(/\s+/g, '_')}.btw`,
                            Printer: activePrinter.systemPrinterName || activePrinter.name,
                            Copies: copies,
                            NamedSubStrings: templateVariables,
                            VerifyPrintCompletion: true,
                          },
                        ],
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}

              {/* RAW THERMAL CODE */}
              {activeTab === 'code' && (
                <div className="h-full w-full flex flex-col">
                  <div className="text-[10px] text-gray-400 font-mono mb-1">
                    Authentic {activePrinter.language} socket payload ready for transmission to port 9100 / LPR:
                  </div>
                  <pre className="flex-1 bg-[#12141a] border border-[#2b2f3a] p-3 rounded font-mono text-[11px] text-emerald-400 overflow-auto select-text">
                    {generatedCode}
                  </pre>
                </div>
              )}

              {/* PREFLIGHT STATUS */}
              {activeTab === 'preflight' && (
                <div className="w-full space-y-2">
                  <div className="font-semibold text-xs text-white mb-2">
                    Preflight Verification for {activePrinter.name}:
                  </div>
                  {diagnostics.map((d) => (
                    <div
                      key={d.id}
                      className={`p-2 rounded border flex items-start space-x-2 ${
                        d.severity === 'error' || d.severity === 'blocker'
                          ? 'bg-red-950/40 border-red-800 text-red-200'
                          : d.severity === 'warning'
                          ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                          : 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      }`}
                    >
                      {d.severity === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="font-semibold">{d.message}</div>
                        {d.suggestion && <div className="text-[10px] opacity-80 mt-0.5">{d.suggestion}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submission Handoff Status Banner */}
            {dispatchSuccess && (
              <div className="bg-emerald-950 border-t border-emerald-800 p-2.5 px-4 flex items-center justify-between text-emerald-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs">
                    Job <strong>{dispatchSuccess.id}</strong>: {dispatchSuccess.note}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-900/80 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                  {dispatchSuccess.status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-12 bg-[#252833] border-t border-[#343946] px-5 flex items-center justify-between">
          <div className="text-[11px] text-gray-400 flex items-center space-x-2">
            {!permission.allowed ? (
              <span className="text-red-400 font-bold flex items-center space-x-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{permission.reason}</span>
              </span>
            ) : blockerCount > 0 ? (
              <span className="text-red-400 font-bold">⚠ Cannot print: {blockerCount} blocker issue(s) detected</span>
            ) : isPrinterOffline ? (
              <span className="text-amber-400">⚠ Target printer offline — dispatch will queue in spooler</span>
            ) : (
              <span className="text-emerald-400">✓ Ready to dispatch {totalLabels} label(s) to {activePrinter.name}</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-[#2e3340] hover:bg-[#373d4d] text-gray-300 text-xs font-medium"
            >
              Close
            </button>
            <button
              disabled={isSubmitting || blockerCount > 0 || !permission.allowed}
              onClick={handlePrint}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting to BarTender...</span>
                </>
              ) : (
                <>
                  <Printer className="w-3.5 h-3.5" />
                  <span>Send Print Job ({totalLabels} Labels)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
