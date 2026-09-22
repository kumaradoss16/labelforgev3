import React, { useState } from 'react';
import {
  X,
  History,
  RotateCcw,
  Play,
  Copy,
  Download,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  GitBranch,
  BookmarkPlus,
  Eye,
  Columns,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';
import { TemplateRecord, TemplateVersionRecord } from '../../types/template';
import { TemplatePreviewCanvas } from './TemplatePreviewCanvas';
import {
  restoreTemplateVersion,
  createManualVersionCheckpoint,
  forkTemplateFromVersion,
  exportTemplatePackage
} from '../../services/templateStorage';
import { LabelDocument } from '../../types/label';

interface TemplateVersionHistoryModalProps {
  isOpen: boolean;
  template: TemplateRecord | null;
  onClose: () => void;
  onTemplateUpdated?: (updatedTemplate: TemplateRecord) => void;
  onRestored?: (updatedTemplate: TemplateRecord, restoredVersion: number) => void;
  onUseVersionToDesign?: (doc: LabelDocument, templateRecord: TemplateRecord) => void;
  onUseVersion?: (templateRecord: TemplateRecord, doc: LabelDocument) => void;
}

export const TemplateVersionHistoryModal: React.FC<TemplateVersionHistoryModalProps> = ({
  isOpen,
  template,
  onClose,
  onTemplateUpdated,
  onRestored,
  onUseVersionToDesign,
  onUseVersion,
}) => {
  if (!isOpen || !template) return null;

  // Currently selected version in timeline (defaults to current version)
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(template.version || 1);
  const [compareMode, setCompareMode] = useState<'single' | 'compare'>('single');
  
  // Restoration confirmation modal state
  const [isRestoring, setIsRestoring] = useState(false);
  const [restorationAuthor, setRestorationAuthor] = useState('Design Engineer');
  const [restorationNote, setRestorationNote] = useState('');

  // Manual checkpoint state
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [checkpointAuthor, setCheckpointAuthor] = useState('Design Engineer');
  const [checkpointSummary, setCheckpointSummary] = useState('');

  // Fork state
  const [isForking, setIsForking] = useState(false);
  const [forkName, setForkName] = useState(`${template.name} (Rev v${selectedVersionNum})`);

  // Toast / feedback message
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Compile full timeline: Current active version + historical snapshots
  const currentSnapshotDoc = template.document;
  const historyRecords: TemplateVersionRecord[] = template.versionHistory || [];

  // Find the selected version document & meta
  const isSelectedCurrent = selectedVersionNum === template.version;
  const selectedHistoricalRecord = historyRecords.find(v => v.version === selectedVersionNum);

  const selectedDoc: LabelDocument = isSelectedCurrent
    ? currentSnapshotDoc
    : selectedHistoricalRecord?.snapshotDoc || currentSnapshotDoc;

  const selectedAuthor = isSelectedCurrent
    ? (template.createdBy || template.author || 'Design Engineer')
    : (selectedHistoricalRecord?.updatedBy || 'Design Engineer');

  const selectedTimestamp = isSelectedCurrent
    ? (template.updatedAt || template.modified || template.createdAt || new Date().toISOString())
    : (selectedHistoricalRecord?.updatedAt || new Date().toISOString());

  const selectedSummary = isSelectedCurrent
    ? 'Current Active Working Master (Latest Revision)'
    : (selectedHistoricalRecord?.changeSummary || `Snapshot of revision v${selectedVersionNum}`);

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffDay > 0) return `${diffDay}d ago`;
      if (diffHour > 0) return `${diffHour}h ago`;
      if (diffMin > 0) return `${diffMin}m ago`;
      return 'just now';
    } catch {
      return '';
    }
  };

  // Handle Restore
  const handleExecuteRestore = () => {
    if (isSelectedCurrent) {
      showNotification('error', 'Selected version is already the active master.');
      return;
    }

    const res = restoreTemplateVersion(
      template.id,
      selectedVersionNum,
      restorationAuthor.trim() || 'Design Engineer',
      restorationNote.trim()
    );

    if (res.success && res.template) {
      showNotification('success', `Restored template to revision v${selectedVersionNum} (Created new revision v${res.template.version}).`);
      onTemplateUpdated?.(res.template);
      onRestored?.(res.template, selectedVersionNum);
      setIsRestoring(false);
      setSelectedVersionNum(res.template.version);
    } else {
      showNotification('error', res.error || 'Failed to restore template version.');
    }
  };

  // Handle Create Manual Checkpoint
  const handleExecuteCheckpoint = () => {
    if (!checkpointSummary.trim()) {
      showNotification('error', 'Please provide a change summary for the milestone checkpoint.');
      return;
    }

    const res = createManualVersionCheckpoint(
      template.id,
      checkpointSummary.trim(),
      checkpointAuthor.trim() || 'Design Engineer'
    );

    if (res.success && res.template) {
      showNotification('success', `Created milestone version snapshot v${res.template.version}.`);
      onTemplateUpdated(res.template);
      setIsCreatingCheckpoint(false);
      setCheckpointSummary('');
      setSelectedVersionNum(res.template.version);
    } else {
      showNotification('error', res.error || 'Failed to create checkpoint.');
    }
  };

  // Handle Fork Version
  const handleExecuteFork = () => {
    const res = forkTemplateFromVersion(
      template.id,
      selectedVersionNum,
      forkName.trim() || `${template.name} (Forked v${selectedVersionNum})`,
      'Design Engineer'
    );

    if (res.success && res.template) {
      showNotification('success', `Created new standalone template "${res.template.name}".`);
      setIsForking(false);
    } else {
      showNotification('error', res.error || 'Failed to fork template.');
    }
  };

  // Handle Export Version
  const handleExportSnapshot = () => {
    try {
      const exportRecord: TemplateRecord = {
        ...template,
        version: selectedVersionNum,
        document: selectedDoc,
        updatedAt: selectedTimestamp,
        createdBy: selectedAuthor,
      };
      const json = exportTemplatePackage(exportRecord);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_v${selectedVersionNum}.lforge`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('success', `Exported v${selectedVersionNum} snapshot to .lforge package.`);
    } catch (err: any) {
      showNotification('error', `Export error: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div
        className="w-full max-w-5xl h-[88vh] bg-[#161820] border border-[#2b303c] rounded-xl shadow-2xl flex flex-col overflow-hidden text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-[#1c202a] border-b border-[#2d323f] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-950/80 border border-blue-800/60 text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">{template.name}</h2>
                <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 text-xs font-mono font-semibold">
                  Active v{template.version || 1}
                </span>
                {template.isReadOnly && (
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-gray-400 border border-zinc-700 text-xs">
                    Factory Standard
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Version Timeline, Metadata Audit Trail &amp; Document Restoration
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!template.isReadOnly && (
              <button
                onClick={() => setIsCreatingCheckpoint(true)}
                className="px-3 py-1.5 rounded-lg bg-[#252a36] hover:bg-[#2e3444] text-gray-200 text-xs font-medium border border-[#373e52] flex items-center space-x-1.5 transition-colors"
                title="Create a milestone snapshot checkpoint"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Create Checkpoint</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#2d323f] text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-800/50'
                : 'bg-red-950/90 text-red-300 border-b border-red-800/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Body: 2 Columns (Timeline vs Inspector Preview) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Version Timeline */}
          <div className="w-80 border-r border-[#262b37] bg-[#181a22] flex flex-col">
            <div className="p-3 bg-[#1c202a] border-b border-[#262b37] flex items-center justify-between text-xs text-gray-400 font-semibold">
              <span>REVISION HISTORY ({1 + historyRecords.length})</span>
              <span className="font-mono text-[11px] text-blue-400">Total Milestones</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {/* Active Version Item (Top) */}
              <div
                onClick={() => setSelectedVersionNum(template.version || 1)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedVersionNum === template.version
                    ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-[#1e222c] border-[#2d323f] hover:border-gray-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[11px] font-bold font-mono">
                      v{template.version || 1}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-semibold">
                      CURRENT MASTER
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {getRelativeTime(template.updatedAt || template.modified || new Date().toISOString())}
                  </span>
                </div>

                <p className="text-xs text-gray-200 line-clamp-2 mt-1">
                  {template.description || 'Current working master template design'}
                </p>

                <div className="mt-2.5 pt-2 border-t border-[#2d3342] flex items-center justify-between text-[10px] text-gray-400">
                  <span className="flex items-center space-x-1 truncate max-w-[110px]">
                    <User className="w-3 h-3 text-gray-500" />
                    <span>{template.createdBy || 'Design Engineer'}</span>
                  </span>
                  <span className="font-mono text-gray-400">
                    {template.document.objects.length} elements
                  </span>
                </div>

                {/* Explicit View & Restore action buttons for Current Version */}
                <div className="mt-2.5 pt-2 border-t border-[#272b38] flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVersionNum(template.version || 1);
                    }}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-medium flex items-center justify-center space-x-1 transition-colors ${
                      selectedVersionNum === template.version
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#262b3a] hover:bg-[#32394c] text-blue-300 border border-blue-900/50'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{selectedVersionNum === template.version ? 'Viewing' : 'View'}</span>
                  </button>

                  <button
                    disabled
                    className="flex-1 py-1 px-2 rounded text-[11px] font-medium flex items-center justify-center space-x-1 bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
                    title="This is currently the active working version"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500/70" />
                    <span>Active</span>
                  </button>
                </div>
              </div>

              {/* Historical Snapshots */}
              {historyRecords.map((rec) => (
                <div
                  key={rec.version}
                  onClick={() => setSelectedVersionNum(rec.version)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedVersionNum === rec.version
                      ? 'bg-blue-950/40 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                      : 'bg-[#1c202a] border-[#292e3a] hover:border-gray-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-[#2a3040] text-gray-200 text-[11px] font-bold font-mono border border-gray-600/40">
                        v{rec.version}
                      </span>
                      {rec.isRestorationPoint && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800/60 text-[9px] font-semibold">
                          RESTORED
                        </span>
                      )}
                      {rec.isMilestone && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/60 text-[9px] font-semibold">
                          MILESTONE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {getRelativeTime(rec.updatedAt)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 line-clamp-2 mt-1 font-medium">
                    {rec.changeSummary}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-[#292e3a] flex items-center justify-between text-[10px] text-gray-400">
                    <span className="flex items-center space-x-1 truncate max-w-[110px]">
                      <User className="w-3 h-3 text-gray-500" />
                      <span>{rec.updatedBy || 'Engineer'}</span>
                    </span>
                    <span className="font-mono text-gray-400">
                      {rec.snapshotDoc?.objects?.length || rec.elementCount || 0} elements
                    </span>
                  </div>

                  {/* Explicit View & Restore action buttons for Historical Version Entry */}
                  <div className="mt-2.5 pt-2 border-t border-[#242834] flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVersionNum(rec.version);
                      }}
                      className={`flex-1 py-1 px-2 rounded text-[11px] font-medium flex items-center justify-center space-x-1 transition-colors ${
                        selectedVersionNum === rec.version
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-[#232734] hover:bg-[#2c3242] text-gray-300 border border-[#343b4d]'
                      }`}
                    >
                      <Eye className="w-3 h-3 text-blue-400" />
                      <span>{selectedVersionNum === rec.version ? 'Viewing' : 'View'}</span>
                    </button>

                    {!template.isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVersionNum(rec.version);
                          setIsRestoring(true);
                        }}
                        className="flex-1 py-1 px-2 rounded text-[11px] font-medium flex items-center justify-center space-x-1 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800/60 transition-colors"
                        title={`Restore template to snapshot v${rec.version}`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {historyRecords.length === 0 && (
                <div className="p-4 text-center text-xs text-gray-500 italic bg-[#15171e] rounded border border-dashed border-[#2b303c]">
                  No prior version snapshots recorded yet. Updates made to this template will automatically generate version points.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Version Inspector & Diff Preview */}
          <div className="flex-1 flex flex-col bg-[#14161d]">
            {/* Version Meta Bar */}
            <div className="p-3.5 bg-[#1a1d26] border-b border-[#282d3b] flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">
                    Inspecting Revision v{selectedVersionNum}
                  </span>
                  {isSelectedCurrent ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold">
                      Active Master
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-gray-300 text-[11px] font-mono">
                      Historical Snapshot
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                  <span className="flex items-center space-x-1">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    <span>Author: <strong className="text-gray-200">{selectedAuthor}</strong></span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Timestamp: <strong className="text-gray-200">{formatDateTime(selectedTimestamp)}</strong></span>
                  </span>
                  <span>•</span>
                  <span>
                    Geometry: <strong className="text-gray-200 font-mono">{selectedDoc.dimensions.width} × {selectedDoc.dimensions.height} {selectedDoc.dimensions.unit}</strong>
                  </span>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-[#12141a] p-1 rounded-lg border border-[#2b303c]">
                <button
                  onClick={() => setCompareMode('single')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-colors ${
                    compareMode === 'single'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Single View</span>
                </button>
                <button
                  onClick={() => setCompareMode('compare')}
                  className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-colors ${
                    compareMode === 'compare'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Compare vs Active</span>
                </button>
              </div>
            </div>

            {/* Change Summary Box */}
            <div className="px-4 py-2.5 bg-[#171922] border-b border-[#232733] text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="text-gray-400">Change Note:</span>
                <span className="text-gray-200 font-medium">{selectedSummary}</span>
              </div>
              <span className="text-gray-500 text-[11px] font-mono">
                {selectedDoc.objects.length} Vector Objects
              </span>
            </div>

            {/* Canvas Preview Area */}
            <div className="flex-1 p-4 overflow-y-auto flex items-center justify-center bg-[#0e1015]">
              {compareMode === 'single' ? (
                <div className="w-full max-w-lg aspect-[4/3] max-h-[380px] bg-[#181b24] p-3 rounded-lg border border-[#2d323f] shadow-inner flex flex-col">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2b303c] text-[11px] text-gray-400">
                    <span className="font-semibold text-white">Revision v{selectedVersionNum} Vector Layout</span>
                    <span className="font-mono">{selectedDoc.dimensions.width} × {selectedDoc.dimensions.height} {selectedDoc.dimensions.unit}</span>
                  </div>
                  <div className="flex-1 w-full relative overflow-hidden mt-2">
                    <TemplatePreviewCanvas
                      document={selectedDoc}
                      sampleData={template.sampleData}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              ) : (
                /* Compare Mode: Side-by-Side */
                <div className="w-full grid grid-cols-2 gap-4 h-full max-h-[380px]">
                  {/* Left: Selected Version */}
                  <div className="bg-[#181b24] p-3 rounded-lg border border-[#2d323f] shadow-inner flex flex-col">
                    <div className="flex items-center justify-between pb-2 border-b border-[#2b303c] text-[11px]">
                      <span className="font-bold text-amber-400">Selected: v{selectedVersionNum}</span>
                      <span className="text-gray-400 font-mono">{selectedDoc.objects.length} objects</span>
                    </div>
                    <div className="flex-1 w-full relative overflow-hidden mt-2">
                      <TemplatePreviewCanvas
                        document={selectedDoc}
                        sampleData={template.sampleData}
                        className="w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Right: Active Current Version */}
                  <div className="bg-[#181b24] p-3 rounded-lg border border-blue-900/60 shadow-inner flex flex-col">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-900/60 text-[11px]">
                      <span className="font-bold text-emerald-400">Active Master: v{template.version || 1}</span>
                      <span className="text-gray-400 font-mono">{template.document.objects.length} objects</span>
                    </div>
                    <div className="flex-1 w-full relative overflow-hidden mt-2">
                      <TemplatePreviewCanvas
                        document={template.document}
                        sampleData={template.sampleData}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-3.5 bg-[#1a1d26] border-t border-[#282d3b] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportSnapshot}
                  className="px-3 py-1.5 rounded-lg bg-[#232733] hover:bg-[#2b3140] text-gray-200 text-xs font-medium border border-[#343b4d] flex items-center space-x-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export v{selectedVersionNum}</span>
                </button>

                <button
                  onClick={() => setIsForking(true)}
                  className="px-3 py-1.5 rounded-lg bg-[#232733] hover:bg-[#2b3140] text-gray-200 text-xs font-medium border border-[#343b4d] flex items-center space-x-1.5 transition-colors"
                >
                  <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fork as New Template</span>
                </button>

                <button
                  onClick={() => {
                    onUseVersionToDesign?.(selectedDoc, template);
                    onUseVersion?.(template, selectedDoc);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#232733] hover:bg-[#2b3140] text-blue-300 text-xs font-medium border border-blue-900/50 flex items-center space-x-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Design from v{selectedVersionNum}</span>
                </button>
              </div>

              {!template.isReadOnly && (
                <button
                  disabled={isSelectedCurrent}
                  onClick={() => setIsRestoring(true)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md ${
                    isSelectedCurrent
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                      : 'bg-amber-600 hover:bg-amber-500 text-white hover:shadow-amber-600/20'
                  }`}
                  title={isSelectedCurrent ? 'Already active version' : `Restore template to v${selectedVersionNum}`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restore Version v{selectedVersionNum}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Dialog: Restore Confirmation */}
        {isRestoring && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div
              className="w-full max-w-md bg-[#1c202a] border border-[#343a4a] rounded-xl p-5 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 text-amber-400">
                <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-800/60">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Restore Version v{selectedVersionNum}?</h3>
                  <p className="text-xs text-gray-400">This will revert the active template to this snapshot</p>
                </div>
              </div>

              <div className="p-3 bg-[#14161d] rounded-lg border border-[#2b303c] text-xs space-y-2 text-gray-300">
                <div className="flex justify-between">
                  <span className="text-gray-400">Target Snapshot:</span>
                  <strong className="font-mono text-white">v{selectedVersionNum}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Author:</span>
                  <span className="text-gray-200">{selectedAuthor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Timestamp:</span>
                  <span className="text-gray-200">{formatDateTime(selectedTimestamp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Audit Trail:</span>
                  <span className="text-emerald-400 font-medium">Safe (Creates next version v{(template.version || 1) + 1})</span>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Restoration Author / Engineer</label>
                  <input
                    type="text"
                    value={restorationAuthor}
                    onChange={e => setRestorationAuthor(e.target.value)}
                    className="w-full bg-[#14161d] border border-[#343a4a] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Restoration Reason / Note (Optional)</label>
                  <input
                    type="text"
                    placeholder={`e.g. Reverted to v${selectedVersionNum} due to scanner compatibility`}
                    value={restorationNote}
                    onChange={e => setRestorationNote(e.target.value)}
                    className="w-full bg-[#14161d] border border-[#343a4a] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#2b303c]">
                <button
                  onClick={() => setIsRestoring(false)}
                  className="px-4 py-2 rounded-lg bg-[#252a36] hover:bg-[#2e3444] text-gray-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteRestore}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirm Restoration</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Dialog: Create Checkpoint */}
        {isCreatingCheckpoint && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div
              className="w-full max-w-md bg-[#1c202a] border border-[#343a4a] rounded-xl p-5 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 text-blue-400">
                <div className="p-2 rounded-lg bg-blue-950/80 border border-blue-800/60">
                  <BookmarkPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Create Milestone Checkpoint</h3>
                  <p className="text-xs text-gray-400">Record a permanent named version milestone</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Engineer / Author Name</label>
                  <input
                    type="text"
                    value={checkpointAuthor}
                    onChange={e => setCheckpointAuthor(e.target.value)}
                    className="w-full bg-[#14161d] border border-[#343a4a] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Milestone Change Summary *</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Release 2.0 - Verified barcode scannability for Zebra ZT410 and added GHS warning pictogram"
                    value={checkpointSummary}
                    onChange={e => setCheckpointSummary(e.target.value)}
                    className="w-full bg-[#14161d] border border-[#343a4a] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#2b303c]">
                <button
                  onClick={() => setIsCreatingCheckpoint(false)}
                  className="px-4 py-2 rounded-lg bg-[#252a36] hover:bg-[#2e3444] text-gray-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteCheckpoint}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save Milestone</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Dialog: Fork Version */}
        {isForking && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div
              className="w-full max-w-md bg-[#1c202a] border border-[#343a4a] rounded-xl p-5 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 text-cyan-400">
                <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/60">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Fork Revision as New Template</h3>
                  <p className="text-xs text-gray-400">Create an independent template from v{selectedVersionNum}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">New Template Name *</label>
                <input
                  type="text"
                  value={forkName}
                  onChange={e => setForkName(e.target.value)}
                  className="w-full bg-[#14161d] border border-[#343a4a] focus:border-blue-500 rounded px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#2b303c]">
                <button
                  onClick={() => setIsForking(false)}
                  className="px-4 py-2 rounded-lg bg-[#252a36] hover:bg-[#2e3444] text-gray-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteFork}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>Create Fork</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
