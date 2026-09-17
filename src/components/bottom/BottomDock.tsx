import React, { useState } from 'react';
import {
  Layers,
  AlertTriangle,
  Database,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Info,
  ExternalLink
} from 'lucide-react';
import { LabelObject, PreflightDiagnostic } from '../../types/label';
import { DataSourceDefinition } from '../../types/database';

interface BottomDockProps {
  objects: LabelObject[];
  selectedObjectId: string | null;
  selectedObjectIds?: string[];
  onSelectObject: (id: string | null) => void;
  onSelectObjects?: (ids: string[]) => void;
  onUpdateObject: (id: string, updated: Partial<LabelObject>) => void;
  onDeleteObject: (id: string) => void;
  diagnostics: PreflightDiagnostic[];
  dataSource?: DataSourceDefinition;
  activeRecordIndex: number;
  onSelectRecordIndex: (index: number) => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  objects,
  selectedObjectId,
  selectedObjectIds = [],
  onSelectObject,
  onSelectObjects,
  onUpdateObject,
  onDeleteObject,
  diagnostics,
  dataSource,
  activeRecordIndex,
  onSelectRecordIndex,
}) => {
  const effectiveSelectedIds = selectedObjectIds.length > 0 ? selectedObjectIds : (selectedObjectId ? [selectedObjectId] : []);
  const [activeTab, setActiveTab] = useState<'layers' | 'preflight' | 'data'>('layers');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const errorsCount = diagnostics.filter(d => d.severity === 'error' || d.severity === 'blocker').length;
  const warningsCount = diagnostics.filter(d => d.severity === 'warning').length;

  return (
    <div className="bg-[#1c1f26] border-t border-[#2d313d] text-[#c5c8ce] select-none text-xs flex flex-col transition-all duration-150">
      {/* Bottom Tabs Header */}
      <div className="h-7 bg-[#21242d] px-2 flex items-center justify-between border-b border-[#2d313d]">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => { setActiveTab('layers'); setIsCollapsed(false); }}
            className={`px-3 py-1 font-medium flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'layers' && !isCollapsed
                ? 'text-white border-blue-500 bg-[#292d38]'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#252833]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Document Layers ({objects.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('preflight'); setIsCollapsed(false); }}
            className={`px-3 py-1 font-medium flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'preflight' && !isCollapsed
                ? 'text-white border-amber-500 bg-[#292d38]'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#252833]'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${errorsCount > 0 ? 'text-red-400 animate-pulse' : warningsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span>Preflight Diagnostics</span>
            {errorsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-bold">
                {errorsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('data'); setIsCollapsed(false); }}
            className={`px-3 py-1 font-medium flex items-center space-x-1.5 border-b-2 transition-colors ${
              activeTab === 'data' && !isCollapsed
                ? 'text-white border-cyan-500 bg-[#292d38]'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#252833]'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Data Table ({dataSource?.records.length || 0} Records)</span>
          </button>
        </div>

        {/* Minimize / Maximize toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-[#2e323e] text-gray-400 hover:text-white"
          title={isCollapsed ? 'Expand Dock' : 'Collapse Dock'}
        >
          {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Dock Content Body */}
      {!isCollapsed && (
        <div className="h-36 overflow-auto p-2 bg-[#171920]">
          {/* ===================== LAYERS TAB ===================== */}
          {activeTab === 'layers' && (
            <div className="space-y-1">
              {objects.length === 0 ? (
                <div className="text-gray-500 italic p-2 text-center">No objects on label. Insert a text or barcode element.</div>
              ) : (
                objects
                  .slice()
                  .reverse()
                  .map((obj) => {
                    const isSelected = effectiveSelectedIds.includes(obj.id);
                    return (
                      <div
                        key={obj.id}
                        onClick={(e) => {
                          if (e.shiftKey || e.ctrlKey || e.metaKey) {
                            const next = isSelected
                              ? effectiveSelectedIds.filter(id => id !== obj.id)
                              : [...effectiveSelectedIds, obj.id];
                            onSelectObjects?.(next);
                            if (next.length === 0) onSelectObject(null);
                            else if (!isSelected) onSelectObject(obj.id);
                          } else {
                            onSelectObject(obj.id);
                            onSelectObjects?.([obj.id]);
                          }
                        }}
                        className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-600/30 border border-blue-500/50 text-white' : 'hover:bg-[#222631] text-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] text-gray-500">z:{obj.zIndex}</span>
                          <span className="font-semibold text-xs">{obj.name}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-mono">[{obj.type}]</span>
                          <span className="text-[10px] text-gray-500">({obj.width.toFixed(1)}×{obj.height.toFixed(1)} mm)</span>
                        </div>

                        <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onUpdateObject(obj.id, { visible: !obj.visible })}
                            className="p-1 text-gray-400 hover:text-white"
                          >
                            {obj.visible ? <Eye className="w-3.5 h-3.5 text-gray-400" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
                          </button>
                          <button
                            onClick={() => onUpdateObject(obj.id, { locked: !obj.locked })}
                            className="p-1 text-gray-400 hover:text-white"
                          >
                            {obj.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                          <button
                            onClick={() => onDeleteObject(obj.id)}
                            className="p-1 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* ===================== PREFLIGHT TAB ===================== */}
          {activeTab === 'preflight' && (
            <div className="space-y-1.5">
              {diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  onClick={() => diag.objectId && onSelectObject(diag.objectId)}
                  className={`flex items-start justify-between p-2 rounded border cursor-pointer ${
                    diag.severity === 'blocker' || diag.severity === 'error'
                      ? 'bg-red-950/40 border-red-800/60 text-red-200'
                      : diag.severity === 'warning'
                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                      : 'bg-blue-950/30 border-blue-800/40 text-blue-200'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {diag.severity === 'blocker' || diag.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    ) : diag.severity === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-xs flex items-center space-x-2">
                        <span>{diag.message}</span>
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-black/40 font-mono">
                          {diag.category}
                        </span>
                      </div>
                      {diag.suggestion && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          Remedy: {diag.suggestion}
                        </div>
                      )}
                    </div>
                  </div>

                  {diag.objectId && (
                    <span className="text-[10px] text-blue-400 hover:underline shrink-0">
                      Select Object
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ===================== DATA TABLE TAB ===================== */}
          {activeTab === 'data' && (
            <div className="overflow-x-auto">
              {!dataSource || dataSource.records.length === 0 ? (
                <div className="text-gray-500 italic p-2 text-center">No database connected.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#2e3341] bg-[#1f222c] text-gray-400">
                      <th className="p-1.5 font-semibold">Row</th>
                      {dataSource.fields.map(f => (
                        <th key={f.name} className="p-1.5 font-semibold font-mono text-[11px] text-cyan-300">
                          {f.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataSource.records.map((rec, idx) => {
                      const isActive = idx === activeRecordIndex;
                      return (
                        <tr
                          key={idx}
                          onClick={() => onSelectRecordIndex(idx)}
                          className={`border-b border-[#252834] cursor-pointer transition-colors ${
                            isActive ? 'bg-cyan-950/60 font-semibold text-white' : 'hover:bg-[#222530] text-gray-300'
                          }`}
                        >
                          <td className="p-1.5 font-mono text-[11px] text-gray-500">
                            {isActive ? '▶ ' + (idx + 1) : idx + 1}
                          </td>
                          {dataSource.fields.map(f => (
                            <td key={f.name} className="p-1.5 font-mono text-[11px] max-w-xs truncate">
                              {rec[f.name] || ''}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
