import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Grid,
  Magnet,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  RotateCw,
  Compass,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { LabelDocument, LabelObject, TextLabelObject, BarcodeLabelObject, ShapeLabelObject, GuideLine } from '../../types/label';
import { DataRecord, SerializationCounter } from '../../types/database';
import { evaluateExpression } from '../../services/dataBinding';
import { render1DBarcodeSvg, renderQRCodeDataUrl, generateDataMatrixSvg, generatePostal4StateSvg } from '../../services/barcodeEngine';
import { Rulers } from './Rulers';

interface DesignerCanvasProps {
  document: LabelDocument;
  selectedObjectId: string | null;
  onSelectObject: (id: string | null) => void;
  onUpdateObject: (updated: Partial<LabelObject>) => void;
  showGrid: boolean;
  setShowGrid?: (v: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid?: (v: boolean) => void;
  zoom: number;
  setZoom: (val: number | ((prev: number) => number)) => void;
  showRulers: boolean;
  setShowRulers?: (v: boolean) => void;
  unit: 'mm' | 'in' | 'cm' | 'pt';
  onUnitChange?: (unit: 'mm' | 'in' | 'cm' | 'pt') => void;
  showGuides?: boolean;
  setShowGuides?: (v: boolean) => void;
  lockGuides?: boolean;
  setLockGuides?: (v: boolean) => void;
  snapToGuides?: boolean;
  setSnapToGuides?: (v: boolean) => void;
  guides?: GuideLine[];
  onAddGuide?: (guide: GuideLine) => void;
  onRemoveGuide?: (id: string) => void;
  onClearGuides?: () => void;
  activeRecord?: DataRecord;
  counter?: SerializationCounter;
  onCursorMove: (xMm: number, yMm: number) => void;
  onDeleteSelected: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  document: doc,
  selectedObjectId,
  onSelectObject,
  onUpdateObject,
  showGrid,
  setShowGrid,
  snapToGrid,
  setSnapToGrid,
  zoom,
  setZoom,
  showRulers,
  setShowRulers,
  unit = 'mm',
  onUnitChange,
  showGuides = true,
  setShowGuides,
  lockGuides = false,
  setLockGuides,
  snapToGuides = true,
  setSnapToGuides,
  guides = [],
  onAddGuide,
  onRemoveGuide,
  onClearGuides,
  activeRecord,
  counter,
  onCursorMove,
  onDeleteSelected,
  isMaximized = false,
  onToggleMaximize,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const substrateRef = useRef<HTMLDivElement>(null);

  // Viewport dimensions
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 700 });
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  const [showMargins, setShowMargins] = useState(true);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  // Rulers config
  const rulerThickness = 26;

  // Scale: 1 mm = ~3.7795 px at 96 DPI CSS scale
  const pxPerMm = 3.7795 * zoom;
  const labelWidthPx = doc.dimensions.width * pxPerMm;
  const labelHeightPx = doc.dimensions.height * pxPerMm;

  // Calculate centered or padded origin offset for the template substrate
  const availableCanvasW = Math.max(300, viewportSize.width - (showRulers ? rulerThickness : 0));
  const availableCanvasH = Math.max(300, viewportSize.height - (showRulers ? rulerThickness : 0));
  const originOffsetX = Math.max(64, Math.round((availableCanvasW - labelWidthPx) / 2));
  const originOffsetY = Math.max(64, Math.round((availableCanvasH - labelHeightPx) / 2));

  // Spacious pasteboard dimensions
  const pasteboardWidth = Math.max(availableCanvasW * 1.5, originOffsetX * 2 + labelWidthPx + 1000);
  const pasteboardHeight = Math.max(availableCanvasH * 1.5, originOffsetY * 2 + labelHeightPx + 1000);

  // Dragging & Resizing state
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; objX: number; objY: number; objW: number; objH: number } | null>(null);

  // Cached QR code data URLs
  const [qrCache, setQrCache] = useState<Record<string, string>>({});
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const selectedObj = doc.objects.find(o => o.id === selectedObjectId);

  // Measure viewport size via ResizeObserver
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Update scroll coordinates synchronously
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollPos({
      left: e.currentTarget.scrollLeft,
      top: e.currentTarget.scrollTop,
    });
  };

  // Generate QR code data URLs asynchronously when QR objects or values change
  useEffect(() => {
    let isMounted = true;
    doc.objects.forEach(async (obj) => {
      if (obj.type === 'qrcode') {
        const bObj = obj as BarcodeLabelObject;
        const evaluated = evaluateExpression(bObj.value, activeRecord, counter);
        const cacheKey = `${bObj.id}-${evaluated}-${bObj.barcodeStyle.errorCorrectionLevel || 'M'}-${bObj.barcodeStyle.color || '#000000'}-${bObj.barcodeStyle.backgroundColor || 'transparent'}`;
        if (!qrCache[cacheKey]) {
          const url = await renderQRCodeDataUrl(
            evaluated,
            bObj.barcodeStyle.errorCorrectionLevel || 'M',
            bObj.barcodeStyle.color || '#000000',
            bObj.barcodeStyle.backgroundColor || 'transparent'
          );
          if (isMounted) {
            setQrCache(prev => ({ ...prev, [cacheKey]: url }));
          }
        }
      }
    });
    return () => { isMounted = false; };
  }, [doc.objects, activeRecord, counter, qrCache]);

  // Snap coordinate helper (Grid + Guides)
  const snap = useCallback((val: number, isVertical = false, step = 1): number => {
    let result = snapToGrid ? Math.round(val / step) * step : val;

    // Snap to guides if enabled
    if (snapToGuides && guides.length > 0) {
      const relevant = guides.filter(g => isVertical ? g.type === 'v' : g.type === 'h');
      for (const guide of relevant) {
        if (Math.abs(result - guide.position) < 1.5) {
          result = guide.position;
          break;
        }
      }
    }

    return Number(result.toFixed(2));
  }, [snapToGrid, snapToGuides, guides]);

  // Track mouse movements relative to label origin (0, 0 in mm)
  const handleMouseMove = (e: React.MouseEvent) => {
    const substrate = substrateRef.current;
    if (!substrate) return;

    const rect = substrate.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const mmX = Number((relX / pxPerMm).toFixed(1));
    const mmY = Number((relY / pxPerMm).toFixed(1));

    setCursorMm({ x: mmX, y: mmY });
    onCursorMove(mmX, mmY);

    // Handle Dragging / Resizing
    if (isDragging && dragStart && selectedObj && !selectedObj.locked) {
      const deltaMmX = (e.clientX - dragStart.x) / pxPerMm;
      const deltaMmY = (e.clientY - dragStart.y) / pxPerMm;

      if (dragHandle === 'move') {
        const newX = snap(Math.max(0, dragStart.objX + deltaMmX), true);
        const newY = snap(Math.max(0, dragStart.objY + deltaMmY), false);
        onUpdateObject({ x: newX, y: newY });
      } else if (dragHandle === 'se') {
        const newW = snap(Math.max(5, dragStart.objW + deltaMmX), true);
        const newH = snap(Math.max(5, dragStart.objH + deltaMmY), false);
        onUpdateObject({ width: newW, height: newH });
      } else if (dragHandle === 'e') {
        const newW = snap(Math.max(5, dragStart.objW + deltaMmX), true);
        onUpdateObject({ width: newW });
      } else if (dragHandle === 's') {
        const newH = snap(Math.max(5, dragStart.objH + deltaMmY), false);
        onUpdateObject({ height: newH });
      } else if (dragHandle === 'nw') {
        const newW = snap(Math.max(5, dragStart.objW - deltaMmX), true);
        const newH = snap(Math.max(5, dragStart.objH - deltaMmY), false);
        const newX = snap(dragStart.objX + (dragStart.objW - newW), true);
        const newY = snap(dragStart.objY + (dragStart.objH - newH), false);
        onUpdateObject({ x: newX, y: newY, width: newW, height: newH });
      } else if (dragHandle === 'ne') {
        const newW = snap(Math.max(5, dragStart.objW + deltaMmX), true);
        const newH = snap(Math.max(5, dragStart.objH - deltaMmY), false);
        const newY = snap(dragStart.objY + (dragStart.objH - newH), false);
        onUpdateObject({ y: newY, width: newW, height: newH });
      } else if (dragHandle === 'sw') {
        const newW = snap(Math.max(5, dragStart.objW - deltaMmX), true);
        const newH = snap(Math.max(5, dragStart.objH + deltaMmY), false);
        const newX = snap(dragStart.objX + (dragStart.objW - newW), true);
        onUpdateObject({ x: newX, width: newW, height: newH });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragHandle(null);
    setDragStart(null);
  };

  // Keyboard navigation & deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedGuideId && onRemoveGuide) {
          e.preventDefault();
          onRemoveGuide(selectedGuideId);
          setSelectedGuideId(null);
          return;
        }

        if (selectedObj && !selectedObj.locked) {
          e.preventDefault();
          onDeleteSelected();
          return;
        }
      }

      if (!selectedObj || selectedObj.locked) return;

      const step = e.shiftKey ? 5 : 1;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdateObject({ x: Math.max(0, selectedObj.x - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdateObject({ x: selectedObj.x + step });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdateObject({ y: Math.max(0, selectedObj.y - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdateObject({ y: selectedObj.y + step });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObj, selectedGuideId, onUpdateObject, onDeleteSelected, onRemoveGuide]);

  // Sizing Helpers: "Large the editor section to cover the working templates"
  const handleFitTemplate = () => {
    const availW = Math.max(200, viewportSize.width - (showRulers ? rulerThickness : 0) - 80);
    const availH = Math.max(200, viewportSize.height - (showRulers ? rulerThickness : 0) - 80);
    const templateMmW = doc.dimensions.width * 3.7795;
    const templateMmH = doc.dimensions.height * 3.7795;
    const idealZoom = Math.min(availW / templateMmW, availH / templateMmH);
    setZoom(Math.max(0.4, Math.min(3.0, Number(idealZoom.toFixed(2)))));

    // Center scroll position
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: 0,
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handleFitWidth = () => {
    const availW = Math.max(200, viewportSize.width - (showRulers ? rulerThickness : 0) - 60);
    const templateMmW = doc.dimensions.width * 3.7795;
    const idealZoom = availW / templateMmW;
    setZoom(Math.max(0.4, Math.min(3.0, Number(idealZoom.toFixed(2)))));
  };

  const handleFitHeight = () => {
    const availH = Math.max(200, viewportSize.height - (showRulers ? rulerThickness : 0) - 60);
    const templateMmH = doc.dimensions.height * 3.7795;
    const idealZoom = availH / templateMmH;
    setZoom(Math.max(0.4, Math.min(3.0, Number(idealZoom.toFixed(2)))));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#13151b] relative overflow-hidden select-none">
      {/* ==================================================================== */}
      {/* 1. TOP EDITOR CONTROL BAR (Ruler Options, Fit Template, Zoom, Guides) */}
      {/* ==================================================================== */}
      <div className="h-8 bg-[#1a1c24] border-b border-[#2b2f3b] px-3 flex items-center justify-between z-30 shrink-0 text-xs text-gray-300">
        {/* Left: Template Size & Scale Fit actions */}
        <div className="flex items-center space-x-2">
          {/* Label Dimensions Pill */}
          <div className="bg-[#242834] px-2 py-0.5 rounded border border-[#353b4c] text-[11px] font-mono text-gray-300 flex items-center space-x-1.5 shadow-sm">
            <span className="text-gray-400">Template:</span>
            <span className="font-bold text-blue-400">
              {doc.dimensions.width}×{doc.dimensions.height} mm
            </span>
            <span className="text-[10px] text-gray-400">
              ({(doc.dimensions.width / 25.4).toFixed(2)}"×{(doc.dimensions.height / 25.4).toFixed(2)}")
            </span>
          </div>

          {/* Fit to Working Template Button (Enlarges template to fill entire editor) */}
          <button
            onClick={handleFitTemplate}
            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded text-[11px] font-medium flex items-center space-x-1 transition-colors shadow-sm"
            title="Auto-scale working template to fit the editor section"
          >
            <Maximize2 className="w-3 h-3 text-blue-400" />
            <span>Fit Template</span>
          </button>

          {/* Fit Width */}
          <button
            onClick={handleFitWidth}
            className="px-2 py-0.5 hover:bg-[#282c38] text-gray-400 hover:text-gray-200 rounded text-[11px] transition-colors"
            title="Scale template to fit viewport width"
          >
            Fit Width
          </button>

          {/* Fit Height */}
          <button
            onClick={handleFitHeight}
            className="px-2 py-0.5 hover:bg-[#282c38] text-gray-400 hover:text-gray-200 rounded text-[11px] transition-colors"
            title="Scale template to fit viewport height"
          >
            Fit Height
          </button>

          {/* 100% 1:1 Scale */}
          <button
            onClick={() => setZoom(1.0)}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${zoom === 1.0 ? 'bg-[#2b303e] text-white font-semibold' : 'hover:bg-[#282c38] text-gray-400 hover:text-gray-200'}`}
            title="1:1 Actual physical scale"
          >
            100%
          </button>
        </div>

        {/* Center: Ruler Options & Units */}
        <div className="flex items-center space-x-2">
          {/* Ruler Toggle */}
          <button
            onClick={() => setShowRulers?.(!showRulers)}
            className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 border transition-colors ${
              showRulers
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'bg-[#222530] border-[#313644] text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle Physical Rulers (Ctrl+R)"
          >
            <Compass className="w-3 h-3 text-blue-400" />
            <span>Rulers</span>
          </button>

          {/* Unit Selector Pills */}
          <div className="flex items-center bg-[#222530] border border-[#313644] rounded p-0.5 space-x-0.5">
            {(['mm', 'in', 'cm', 'pt'] as const).map((u) => (
              <button
                key={u}
                onClick={() => onUnitChange?.(u)}
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
                  unit === u
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2e3d]'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <span className="text-gray-600">|</span>

          {/* Guides Toggle */}
          <button
            onClick={() => setShowGuides?.(!showGuides)}
            className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 border transition-colors ${
              showGuides
                ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                : 'bg-[#222530] border-[#313644] text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle Guide Lines"
          >
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>Guides {guides.length > 0 && `(${guides.length})`}</span>
          </button>

          {/* Lock Guides */}
          {guides.length > 0 && (
            <button
              onClick={() => setLockGuides?.(!lockGuides)}
              className={`p-1 rounded text-gray-400 hover:text-gray-200 ${lockGuides ? 'text-amber-400 bg-amber-500/10' : 'hover:bg-[#282c38]'}`}
              title={lockGuides ? 'Guides Locked' : 'Guides Unlocked'}
            >
              {lockGuides ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
          )}

          {/* Clear Guides */}
          {guides.length > 0 && (
            <button
              onClick={onClearGuides}
              className="p-1 rounded text-gray-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="Clear all guide lines"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          <span className="text-gray-600">|</span>

          {/* Snap to Grid / Guides */}
          <button
            onClick={() => setSnapToGrid?.(!snapToGrid)}
            className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 border transition-colors ${
              snapToGrid
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                : 'bg-[#222530] border-[#313644] text-gray-400 hover:text-gray-200'
            }`}
            title="Snap to Grid"
          >
            <Magnet className="w-3 h-3 text-amber-400" />
            <span>Snap Grid</span>
          </button>

          <button
            onClick={() => setSnapToGuides?.(!snapToGuides)}
            className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 border transition-colors ${
              snapToGuides
                ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                : 'bg-[#222530] border-[#313644] text-gray-400 hover:text-gray-200'
            }`}
            title="Snap to Guides"
          >
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span>Snap Guides</span>
          </button>
        </div>

        {/* Right: Zoom slider & Maximize Viewport */}
        <div className="flex items-center space-x-2">
          {/* Grid display toggle */}
          <button
            onClick={() => setShowGrid?.(!showGrid)}
            className={`p-1 rounded transition-colors ${showGrid ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-[#282c38]'}`}
            title="Toggle Background Grid"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Margins toggle */}
          <button
            onClick={() => setShowMargins(!showMargins)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              showMargins
                ? 'border-blue-500/40 text-blue-300 bg-blue-500/10'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
            title="Toggle Printable Margin Outline"
          >
            Margins
          </button>

          <span className="text-gray-600">|</span>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
              className="p-1 rounded hover:bg-[#282c38] text-gray-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-gray-200 font-bold w-11 text-center text-[11px]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
              className="p-1 rounded hover:bg-[#282c38] text-gray-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-gray-600">|</span>

          {/* Maximize / Focus Mode Button (Enlarges editor section to maximum width/height) */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className={`p-1 rounded border transition-colors ${
                isMaximized
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-[#222530] border-[#313644] text-gray-300 hover:text-white hover:bg-[#2c3140]'
              }`}
              title={isMaximized ? 'Restore Normal Workspace' : 'Maximize Editor Section (Focus Mode)'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. MAIN VIEWPORT (RULERS COVERAGE + SYNCHRONIZED SCROLLABLE CANVAS) */}
      {/* ==================================================================== */}
      <div ref={viewportRef} className="flex-1 relative overflow-hidden bg-[#111317]">
        {/* PHYSICAL RULERS - COVERING THE ENTIRE EDITOR SECTION */}
        {showRulers && (
          <Rulers
            viewportWidth={viewportSize.width}
            viewportHeight={viewportSize.height}
            scrollLeft={scrollPos.left}
            scrollTop={scrollPos.top}
            originOffsetX={originOffsetX}
            originOffsetY={originOffsetY}
            labelWidthMm={doc.dimensions.width}
            labelHeightMm={doc.dimensions.height}
            zoom={zoom}
            cursorX={cursorMm.x}
            cursorY={cursorMm.y}
            unit={unit}
            onUnitChange={onUnitChange}
            onAddGuide={onAddGuide}
            rulerThickness={rulerThickness}
          />
        )}

        {/* SCROLLABLE CANVAS VIEWPORT */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onSelectObject(null);
              setSelectedGuideId(null);
            }
          }}
          style={{
            top: showRulers ? `${rulerThickness}px` : '0px',
            left: showRulers ? `${rulerThickness}px` : '0px',
          }}
          className="absolute bottom-0 right-0 overflow-auto bg-[#13151b] cursor-default"
        >
          {/* Spacious Pasteboard Area */}
          <div
            style={{
              width: `${pasteboardWidth}px`,
              height: `${pasteboardHeight}px`,
              position: 'relative',
              backgroundImage: `
                radial-gradient(circle, #252a36 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
          >
            {/* ================= GUIDE LINES ================= */}
            {showGuides && guides.map((guide) => {
              const isSelected = selectedGuideId === guide.id;
              if (guide.type === 'h') {
                const guideYPx = originOffsetY + guide.position * pxPerMm;
                return (
                  <div
                    key={guide.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGuideId(guide.id);
                    }}
                    style={{ top: `${guideYPx}px`, left: 0, right: 0 }}
                    className={`absolute h-0 border-t border-dashed pointer-events-auto group cursor-ns-resize z-30 transition-colors ${
                      isSelected ? 'border-amber-400 border-solid ring-1 ring-amber-400/50' : 'border-cyan-400/80 hover:border-cyan-300'
                    }`}
                  >
                    <div className="absolute left-2 -top-4 bg-cyan-900/90 text-cyan-200 border border-cyan-500/60 px-1 py-0.5 rounded text-[9px] font-mono shadow flex items-center space-x-1 pointer-events-auto">
                      <span>Y: {guide.position.toFixed(1)} mm</span>
                      {isSelected && onRemoveGuide && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveGuide(guide.id);
                          }}
                          className="text-red-400 hover:text-red-200 font-bold ml-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              } else {
                const guideXPx = originOffsetX + guide.position * pxPerMm;
                return (
                  <div
                    key={guide.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGuideId(guide.id);
                    }}
                    style={{ left: `${guideXPx}px`, top: 0, bottom: 0 }}
                    className={`absolute w-0 border-l border-dashed pointer-events-auto group cursor-ew-resize z-30 transition-colors ${
                      isSelected ? 'border-amber-400 border-solid ring-1 ring-amber-400/50' : 'border-cyan-400/80 hover:border-cyan-300'
                    }`}
                  >
                    <div className="absolute top-2 -left-8 bg-cyan-900/90 text-cyan-200 border border-cyan-500/60 px-1 py-0.5 rounded text-[9px] font-mono shadow flex items-center space-x-1 pointer-events-auto">
                      <span>X: {guide.position.toFixed(1)} mm</span>
                      {isSelected && onRemoveGuide && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveGuide(guide.id);
                          }}
                          className="text-red-400 hover:text-red-200 font-bold ml-1"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            })}

            {/* ================= PHYSICAL LABEL SUBSTRATE ================= */}
            <div
              ref={substrateRef}
              id="labelforge-canvas-container"
              style={{
                position: 'absolute',
                left: `${originOffsetX}px`,
                top: `${originOffsetY}px`,
                width: `${labelWidthPx}px`,
                height: `${labelHeightPx}px`,
                backgroundColor: '#ffffff',
                borderRadius: doc.dimensions.cornerRadius ? `${doc.dimensions.cornerRadius * pxPerMm}px` : '2px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.15)',
              }}
              className="relative overflow-hidden transition-all duration-75 select-none"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  onSelectObject(null);
                  setSelectedGuideId(null);
                }
              }}
            >
              {/* Printable Margins Guide (Light Blue Dashed border) */}
              {showMargins && (
                <div
                  className="absolute border border-dashed border-blue-400/50 pointer-events-none z-0"
                  style={{
                    top: `${(doc.dimensions.marginTop || 2) * pxPerMm}px`,
                    left: `${(doc.dimensions.marginLeft || 2) * pxPerMm}px`,
                    right: `${(doc.dimensions.marginRight || 2) * pxPerMm}px`,
                    bottom: `${(doc.dimensions.marginBottom || 2) * pxPerMm}px`,
                  }}
                />
              )}

              {/* Grid Pattern on Label */}
              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none z-0 opacity-20"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle, #2563eb 1px, transparent 1px)
                    `,
                    backgroundSize: `${5 * pxPerMm}px ${5 * pxPerMm}px`,
                  }}
                />
              )}

              {/* Label Objects Rendering */}
              {[...doc.objects]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((obj) => {
                  const isSelected = obj.id === selectedObjectId;
                  const objXPx = obj.x * pxPerMm;
                  const objYPx = obj.y * pxPerMm;
                  const objWPx = obj.width * pxPerMm;
                  const objHPx = obj.height * pxPerMm;

                  return (
                    <div
                      key={obj.id}
                      id={`obj-${obj.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectObject(obj.id);
                        setSelectedGuideId(null);
                      }}
                      onMouseDown={(e) => {
                        if (obj.locked) return;
                        e.stopPropagation();
                        onSelectObject(obj.id);
                        setSelectedGuideId(null);
                        setIsDragging(true);
                        setDragHandle('move');
                        setDragStart({
                          x: e.clientX,
                          y: e.clientY,
                          objX: obj.x,
                          objY: obj.y,
                          objW: obj.width,
                          objH: obj.height,
                        });
                      }}
                      style={{
                        position: 'absolute',
                        left: `${objXPx}px`,
                        top: `${objYPx}px`,
                        width: `${objWPx}px`,
                        height: `${objHPx}px`,
                        transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
                        transformOrigin: 'center center',
                        zIndex: isSelected ? 99 : obj.zIndex,
                        cursor: obj.locked ? 'default' : 'move',
                        opacity: obj.visible ? obj.opacity : 0.2,
                      }}
                      className={`group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-blue-300/60'}`}
                    >
                      {/* Object Content Renderer */}
                      {renderObjectContent(obj, activeRecord, counter, qrCache)}

                      {/* Selection Bounding Box & Resizing Handles */}
                      {isSelected && !obj.locked && (
                        <>
                          {/* Object Context Badge Tag */}
                          <div className="absolute -top-5 left-0 bg-blue-600 text-white text-[9px] font-medium px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap flex items-center space-x-1 pointer-events-none z-30">
                            <span>{obj.name}</span>
                            <span className="opacity-75">({obj.width.toFixed(1)}×{obj.height.toFixed(1)}mm)</span>
                          </div>

                          {/* 6 Resize Handles */}
                          {['nw', 'ne', 'se', 'sw', 'e', 's'].map((handle) => {
                            let handleStyle: React.CSSProperties = {
                              position: 'absolute',
                              width: '8px',
                              height: '8px',
                              backgroundColor: '#ffffff',
                              border: '1.5px solid #2563eb',
                              borderRadius: '1px',
                              zIndex: 35,
                            };

                            if (handle === 'nw') { handleStyle.top = '-4px'; handleStyle.left = '-4px'; handleStyle.cursor = 'nwse-resize'; }
                            else if (handle === 'ne') { handleStyle.top = '-4px'; handleStyle.right = '-4px'; handleStyle.cursor = 'nesw-resize'; }
                            else if (handle === 'se') { handleStyle.bottom = '-4px'; handleStyle.right = '-4px'; handleStyle.cursor = 'nwse-resize'; }
                            else if (handle === 'sw') { handleStyle.bottom = '-4px'; handleStyle.left = '-4px'; handleStyle.cursor = 'nesw-resize'; }
                            else if (handle === 'e') { handleStyle.top = 'calc(50% - 4px)'; handleStyle.right = '-4px'; handleStyle.cursor = 'ew-resize'; }
                            else if (handle === 's') { handleStyle.bottom = '-4px'; handleStyle.left = 'calc(50% - 4px)'; handleStyle.cursor = 'ns-resize'; }

                            return (
                              <div
                                key={handle}
                                style={handleStyle}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setIsDragging(true);
                                  setDragHandle(handle);
                                  setDragStart({
                                    x: e.clientX,
                                    y: e.clientY,
                                    objX: obj.x,
                                    objY: obj.y,
                                    objW: obj.width,
                                    objH: obj.height,
                                  });
                                }}
                              />
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Render individual object inside canvas
 */
function renderObjectContent(
  obj: LabelObject,
  activeRecord?: DataRecord,
  counter?: SerializationCounter,
  qrCache: Record<string, string> = {}
) {
  if (obj.type === 'text' || obj.type === 'rich-text') {
    const textObj = obj as TextLabelObject;
    const evaluatedText = evaluateExpression(textObj.text, activeRecord, counter);

    return (
      <div
        style={{
          fontFamily: textObj.style.fontFamily || 'Segoe UI',
          fontSize: `${textObj.style.fontSize}pt`,
          fontWeight: textObj.style.fontWeight || 'normal',
          fontStyle: textObj.style.fontStyle || 'normal',
          textDecoration: textObj.style.underline ? 'underline' : textObj.style.strikeout ? 'line-through' : 'none',
          color: textObj.style.color || '#000000',
          backgroundColor: textObj.style.backgroundColor || 'transparent',
          textAlign: textObj.style.alignment || 'left',
          direction: textObj.style.direction || 'ltr',
          lineHeight: textObj.style.lineHeight || 1.2,
          letterSpacing: textObj.style.letterSpacing ? `${textObj.style.letterSpacing}mm` : 'normal',
          whiteSpace: textObj.style.wrap ? 'pre-wrap' : 'nowrap',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {evaluatedText}
      </div>
    );
  }

  if (obj.type === 'barcode') {
    const bObj = obj as BarcodeLabelObject;
    const evaluatedVal = evaluateExpression(bObj.value, activeRecord, counter);
    const symbology = bObj.barcodeStyle.symbology;

    if (symbology === 'usps-imb' || symbology === 'royalmail-4state') {
      const svg = generatePostal4StateSvg(evaluatedVal, obj.width, obj.height, bObj.barcodeStyle.color || '#000000');
      return <div className="w-full h-full flex items-center justify-center overflow-hidden" dangerouslySetInnerHTML={{ __html: svg }} />;
    }

    const { svgContent, error } = render1DBarcodeSvg(symbology, evaluatedVal, bObj.barcodeStyle, obj.width, obj.height);
    if (error || !svgContent) {
      return (
        <div className="w-full h-full border border-red-500 bg-red-50 text-red-700 text-[9px] p-1 flex items-center justify-center text-center">
          Barcode Error: {error || 'Invalid Data'}
        </div>
      );
    }
    return (
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  if (obj.type === 'qrcode') {
    const bObj = obj as BarcodeLabelObject;
    const evaluatedVal = evaluateExpression(bObj.value, activeRecord, counter);
    const cacheKey = `${bObj.id}-${evaluatedVal}-${bObj.barcodeStyle.errorCorrectionLevel || 'M'}-${bObj.barcodeStyle.color || '#000000'}-${bObj.barcodeStyle.backgroundColor || 'transparent'}`;
    const qrDataUrl = qrCache[cacheKey];

    if (!qrDataUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-[10px] text-gray-500 font-mono">
          Generating QR...
        </div>
      );
    }

    return (
      <img
        src={qrDataUrl}
        alt="QR Code"
        className="w-full h-full object-contain pointer-events-none"
      />
    );
  }

  if (obj.type === 'datamatrix') {
    const bObj = obj as BarcodeLabelObject;
    const evaluatedVal = evaluateExpression(bObj.value, activeRecord, counter);
    const svg = generateDataMatrixSvg(evaluatedVal, obj.width, obj.height, bObj.barcodeStyle.color || '#000000');

    return (
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  if (obj.type === 'rect') {
    const shape = obj as ShapeLabelObject;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: shape.shapeStyle.fillColor || 'transparent',
          borderColor: shape.shapeStyle.strokeColor || '#000000',
          borderWidth: `${(shape.shapeStyle.strokeWidth || 0.5) * 3.7795}px`,
          borderStyle: shape.shapeStyle.strokeDash || 'solid',
          borderRadius: shape.shapeStyle.borderRadius ? `${shape.shapeStyle.borderRadius * 3.7795}px` : '0px',
        }}
      />
    );
  }

  if (obj.type === 'ellipse') {
    const shape = obj as ShapeLabelObject;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: shape.shapeStyle.fillColor || 'transparent',
          borderColor: shape.shapeStyle.strokeColor || '#000000',
          borderWidth: `${(shape.shapeStyle.strokeWidth || 0.5) * 3.7795}px`,
          borderStyle: shape.shapeStyle.strokeDash || 'solid',
          borderRadius: '9999px',
        }}
      />
    );
  }

  if (obj.type === 'line') {
    const shape = obj as ShapeLabelObject;
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderTopColor: shape.shapeStyle.strokeColor || '#000000',
          borderTopWidth: `${(shape.shapeStyle.strokeWidth || 0.5) * 3.7795}px`,
          borderTopStyle: shape.shapeStyle.strokeDash || 'solid',
        }}
      />
    );
  }

  return null;
}
