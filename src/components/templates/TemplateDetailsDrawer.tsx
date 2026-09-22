import React, { useState } from 'react';
import {
  X,
  Play,
  Copy,
  Download,
  Edit3,
  Star,
  Layers,
  Printer,
  History,
  Tag,
  Calendar,
  User,
  Barcode,
  QrCode,
  Sparkles,
  Sliders,
  CheckCircle2,
  Lock,
  RefreshCw
} from 'lucide-react';
import { TemplateRecord, TemplateVariableDef } from '../../types/template';
import { TemplatePreviewCanvas } from './TemplatePreviewCanvas';
import { resolveTemplateVariables } from '../../services/templateStorage';

interface TemplateDetailsDrawerProps {
  template: TemplateRecord | null;
  onClose: () => void;
  onUseTemplate: (template: TemplateRecord, sampleData?: Record<string, any>) => void;
  onEditMasterTemplate?: (template: TemplateRecord) => void;
  onDuplicate: (template: TemplateRecord) => void;
  onExport: (template: TemplateRecord) => void;
  onToggleFavorite: (id: string) => void;
}

export const TemplateDetailsDrawer: React.FC<TemplateDetailsDrawerProps> = ({
  template,
  onClose,
  onUseTemplate,
  onEditMasterTemplate,
  onDuplicate,
  onExport,
  onToggleFavorite,
}) => {
  if (!template) return null;

  const [activeTab, setActiveTab] = useState<'preview' | 'variables' | 'versions' | 'printer'>('preview');
  const [liveSampleData, setLiveSampleData] = useState<Record<string, any>>(
    template.sampleData || {}
  );
  const [showGrid, setShowGrid] = useState(false);

  const handleVariableChange = (key: string, value: string) => {
    setLiveSampleData(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetSampleData = () => {
    setLiveSampleData(template.sampleData || {});
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl h-full bg-[#181a22] border-l border-[#2e3342] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#1e2129] border-b border-[#2d323f] flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              onClick={() => onToggleFavorite(template.id)}
              className={`p-1.5 rounded hover:bg-[#2d323f] transition-colors ${
                template.favorite ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
              }`}
              title={template.favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-5 h-5 ${template.favorite ? 'fill-amber-400' : ''}`} />
            </button>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-white text-base truncate">{template.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800/60">
                  {template.category}
                </span>
                {template.isReadOnly && (
                  <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-800 text-gray-400 text-[10px]">
                    <Lock className="w-3 h-3 text-blue-400" />
                    <span>Read-Only</span>
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-xs truncate mt-0.5">
                {template.description || 'Enterprise LabelForge design definition'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2d323f] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2d323f] bg-[#1a1d26] px-4">
          {[
            { id: 'preview', label: 'Live Preview & Canvas' },
            { id: 'variables', label: `Dynamic Variables (${template.variables?.length || 0})` },
            { id: 'printer', label: 'Print Profile' },
            { id: 'versions', label: `Version History (v${template.version || 1})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white bg-[#222734]'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ================= PREVIEW TAB ================= */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Canvas Preview Container */}
              <div className="relative p-4 bg-[#111318] border border-[#2e3342] rounded-xl flex flex-col items-center justify-center">
                <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-[#262a36] text-xs text-gray-400 font-mono">
                  <span>
                    Geometry: {template.width} × {template.height} {template.unit} ({template.orientation})
                  </span>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-1.5 cursor-pointer text-gray-400 hover:text-gray-200">
                      <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                        className="rounded bg-[#202430] border-gray-600 text-blue-500 focus:ring-0"
                      />
                      <span>Show Grid</span>
                    </label>
                  </div>
                </div>

                <div className="w-full max-w-md h-64 flex items-center justify-center p-2">
                  <TemplatePreviewCanvas
                    document={template.document}
                    sampleData={liveSampleData}
                    showGrid={showGrid}
                    className="w-full h-full max-h-60"
                  />
                </div>
              </div>

              {/* Quick Specification Metadata Matrix */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#1e2129] border border-[#2e3342] rounded-lg">
                  <span className="text-gray-400 block text-[11px] mb-1">Target Substrate / Dimensions</span>
                  <strong className="text-white font-mono">
                    {template.width} × {template.height} {template.unit} ({template.orientation})
                  </strong>
                </div>

                <div className="p-3 bg-[#1e2129] border border-[#2e3342] rounded-lg">
                  <span className="text-gray-400 block text-[11px] mb-1">Primary Symbology</span>
                  <strong className="text-cyan-400 font-mono">
                    {template.primarySymbology?.toUpperCase() || (template.supportsQr ? '2D MATRIX / QR' : 'NONE')}
                  </strong>
                </div>

                <div className="p-3 bg-[#1e2129] border border-[#2e3342] rounded-lg">
                  <span className="text-gray-400 block text-[11px] mb-1">Layer Count / Objects</span>
                  <strong className="text-gray-200 font-mono">{template.elementCount} Canvas Elements</strong>
                </div>

                <div className="p-3 bg-[#1e2129] border border-[#2e3342] rounded-lg">
                  <span className="text-gray-400 block text-[11px] mb-1">Author / Origin</span>
                  <strong className="text-gray-200 truncate block">{template.createdBy || 'LabelForge Core'}</strong>
                </div>
              </div>

              {/* Tags */}
              {template.tags && template.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  <Tag className="w-3.5 h-3.5 text-gray-500 mr-1" />
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded bg-[#202430] border border-[#303648] text-gray-300 text-[11px]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= VARIABLES TAB ================= */}
          {activeTab === 'variables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Edit sample data below to test live template field resolution on the label.
                </p>
                <button
                  onClick={handleResetSampleData}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-[#252936] hover:bg-[#2f3545] text-[11px] text-gray-300 border border-[#353c4d]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
              </div>

              {template.variables && template.variables.length > 0 ? (
                <div className="space-y-3">
                  {template.variables.map((v) => (
                    <div
                      key={v.key}
                      className="p-3 bg-[#1e2129] border border-[#2e3342] rounded-lg space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-white flex items-center space-x-1.5">
                          <span>{v.label}</span>
                          <span className="text-blue-400 font-mono text-[11px]">
                            {`{{${v.key}}}`}
                          </span>
                        </label>
                        <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-gray-400 text-[10px] uppercase font-mono">
                          {v.type}
                        </span>
                      </div>

                      <input
                        type="text"
                        value={liveSampleData[v.key] ?? ''}
                        onChange={(e) => handleVariableChange(v.key, e.target.value)}
                        placeholder={v.defaultValue ? String(v.defaultValue) : `Enter ${v.label}...`}
                        className="w-full bg-[#12141a] border border-[#343a4a] focus:border-blue-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-[#1e2129] border border-[#2e3342] rounded-lg text-gray-400 text-xs">
                  No dynamic {`{{variable}}`} placeholders found in this template.
                </div>
              )}
            </div>
          )}

          {/* ================= PRINTER PROFILE TAB ================= */}
          {activeTab === 'printer' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#1e2129] border border-[#2e3342] rounded-lg space-y-3 text-xs">
                <div className="flex items-center space-x-2 text-white font-semibold">
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Recommended Print Dispatch Configuration</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-gray-400 block text-[11px]">Command Language</span>
                    <strong className="text-white font-mono">
                      {template.printConfig?.recommendedPrinterType || 'Zebra ZPL-II / TSPL'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Printhead DPI</span>
                    <strong className="text-white font-mono">
                      {template.printConfig?.dpi || 300} DPI (12 dots/mm)
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Thermal Darkness / Burn</span>
                    <strong className="text-white font-mono">
                      {template.printConfig?.darkness || 15} / 30
                    </strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px]">Media Sensor Type</span>
                    <strong className="text-white font-mono">
                      {template.printConfig?.mediaType?.toUpperCase() || 'GAP / DIE-CUT'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= VERSIONS TAB ================= */}
          {activeTab === 'versions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Version Audit Log &amp; Snapshots</span>
                <span className="font-mono text-blue-400">Current: v{template.version || 1}</span>
              </div>

              {template.versionHistory && template.versionHistory.length > 0 ? (
                <div className="space-y-2">
                  {template.versionHistory.map((ver, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#1e2129] border border-[#2e3342] rounded-lg text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white font-mono">v{ver.version}</span>
                        <span className="text-gray-500 text-[10px]">
                          {new Date(ver.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-xs">{ver.changeSummary}</p>
                      <span className="text-gray-500 text-[10px] block">By {ver.updatedBy}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center bg-[#1e2129] border border-[#2e3342] rounded-lg text-gray-400 text-xs">
                  Initial version (v1.0) — no prior version records.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#1e2129] border-t border-[#2d323f] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onExport(template)}
              className="px-3 py-2 rounded bg-[#252936] hover:bg-[#2f3545] text-gray-200 text-xs font-medium border border-[#343b4d] flex items-center space-x-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export .lforge</span>
            </button>

            <button
              onClick={() => onDuplicate(template)}
              className="px-3 py-2 rounded bg-[#252936] hover:bg-[#2f3545] text-gray-200 text-xs font-medium border border-[#343b4d] flex items-center space-x-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Duplicate</span>
            </button>

            {onEditMasterTemplate && !template.isReadOnly && (
              <button
                onClick={() => onEditMasterTemplate(template)}
                className="px-3 py-2 rounded bg-[#252936] hover:bg-[#2f3545] text-blue-300 text-xs font-medium border border-blue-900/60 flex items-center space-x-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Master</span>
              </button>
            )}
          </div>

          <button
            onClick={() => onUseTemplate(template, liveSampleData)}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg flex items-center space-x-2 transition-all transform hover:scale-105"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Create Design from Template</span>
          </button>
        </div>
      </div>
    </div>
  );
};
