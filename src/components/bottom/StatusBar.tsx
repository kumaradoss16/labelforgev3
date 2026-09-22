import React from 'react';
import {
  Printer,
  Grid,
  Magnet,
  Maximize2,
  CheckCircle,
  Wifi,
  ZoomIn,
  ZoomOut,
  History,
  AlignCenter
} from 'lucide-react';
import { LabelDimensions } from '../../types/label';
import { PrinterProfile } from '../../types/printer';

interface StatusBarProps {
  dimensions: LabelDimensions;
  zoom: number;
  setZoom: (val: number | ((prev: number) => number)) => void;
  cursorX: number;
  cursorY: number;
  activePrinter: PrinterProfile;
  snapToGrid: boolean;
  setSnapToGrid: (v: boolean) => void;
  smartSnapping?: boolean;
  setSmartSnapping?: (v: boolean) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  selectedObjectName?: string;
  isModified: boolean;
  onOpenPrintHistory?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  dimensions,
  zoom,
  setZoom,
  cursorX,
  cursorY,
  activePrinter,
  snapToGrid,
  setSnapToGrid,
  smartSnapping = true,
  setSmartSnapping,
  showGrid,
  setShowGrid,
  selectedObjectName,
  isModified,
  onOpenPrintHistory,
}) => {
  const widthIn = (dimensions.width / 25.4).toFixed(2);
  const heightIn = (dimensions.height / 25.4).toFixed(2);

  return (
    <footer className="h-6 bg-[#16181f] border-t border-[#2a2e38] text-[#8e94a0] select-none text-[11px] px-2 flex items-center justify-between font-sans">
      {/* Left items: Physical dimensions, cursor position, selection */}
      <div className="flex items-center space-x-3">
        {/* Label Size */}
        <span className="flex items-center space-x-1">
          <span className="text-gray-500">Label:</span>
          <strong className="text-gray-300 font-mono">
            {dimensions.width.toFixed(1)} × {dimensions.height.toFixed(1)} mm
          </strong>
          <span className="text-gray-500 font-mono text-[10px]">({widthIn}" × {heightIn}")</span>
        </span>

        <span className="text-gray-600">|</span>

        {/* Cursor Coordinates */}
        <span className="flex items-center space-x-1 font-mono">
          <span className="text-gray-500">Cursor:</span>
          <span className="text-gray-300">X: {cursorX.toFixed(1)}</span>
          <span className="text-gray-300">Y: {cursorY.toFixed(1)} mm</span>
        </span>

        {selectedObjectName && (
          <>
            <span className="text-gray-600">|</span>
            <span className="flex items-center space-x-1">
              <span className="text-gray-500">Selection:</span>
              <span className="text-blue-400 font-semibold">{selectedObjectName}</span>
            </span>
          </>
        )}
      </div>

      {/* Right items: Printer, DPI, Snap, Grid, Document State, Zoom */}
      <div className="flex items-center space-x-3">
        {/* Active Printer with Quick History Trigger */}
        <button
          onClick={onOpenPrintHistory}
          className="flex items-center space-x-1.5 hover:bg-[#252834] px-1.5 py-0.5 rounded transition-colors group cursor-pointer"
          title="Click to view Batch Print History & Industrial Queue"
        >
          <Printer className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300" />
          <span className="text-gray-300 font-medium group-hover:text-white">{activePrinter.name}</span>
          <span className="px-1 py-0.2 rounded bg-[#252834] group-hover:bg-[#323646] font-mono text-[10px] text-gray-400 group-hover:text-gray-200">
            {activePrinter.dpi} DPI ({activePrinter.language})
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Printer Ready" />
        </button>

        <span className="text-gray-600">|</span>

        {/* Grid & Snap Toggles */}
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`flex items-center space-x-1 hover:text-white ${showGrid ? 'text-blue-400' : 'text-gray-500'}`}
          title="Toggle Canvas Grid"
        >
          <Grid className="w-3 h-3" />
          <span>Grid</span>
        </button>

        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`flex items-center space-x-1 hover:text-white ${snapToGrid ? 'text-amber-400' : 'text-gray-500'}`}
          title="Toggle Grid Snapping"
        >
          <Magnet className="w-3 h-3" />
          <span>Snap</span>
        </button>

        {setSmartSnapping && (
          <button
            id="status-bar-smart-snap-btn"
            onClick={() => setSmartSnapping(!smartSnapping)}
            className={`flex items-center space-x-1 hover:text-white ${smartSnapping ? 'text-fuchsia-400' : 'text-gray-500'}`}
            title="Toggle Intelligent Object Center Snapping (Smart Snap)"
          >
            <AlignCenter className="w-3 h-3" />
            <span>Smart Snap</span>
          </button>
        )}

        <span className="text-gray-600">|</span>

        {/* Document state */}
        <span className="flex items-center space-x-1 text-gray-400">
          <CheckCircle className={`w-3 h-3 ${isModified ? 'text-amber-400' : 'text-emerald-400'}`} />
          <span>{isModified ? 'Unsaved Changes' : 'Saved'}</span>
        </span>

        <span className="text-gray-600">|</span>

        {/* Connection */}
        <span className="flex items-center space-x-1 text-emerald-400">
          <Wifi className="w-3 h-3" />
          <span>Connected</span>
        </span>

        <span className="text-gray-600">|</span>

        {/* Zoom Slider */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
            className="hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <input
            type="range"
            min="50"
            max="300"
            value={Math.round(zoom * 100)}
            onChange={(e) => setZoom(Number(e.target.value) / 100)}
            className="w-16 h-1 bg-[#2b2e3a] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="font-mono text-gray-300 w-9 text-right font-medium">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
            className="hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>
    </footer>
  );
};
