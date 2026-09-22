import React, { useState } from 'react';
import {
  Star,
  Play,
  Edit3,
  Copy,
  Download,
  Trash2,
  Lock,
  MoreVertical,
  QrCode,
  Barcode,
  Layers,
  Sparkles,
  Printer,
  Info,
  History
} from 'lucide-react';
import { TemplateRecord } from '../../types/template';
import { TemplatePreviewCanvas } from './TemplatePreviewCanvas';

interface TemplateCardProps {
  template: TemplateRecord;
  viewMode: 'grid' | 'list';
  onUseTemplate: (template: TemplateRecord) => void;
  onEditMasterTemplate?: (template: TemplateRecord) => void;
  onDuplicate: (template: TemplateRecord) => void;
  onToggleFavorite: (id: string) => void;
  onExport: (template: TemplateRecord) => void;
  onDelete: (template: TemplateRecord) => void;
  onInspect: (template: TemplateRecord) => void;
  onOpenVersionHistory?: (template: TemplateRecord) => void;
  isQuickPrintEnabled?: boolean;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  viewMode,
  onUseTemplate,
  onEditMasterTemplate,
  onDuplicate,
  onToggleFavorite,
  onExport,
  onDelete,
  onInspect,
  onOpenVersionHistory,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'shipping':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/50';
      case 'retail':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50';
      case 'inventory':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/50';
      case 'industrial':
        return 'bg-orange-950/80 text-orange-300 border-orange-700/50';
      case 'compliance':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/50';
      case 'identification':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/50';
      case 'packaging':
        return 'bg-teal-950/80 text-teal-300 border-teal-700/50';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getSymbologyBadge = () => {
    if (template.primarySymbology) {
      return (
        <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-300 border border-zinc-700 text-[10px] font-mono">
          <Barcode className="w-3 h-3 text-cyan-400" />
          <span>{template.primarySymbology.toUpperCase()}</span>
        </span>
      );
    }
    if (template.supportsQr) {
      return (
        <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-900/90 text-zinc-300 border border-zinc-700 text-[10px] font-mono">
          <QrCode className="w-3 h-3 text-purple-400" />
          <span>2D MATRIX</span>
        </span>
      );
    }
    return null;
  };

