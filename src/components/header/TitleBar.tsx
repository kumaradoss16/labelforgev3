import React from 'react';
import {
  Save,
  Undo2,
  Redo2,
  Printer,
  Eye,
  Scissors,
  Copy,
  Clipboard,
  Server,
  Database,
  Layers,
  Sparkles,
  FileBox,
  FolderOpen,
  Monitor,
  History,
  FolderPlus,
  LayoutGrid,
  PenTool,
  Bookmark
} from 'lucide-react';
import { isDesktopApp } from '../../services/desktopBridge';
import { LabelForgeLogo } from '../common/LabelForgeLogo';

interface TitleBarProps {
  documentName: string;
  isModified: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenPrint: () => void;
  onOpenPrintPreview?: () => void;
  onOpenDataSources?: () => void;
  onOpenFontManager?: () => void;
  onOpenTemplateManager?: () => void;
  onOpenBarTenderManager?: () => void;
  onOpenPrintHistory?: () => void;
  onOpen?: () => void;
  onPrint?: () => void;
  onOpenAbout?: () => void;
  currentUserRole?: string;
  currentView?: 'editor' | 'templates';
  onToggleView?: (view: 'editor' | 'templates') => void;
  onOpenSaveAsTemplate?: () => void;
  isMasterTemplateMode?: boolean;
  masterTemplateName?: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  documentName,
  isModified,
  onSave,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenPrint,
  onOpenPrintPreview,
  onOpenDataSources,
  onOpenFontManager,
  onOpenTemplateManager,
  onOpenBarTenderManager,
  onOpenPrintHistory,
  onOpen,
  onPrint,
  onOpenAbout,
  currentUserRole = 'PRINT_MANAGER',
  currentView = 'editor',
  onToggleView,
  onOpenSaveAsTemplate,
  isMasterTemplateMode = false,
  masterTemplateName,
}) => {
  const handlePrint = onOpenPrint || onPrint || (() => {});

  return (
    <header className="h-9 bg-[#1e2026] text-[#c5c8ce] border-b border-[#2d3139] flex items-center justify-between px-2 select-none text-xs">
      {/* Left: Brand + Navigation Switcher + Quick Access Toolbar */}
      <div className="flex items-center space-x-1.5">
        {/* LabelForge Logo */}
        <button
          onClick={onOpenAbout}
          title="About LabelForge Studio (Brand Identity & System Info)"
          className="flex items-center space-x-1.5 pr-2 border-r border-[#323640] hover:opacity-90 transition-opacity cursor-pointer group"
        >
          <LabelForgeLogo size={22} variant="full" className="rounded shadow-sm group-hover:scale-105 transition-transform" />
          <span className="font-semibold text-white tracking-wide text-[12px]">
            LabelForge<span className="text-[#60a5fa] font-normal text-[11px] ml-1">Studio</span>
          </span>
        </button>

        {/* Top-Level Mode Switcher (Editor Canvas <-> Template Center) */}
        {onToggleView && (
          <div className="flex items-center bg-[#15171e] p-0.5 rounded border border-[#2e3340] mx-1">
            <button
              onClick={() => onToggleView('editor')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentView === 'editor'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Designer Canvas Workspace"
            >
              <PenTool className="w-3 h-3" />
              <span>Canvas</span>
            </button>
            <button
              onClick={() => onToggleView('templates')}
              className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                currentView === 'templates'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="Browse & Manage Templates Library"
            >
              <FileBox className="w-3 h-3" />
              <span>Templates</span>
            </button>
          </div>
        )}

        {/* Quick Access Toolbar Icons */}
        <div className="flex items-center space-x-0.5 pl-1">
          {onOpen && (
            <button
              onClick={onOpen}
              title="Open Template (.lforge) (Ctrl+O)"
              className="p-1 rounded hover:bg-[#2e333d] text-[#a0a5b1] hover:text-white transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
          <button
            onClick={onSave}
            title="Save Template (.lforge) (Ctrl+S)"
            className="p-1 rounded hover:bg-[#2e333d] text-[#a0a5b1] hover:text-white transition-colors"
          >
            <Save className="w-3.5 h-3.5 text-blue-400" />
          </button>

          {onOpenSaveAsTemplate && (
            <button
              onClick={onOpenSaveAsTemplate}
              title="Save As Template (Ctrl+Shift+S)"
              className="p-1 rounded hover:bg-[#2e333d] text-[#a0a5b1] hover:text-white transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          )}

          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1 rounded transition-colors ${canUndo ? 'hover:bg-[#2e333d] text-[#a0a5b1] hover:text-white' : 'opacity-30 cursor-not-allowed text-gray-500'}`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={`p-1 rounded transition-colors ${canRedo ? 'hover:bg-[#2e333d] text-[#a0a5b1] hover:text-white' : 'opacity-30 cursor-not-allowed text-gray-500'}`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-3.5 w-px bg-[#323640] mx-1" />

          <button
            onClick={handlePrint}
            title="Print to Thermal / Spooler (Ctrl+P)"
            className="p-1 rounded hover:bg-[#2e333d] text-[#a0a5b1] hover:text-white transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {onOpenPrintHistory && (
            <button
              onClick={onOpenPrintHistory}
              title="Batch Print Job History & Direct Re-Print"
              className="p-1 rounded hover:bg-[#2e333d] text-[#a0a5b1] hover:text-blue-300 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
            </button>
          )}

          {onOpenBarTenderManager && (
            <button
              onClick={onOpenBarTenderManager}
              title="BarTender® Integration & Printer Fleet Manager"
              className="px-1.5 py-0.5 rounded bg-blue-900/40 hover:bg-blue-800/60 border border-blue-600/40 text-blue-300 font-mono text-[10px] flex items-center space-x-1 transition-colors"
            >
              <Server className="w-3 h-3 text-blue-400" />
              <span className="font-semibold">BarTender® Fleet</span>
            </button>
          )}

          {onOpenPrintPreview && (
            <button
              onClick={onOpenPrintPreview}
              title="Print Preview & Verification"
              className="p-1 rounded hover:bg-[#2e333d] text-[#a0a5b1] hover:text-white transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
          {onOpenDataSources && (
            <button
              onClick={onOpenDataSources}
              title="Database Sources & Dynamic Feeds"
              className="p-1 rounded hover:bg-[#2e333d] text-[#a0a5b1] hover:text-white transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}
          {onOpenFontManager && (
            <button
              onClick={onOpenFontManager}
              title="Multilingual Font Manager & Unicode Inspector"
              className="p-1 rounded hover:bg-[#2e333d] text-[#a0a5b1] hover:text-white transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </button>
          )}
        </div>
      </div>

      {/* Center: Document Title & Master Template Status */}
      <div className="flex items-center space-x-2 text-[11px]">
        {isMasterTemplateMode ? (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-600/70 text-purple-200 text-[10px] font-semibold animate-pulse">
            <Bookmark className="w-3 h-3 text-purple-400" />
            <span>Master Template Mode: {masterTemplateName || documentName}</span>
          </span>
        ) : (
          <>
            <span className="text-gray-400">Design:</span>
            <span className="font-semibold text-white">
              {documentName}
              {isModified && <span className="text-amber-400 font-bold ml-0.5">*</span>}
            </span>
          </>
        )}

        <span className="text-gray-500 text-[10px]">|</span>
        <span className="text-gray-400">Role: <strong className="text-blue-300 font-mono">{currentUserRole}</strong></span>
        <span className="text-gray-500 text-[10px]">|</span>
        <span className="text-gray-400">Site: <strong className="text-gray-200">Global HQ (DC-01)</strong></span>
        <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>BarTender Online</span>
        </span>
        {isDesktopApp() ? (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-950/70 border border-blue-600/60 text-blue-300 text-[10px] font-mono">
            <Monitor className="w-3 h-3 text-blue-400" />
            <span>ELECTRON DESKTOP v3.0</span>
          </span>
        ) : (
          <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-zinc-400 text-[10px] font-mono">
            <span>WEB ENVIRONMENT</span>
          </span>
        )}
      </div>
    </header>
  );
};
