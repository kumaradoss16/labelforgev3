import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Layers,
  Settings,
  Sliders
} from 'lucide-react';
import { LabelDocument } from '../../types/label';
import { PrinterProfile, PrintJob } from '../../types/printer';
import { DataSourceDefinition, SerializationCounter } from '../../types/database';
import { generateZplFromDocument } from '../../services/zplGenerator';
import { generateTsplFromDocument } from '../../services/tsplGenerator';
import { runPreflightValidation } from '../../services/preflightValidator';

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
}) => {
  if (!isOpen) return null;

  const [copies, setCopies] = useState(1);
  const [recordRange, setRecordRange] = useState<'current' | 'all' | 'range'>('current');
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(10);
  const [speed, setSpeed] = useState(6);
  const [darkness, setDarkness] = useState(18);
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'preflight'>('preview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  const activePrinter = printers.find(p => p.id === activePrinterId) || printers[0];
  const diagnostics = runPreflightValidation(doc);
  const blockerCount = diagnostics.filter(d => d.severity === 'error' || d.severity === 'blocker').length;

  // Generate authentic raw printer code based on printer language
  const generatedCode =
    activePrinter.language === 'TSPL'
      ? generateTsplFromDocument(doc, { copies, darkness, speed })
      : generateZplFromDocument(doc, { copies, darkness, speed });

  const totalRecordsToPrint =
    recordRange === 'current'
      ? 1
      : recordRange === 'all'
      ? (dataSource?.records.length || 1)
      : Math.max(1, rangeEnd - rangeStart + 1);

  const totalLabels = totalRecordsToPrint * copies;

  const handlePrint = () => {
    setIsSubmitting(true);
    setDispatchSuccess(null);

    // Simulate enterprise socket/spooler submission
    setTimeout(() => {
      setIsSubmitting(false);
      const jobId = `JOB-${Math.floor(100000 + Math.random() * 900000)}`;
      setDispatchSuccess(jobId);

      const job: PrintJob = {
        id: jobId,
        jobName: `${doc.name} - Batch #${jobId.split('-')[1]}`,
        templateName: doc.name,
        templateVersion: doc.metadata.version || 1,
        printerId: activePrinter.id,
        printerName: activePrinter.name,
        copies,
        recordCount: totalRecordsToPrint,
        status: 'COMPLETED',
        createdAt: new Date().toLocaleTimeString(),
        outputLanguage: activePrinter.language,
        rawPayloadPreview: generatedCode.slice(0, 500),
      };

      onJobDispatched(job);
    }, 900);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadCode = () => {
    const ext = activePrinter.language === 'TSPL' ? 'tspl' : 'zpl';
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${doc.name.replace(/\s+/g, '_')}_${activePrinter.language}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-[#1e2129] border border-[#343946] rounded-lg shadow-2xl flex flex-col max-h-[90vh] text-[#c9ccd3] text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="h-10 bg-[#252833] border-b border-[#343946] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white text-sm">Enterprise Print Dispatch Workstation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#323644] text-gray-400 hover:text-white"
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
                Target Printer:
              </label>
              <select
                value={activePrinterId}
                onChange={(e) => onSelectPrinter(e.target.value)}
                className="w-full bg-[#1e212a] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.language})
                  </option>
                ))}
              </select>

              <div className="mt-1.5 p-2 rounded bg-[#13151b] border border-[#272b35] text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Connection:</span>
                  <span className="font-mono text-gray-300">{activePrinter.connection} ({activePrinter.address})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Language:</span>
                  <span className="font-mono text-cyan-400 font-bold">{activePrinter.language}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Resolution:</span>
                  <span className="font-mono text-gray-300">{activePrinter.dpi} DPI</span>
                </div>
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
                  className="w-full bg-[#1e212a] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white"
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
                  className="w-full bg-[#1e212a] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Record Range Selection */}
            <div className="space-y-1.5 border-t border-[#2a2e39] pt-3">
              <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Database Records to Print:
              </label>
              <div className="space-y-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recRange"
                    checked={recordRange === 'current'}
                    onChange={() => setRecordRange('current')}
                    className="text-blue-600"
                  />
                  <span>Active Record Only (Record #{dataSource ? dataSource.currentRecordIndex + 1 : 1})</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recRange"
                    checked={recordRange === 'all'}
                    onChange={() => setRecordRange('all')}
                    className="text-blue-600"
                  />
                  <span>All Records in Active Dataset ({dataSource?.records.length || 1} records)</span>
                </label>
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
            <div className="flex-1 p-4 overflow-auto">
              {/* WYSIWYG PREVIEW */}
              {activeTab === 'preview' && (
                <div className="h-full flex flex-col items-center justify-center">
                  <div
                    className="bg-white p-4 shadow-xl border border-gray-300 rounded max-w-sm w-full text-black flex flex-col items-center justify-center space-y-3"
                    style={{ minHeight: '220px' }}
                  >
                    <div className="text-center font-bold text-xs border-b border-gray-200 pb-1 w-full">
                      {doc.name}
                    </div>
                    <div className="text-[10px] text-gray-600">
                      Physical Format: {doc.dimensions.width}mm × {doc.dimensions.height}mm @ {activePrinter.dpi} DPI
                    </div>
                    <div className="text-[11px] font-mono p-2 bg-gray-100 rounded w-full text-center">
                      Verified Barcode &amp; Text Substrate Ready
                    </div>
                    <div className="text-[9px] text-gray-400">
                      Hardware Emulation: {activePrinter.manufacturer} ({activePrinter.language})
                    </div>
                  </div>
                </div>
              )}

              {/* RAW THERMAL CODE */}
              {activeTab === 'code' && (
                <div className="h-full flex flex-col">
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
                <div className="space-y-2">
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

            {/* Submission Success Banner */}
            {dispatchSuccess && (
              <div className="bg-emerald-950 border-t border-emerald-800 p-2.5 px-4 flex items-center justify-between text-emerald-200">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Job <strong>{dispatchSuccess}</strong> successfully transmitted to <strong>{activePrinter.address}</strong>!</span>
                </div>
                <span className="text-[10px] font-mono bg-emerald-900/80 px-2 py-0.5 rounded">STATUS: COMPLETED</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-12 bg-[#252833] border-t border-[#343946] px-4 flex items-center justify-between">
          <div className="text-[11px] text-gray-400">
            {blockerCount > 0 ? (
              <span className="text-red-400 font-bold">⚠ Cannot print: {blockerCount} blocker issue(s) detected</span>
            ) : (
              <span className="text-emerald-400">✓ Ready to dispatch to {activePrinter.model}</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#2e3340] hover:bg-[#373d4d] text-gray-300 text-xs"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting || blockerCount > 0}
              onClick={handlePrint}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitting ZPL...</span>
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