  if (viewMode === 'list') {
    return (
      <div
        className="group relative flex items-center justify-between p-3 bg-[#1e2129] hover:bg-[#252a35] border border-[#2d323f] hover:border-blue-500/50 rounded-lg transition-all shadow-sm"
        onMouseLeave={() => setShowMenu(false)}
      >
        {/* Left: Thumbnail & Main Info */}
        <div className="flex items-center space-x-4 flex-1 min-w-0 pr-4">
          {/* Miniature Thumbnail */}
          <div
            onClick={() => onInspect(template)}
            className="w-20 h-14 flex-shrink-0 cursor-pointer rounded overflow-hidden border border-[#343a4a] group-hover:border-blue-400 transition-colors"
          >
            <TemplatePreviewCanvas
              document={template.document}
              sampleData={template.sampleData}
              className="w-full h-full p-1 bg-black/40"
            />
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <span
                onClick={() => onInspect(template)}
                className="font-semibold text-white text-sm hover:text-blue-400 cursor-pointer truncate"
              >
                {template.name}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${getCategoryBadgeColor(
                  template.category
                )}`}
              >
                {template.category}
              </span>
              {template.type === 'builtin' && (
                <span className="px-1.5 py-0.2 rounded bg-blue-950 text-blue-400 border border-blue-800/60 text-[9px] font-semibold">
                  STANDARD
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenVersionHistory?.(template);
                }}
                className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-blue-950 text-zinc-300 hover:text-blue-300 hover:border-blue-700/60 border border-zinc-700 text-[10px] font-mono flex items-center space-x-1 transition-colors"
                title="View Version History & Snapshots"
              >
                <History className="w-2.5 h-2.5 text-blue-400" />
                <span>v{template.version || 1}</span>
              </button>
            </div>

            <p className="text-gray-400 text-xs truncate mt-0.5">{template.description || 'Enterprise LabelForge design'}</p>

            <div className="flex items-center space-x-3 mt-1 text-[11px] text-gray-500 font-mono">
              <span>
                {template.width} × {template.height} {template.unit} ({template.orientation})
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Layers className="w-3 h-3 text-gray-400" />
                <span>{template.elementCount} objects</span>
              </span>
              {template.variables && template.variables.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-blue-400 font-medium">
                    {template.variables.length} dynamic variables
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {getSymbologyBadge()}

          <button
            onClick={() => onToggleFavorite(template.id)}
            title={template.favorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`p-1.5 rounded hover:bg-[#2f3545] transition-colors ${
              template.favorite ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Star className={`w-4 h-4 ${template.favorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => onInspect(template)}
            title="Inspect Template Details & Variables"
            className="p-1.5 rounded hover:bg-[#2f3545] text-gray-400 hover:text-white transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={() => onUseTemplate(template)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Use Template</span>
          </button>

          {/* More actions dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded hover:bg-[#2f3545] text-gray-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#181a22] border border-[#323644] rounded-lg shadow-xl py-1 z-30 text-xs text-gray-200 animate-in fade-in zoom-in-95">
                {onEditMasterTemplate && !template.isReadOnly && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEditMasterTemplate(template);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[#262a36] text-left text-blue-300"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Master Template</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDuplicate(template);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[#262a36] text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Duplicate Template</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onExport(template);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[#262a36] text-left"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export (.lforge)</span>
                </button>
                {!template.isReadOnly && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(template);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-red-950/60 text-left text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Template</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid Card View (Default)
  return (
    <div
      className="group relative flex flex-col bg-[#1e2129] hover:bg-[#242934] border border-[#2e3442] hover:border-blue-500/60 rounded-xl overflow-hidden transition-all duration-200 shadow-md hover:shadow-xl"
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Top Banner Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#191b22] border-b border-[#2d323e]">
        <div className="flex items-center space-x-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide ${getCategoryBadgeColor(
              template.category
            )}`}
          >
            {template.category}
          </span>
          {template.isReadOnly && (
            <span
              title="Protected standard template"
              className="p-0.5 text-gray-500"
            >
              <Lock className="w-3 h-3 text-blue-400/80" />
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onToggleFavorite(template.id)}
            title={template.favorite ? 'Remove from favorites' : 'Add to favorites'}
            className={`p-1 rounded hover:bg-[#2e3444] transition-colors ${
              template.favorite ? 'text-amber-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Star className={`w-4 h-4 ${template.favorite ? 'fill-amber-400' : ''}`} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-[#2e3444] text-gray-400 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#181a22] border border-[#323644] rounded-lg shadow-2xl py-1 z-30 text-xs text-gray-200 animate-in fade-in zoom-in-95">
                {onOpenVersionHistory && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenVersionHistory(template);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[#262a36] text-left text-blue-300"
                  >
                    <History className="w-3.5 h-3.5 text-blue-400" />
                    <span>Version History (v{template.version || 1})</span>
                  </button>
                )}
                {onEditMasterTemplate && !template.isReadOnly && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEditMasterTemplate(template);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[#262a36] text-left text-blue-300"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Master Template</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDuplicate(template);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[#262a36] text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Duplicate Template</span>
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onExport(template);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-[#262a36] text-left"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Export (.lforge)</span>
                </button>
                {!template.isReadOnly && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(template);
                    }}
                    className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-red-950/60 text-left text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Template</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vector Preview Thumbnail Container */}
      <div
        onClick={() => onInspect(template)}
        className="relative h-44 w-full p-2 bg-[#12141a] cursor-pointer group-hover:bg-[#15171e] transition-colors flex items-center justify-center overflow-hidden border-b border-[#2d323e]"
      >
        <TemplatePreviewCanvas
          document={template.document}
          sampleData={template.sampleData}
          className="w-full h-full max-h-40"
        />

        {/* Hover Quick Action Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUseTemplate(template);
            }}
            className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg flex items-center space-x-1.5 transition-transform transform hover:scale-105"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Use Template</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInspect(template);
            }}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-gray-200 text-xs shadow border border-zinc-600"
            title="Inspect Details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Info Details */}
      <div className="p-3 flex flex-col justify-between flex-1">
        <div>
          <h3
            onClick={() => onInspect(template)}
            className="font-bold text-white text-sm hover:text-blue-400 cursor-pointer line-clamp-1"
            title={template.name}
          >
            {template.name}
          </h3>
          <p className="text-gray-400 text-xs line-clamp-2 mt-1 min-h-[32px]">
            {template.description || 'Enterprise LabelForge label design specification.'}
          </p>
        </div>

        {/* Dimensions and Metadata Badges */}
        <div className="mt-3 pt-2 border-t border-[#2e3342] flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center space-x-1.5 font-mono text-gray-300">
            <span>
              {template.width} × {template.height} {template.unit}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenVersionHistory?.(template);
              }}
              className="px-1.5 py-0.2 rounded bg-[#161820] hover:bg-blue-950 text-gray-400 hover:text-blue-300 border border-[#2b303c] hover:border-blue-700/60 text-[10px] flex items-center space-x-1 transition-colors"
              title="View Version History"
            >
              <History className="w-2.5 h-2.5 text-blue-400" />
              <span>v{template.version || 1}</span>
            </button>
          </div>

          <div className="flex items-center space-x-1">
            {getSymbologyBadge()}
            {template.variables && template.variables.length > 0 && (
              <span
                className="px-1.5 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800/40 text-[10px]"
                title={`${template.variables.length} Dynamic Variables`}
              >
                {template.variables.length}v
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
