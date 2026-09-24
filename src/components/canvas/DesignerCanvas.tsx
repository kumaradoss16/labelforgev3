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
  ChevronDown,
  Hand,
  MousePointer,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Copy,
  Layers,
  Move,
  Tag,
  FileText,
  Plus,
  X,
  Square,
  Target
} from 'lucide-react';
import { LabelDocument, LabelObject, TextLabelObject, BarcodeLabelObject, ShapeLabelObject, GuideLine, GridSettings } from '../../types/label';
import { DataRecord, SerializationCounter } from '../../types/database';
import { evaluateExpression } from '../../services/dataBinding';
import { render1DBarcodeSvg, renderQRCodeDataUrl, generateDataMatrixSvg, generatePostal4StateSvg } from '../../services/barcodeEngine';
import { barcodeCache } from '../../services/barcodeCache';
import { getFontCssStack } from '../../services/fontFamilies';
import { SAMPLE_TEMPLATES } from '../../services/sampleData';
import { Rulers } from './Rulers';
import { computeIntelligentSnap, ActiveSnapGuide } from '../../services/intelligentSnapEngine';

interface DesignerCanvasProps {
  document: LabelDocument;
  selectedObjectId: string | null;
  selectedObjectIds?: string[];
  onSelectObject: (id: string | null) => void;
  onSelectObjects?: (ids: string[]) => void;
  onUpdateObject: (updated: Partial<LabelObject>) => void;
  onUpdateMultipleObjects?: (updates: Array<{ id: string; changes: Partial<LabelObject> }>) => void;
  activeTool?: string;
  setActiveTool?: (tool: string) => void;
  onAlign?: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v') => void;
  onDuplicateSelected?: () => void;
  showGrid: boolean;
  setShowGrid?: (v: boolean) => void;
  gridSettings?: GridSettings;
  snapToGrid: boolean;
  setSnapToGrid?: (v: boolean) => void;
  smartSnapping?: boolean;
  setSmartSnapping?: (v: boolean) => void;
  snapToCanvas?: boolean;
  setSnapToCanvas?: (v: boolean) => void;
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
  // Enlarged Document Tab and Multi-document Support
  isModified?: boolean;
  openDocuments?: LabelDocument[];
  activeDocumentId?: string;
  onSelectDocumentTab?: (docId: string) => void;
  onCloseDocumentTab?: (docId: string) => void;
  onNewDocumentTab?: () => void;
  onSelectTemplate?: (template: LabelDocument) => void;
}

export const DesignerCanvas: React.FC<DesignerCanvasProps> = ({
  document: doc,
  selectedObjectId,
  selectedObjectIds = [],
  onSelectObject,
  onSelectObjects,
  onUpdateObject,
  onUpdateMultipleObjects,
  activeTool = 'select',
  setActiveTool,
  onAlign,
  onDuplicateSelected,
  showGrid,
  setShowGrid,
  gridSettings = {
    style: 'lines',
    interval: 10,
    subInterval: 2,
    dashPattern: 'dashed',
    opacity: 0.2,
    color: '#2563eb'
  },
  snapToGrid,
  setSnapToGrid,
  smartSnapping,
  setSmartSnapping,
  snapToCanvas,
  setSnapToCanvas,
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
  isModified = false,
  openDocuments,
  activeDocumentId,
  onSelectDocumentTab,
  onCloseDocumentTab,
  onNewDocumentTab,
  onSelectTemplate,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const substrateRef = useRef<HTMLDivElement>(null);

  // Viewport dimensions
  const [viewportSize, setViewportSize] = useState({ width: 1000, height: 700 });
  const [scrollPos, setScrollPos] = useState({ left: 0, top: 0 });
  const [showMargins, setShowMargins] = useState(true);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

  // Rulers config - 28px standard
  const rulerThickness = 28;

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

  // Effective multi-selection state
  const effectiveSelectedIds = selectedObjectIds.length > 0
    ? selectedObjectIds
    : (selectedObjectId ? [selectedObjectId] : []);

  const handleSelectSingle = (id: string | null) => {
    onSelectObject(id);
    onSelectObjects?.(id ? [id] : []);
  };

  const handleSelectMultiple = (ids: string[]) => {
    onSelectObjects?.(ids);
    onSelectObject(ids.length > 0 ? ids[0] : null);
  };

  // Dragging & Resizing state
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; objX: number; objY: number; objW: number; objH: number } | null>(null);
  const [groupDragStarts, setGroupDragStarts] = useState<Record<string, { x: number; y: number }> | null>(null);
  const [primaryDragId, setPrimaryDragId] = useState<string | null>(null);
  const [liveDragDelta, setLiveDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Intelligent Object Snapping State (Aligns to center lines of adjacent elements)
  const [localSmartSnapping, setLocalSmartSnapping] = useState<boolean>(true);
  const isSmartSnappingActive = smartSnapping !== undefined ? smartSnapping : localSmartSnapping;
  const toggleSmartSnapping = () => {
    if (setSmartSnapping) {
      setSmartSnapping(!isSmartSnappingActive);
    } else {
      setLocalSmartSnapping(prev => !prev);
    }
  };

  // Snap-to-Canvas State (Magnetic alignment to label outer edges and center lines)
  const [localSnapToCanvas, setLocalSnapToCanvas] = useState<boolean>(true);
  const isSnapToCanvasActive = snapToCanvas !== undefined ? snapToCanvas : localSnapToCanvas;
  const toggleSnapToCanvas = () => {
    if (setSnapToCanvas) {
      setSnapToCanvas(!isSnapToCanvasActive);
    } else {
      setLocalSnapToCanvas(prev => !prev);
    }
  };
  const [activeSnapGuides, setActiveSnapGuides] = useState<ActiveSnapGuide[]>([]);

  // Hand Tool Panning State (Middle-click drag, Spacebar drag, or Pan Tool)
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const isHandModeActive = activeTool === 'pan' || isSpacePressed;

  const startPanning = (clientX: number, clientY: number) => {
    setIsPanning(true);
    panStartRef.current = {
      clientX,
      clientY,
      scrollLeft: scrollContainerRef.current?.scrollLeft || 0,
      scrollTop: scrollContainerRef.current?.scrollTop || 0,
    };
  };

  // Marquee Selection State
  const [isMarquee, setIsMarquee] = useState(false);
  const marqueeOriginRef = useRef<{
    clientX: number;
    clientY: number;
    pasteboardX: number;
    pasteboardY: number;
    substrateMmX: number;
    substrateMmY: number;
    isShift: boolean;
    initialSelectedIds: string[];
  } | null>(null);

  const [marqueeBox, setMarqueeBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    minMmX: number;
    maxMmX: number;
    minMmY: number;
    maxMmY: number;
  } | null>(null);

  const startMarquee = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    const substrate = substrateRef.current;
    if (!container || !substrate) return;

    const contRect = container.getBoundingClientRect();
    const subRect = substrate.getBoundingClientRect();

    const pasteboardX = e.clientX - contRect.left + container.scrollLeft;
    const pasteboardY = e.clientY - contRect.top + container.scrollTop;

    const substrateMmX = (e.clientX - subRect.left) / pxPerMm;
    const substrateMmY = (e.clientY - subRect.top) / pxPerMm;

    const isShift = e.shiftKey || e.ctrlKey || e.metaKey;
    marqueeOriginRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      pasteboardX,
      pasteboardY,
      substrateMmX,
      substrateMmY,
      isShift,
      initialSelectedIds: isShift ? [...effectiveSelectedIds] : [],
    };
  };

  // Cached QR code data URLs
  const [qrCache, setQrCache] = useState<Record<string, string>>({});
  const [cursorMm, setCursorMm] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const selectedObj = doc.objects.find(o => o.id === (effectiveSelectedIds[0] || selectedObjectId));

  // Prevent browser autoscroll icon on middle click on container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleMiddleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };
    container.addEventListener('mousedown', handleMiddleMouseDown);
    return () => container.removeEventListener('mousedown', handleMiddleMouseDown);
  }, []);

  // Window-level mousemove & mouseup during panning for uninterrupted fluid pan
  useEffect(() => {
    if (!isPanning) return;

    const onWindowMouseMove = (e: MouseEvent) => {
      if (!panStartRef.current || !scrollContainerRef.current) return;
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;
      scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
    };

    const onWindowMouseUp = () => {
      setIsPanning(false);
      panStartRef.current = null;
    };

    window.addEventListener('mousemove', onWindowMouseMove, { passive: false });
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
  }, [isPanning]);

  // Spacebar toggle for momentary Hand Tool + H / V hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey) {
        setActiveTool?.('pan');
      }
      if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey) {
        setActiveTool?.('select');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsPanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [setActiveTool]);

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
        
        if (!barcodeCache.has(cacheKey)) {
          const url = await renderQRCodeDataUrl(
            evaluated,
            bObj.barcodeStyle.errorCorrectionLevel || 'M',
            bObj.barcodeStyle.color || '#000000',
            bObj.barcodeStyle.backgroundColor || 'transparent'
          );
          if (isMounted) {
            barcodeCache.set(cacheKey, url);
            setQrCache(prev => ({ ...prev, [cacheKey]: url }));
          }
        } else if (!qrCache[cacheKey]) {
          const cached = barcodeCache.get(cacheKey);
          if (cached && isMounted) {
            setQrCache(prev => ({ ...prev, [cacheKey]: cached }));
          }
        }
      }
    });
    return () => { isMounted = false; };
  }, [doc.objects, activeRecord, counter]);

  // Snap coordinate helper (Grid + Guides)
  const snap = useCallback((val: number, isVertical = false, step?: number): number => {
    const actualStep = step !== undefined
      ? step
      : (gridSettings.subInterval > 0 && gridSettings.subInterval < gridSettings.interval)
        ? gridSettings.subInterval
        : gridSettings.interval;

    let result = snapToGrid ? Math.round(val / actualStep) * actualStep : val;

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
  }, [snapToGrid, snapToGuides, guides, gridSettings]);

  // Start dragging a label object or group of selected objects
  const handleStartObjectDrag = (e: React.MouseEvent, obj: LabelObject) => {
    if (obj.locked) return;
    e.stopPropagation();

    // Hand tool / middle-click priority
    if (isHandModeActive || e.button === 1) {
      startPanning(e.clientX, e.clientY);
      return;
    }
    if (e.button !== 0) return;

    // Shift / Ctrl click toggles object in multi-selection
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const isAlreadySelected = effectiveSelectedIds.includes(obj.id);
      const next = isAlreadySelected
        ? effectiveSelectedIds.filter(id => id !== obj.id)
        : [...effectiveSelectedIds, obj.id];
      handleSelectMultiple(next);
      return;
    }

    // Left click on object:
    // If the clicked object is already in the multi-selection group, keep the group!
    const targetIds = effectiveSelectedIds.includes(obj.id)
      ? effectiveSelectedIds
      : [obj.id];

    if (!effectiveSelectedIds.includes(obj.id)) {
      handleSelectMultiple([obj.id]);
    }
    setSelectedGuideId(null);

    // Prepare group drag start positions
    const initialMap: Record<string, { x: number; y: number }> = {};
    doc.objects.forEach(o => {
      if (targetIds.includes(o.id) && !o.locked) {
        initialMap[o.id] = { x: o.x, y: o.y };
      }
    });

    setGroupDragStarts(initialMap);
    setPrimaryDragId(obj.id);
    setLiveDragDelta({ dx: 0, dy: 0 });
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
  };

  // Track mouse movements relative to label origin (0, 0 in mm)
  const handleMouseMove = (e: React.MouseEvent) => {
    const substrate = substrateRef.current;
    const container = scrollContainerRef.current;
    if (!substrate || !container) return;

    const rect = substrate.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const mmX = Number((relX / pxPerMm).toFixed(1));
    const mmY = Number((relY / pxPerMm).toFixed(1));

    setCursorMm({ x: mmX, y: mmY });
    onCursorMove(mmX, mmY);

    if (isPanning) return;

    // 1. Marquee drag selection
    if (marqueeOriginRef.current && !isDragging) {
      const dx = e.clientX - marqueeOriginRef.current.clientX;
      const dy = e.clientY - marqueeOriginRef.current.clientY;
      if (Math.hypot(dx, dy) > 4) {
        if (!isMarquee) setIsMarquee(true);

        const contRect = container.getBoundingClientRect();
        const curPasteboardX = e.clientX - contRect.left + container.scrollLeft;
        const curPasteboardY = e.clientY - contRect.top + container.scrollTop;

        const minMmX = Math.min(marqueeOriginRef.current.substrateMmX, mmX);
        const maxMmX = Math.max(marqueeOriginRef.current.substrateMmX, mmX);
        const minMmY = Math.min(marqueeOriginRef.current.substrateMmY, mmY);
        const maxMmY = Math.max(marqueeOriginRef.current.substrateMmY, mmY);

        setMarqueeBox({
          left: Math.min(marqueeOriginRef.current.pasteboardX, curPasteboardX),
          top: Math.min(marqueeOriginRef.current.pasteboardY, curPasteboardY),
          width: Math.abs(curPasteboardX - marqueeOriginRef.current.pasteboardX),
          height: Math.abs(curPasteboardY - marqueeOriginRef.current.pasteboardY),
          minMmX,
          maxMmX,
          minMmY,
          maxMmY,
        });

        // Real-time object intersection detection
        const hit = doc.objects.filter(o => {
          if (!o.visible || o.locked) return false;
          const r = o.x + o.width;
          const b = o.y + o.height;
          return !(r < minMmX || o.x > maxMmX || b < minMmY || o.y > maxMmY);
        });
        const hitIds = hit.map(o => o.id);
        const finalIds = marqueeOriginRef.current.isShift
          ? Array.from(new Set([...marqueeOriginRef.current.initialSelectedIds, ...hitIds]))
          : hitIds;
        handleSelectMultiple(finalIds);
      }
      return;
    }

    // 2. Dragging & Resizing objects
    if (isDragging && dragStart) {
      const deltaMmX = (e.clientX - dragStart.x) / pxPerMm;
      const deltaMmY = (e.clientY - dragStart.y) / pxPerMm;

      if (dragHandle === 'move') {
        if (groupDragStarts && primaryDragId) {
          const pInit = groupDragStarts[primaryDragId] || { x: dragStart.objX, y: dragStart.objY };
          const pObj = doc.objects.find(o => o.id === primaryDragId);
          const rawX = Math.max(0, pInit.x + deltaMmX);
          const rawY = Math.max(0, pInit.y + deltaMmY);

          let snappedX = rawX;
          let snappedY = rawY;
          let currentGuides: ActiveSnapGuide[] = [];

          const shouldSnap = (isSmartSnappingActive || isSnapToCanvasActive) && pObj && !e.altKey;
          if (shouldSnap) {
            const snapRes = computeIntelligentSnap({
              draggedObj: {
                id: primaryDragId,
                x: rawX,
                y: rawY,
                width: pObj.width,
                height: pObj.height,
              },
              otherObjects: doc.objects.filter(o => !effectiveSelectedIds.includes(o.id)),
              canvasWidthMm: doc.dimensions.width,
              canvasHeightMm: doc.dimensions.height,
              thresholdMm: Math.max(1.8, 7 / pxPerMm),
              enabled: true,
              snapToCanvas: isSnapToCanvasActive,
              snapToObjects: isSmartSnappingActive,
            });
            snappedX = snapRes.hasSnappedX ? snapRes.x : snap(rawX, true);
            snappedY = snapRes.hasSnappedY ? snapRes.y : snap(rawY, false);
            currentGuides = snapRes.guides;
          } else {
            snappedX = snap(rawX, true);
            snappedY = snap(rawY, false);
          }

          setActiveSnapGuides(currentGuides);
          const effDx = snappedX - pInit.x;
          const effDy = snappedY - pInit.y;
          setLiveDragDelta({ dx: effDx, dy: effDy });
        } else if (selectedObj && !selectedObj.locked) {
          const rawX = Math.max(0, dragStart.objX + deltaMmX);
          const rawY = Math.max(0, dragStart.objY + deltaMmY);

          let newX = rawX;
          let newY = rawY;
          let currentGuides: ActiveSnapGuide[] = [];

          const shouldSnap = (isSmartSnappingActive || isSnapToCanvasActive) && !e.altKey;
          if (shouldSnap) {
            const snapRes = computeIntelligentSnap({
              draggedObj: {
                id: selectedObj.id,
                x: rawX,
                y: rawY,
                width: selectedObj.width,
                height: selectedObj.height,
              },
              otherObjects: doc.objects.filter(o => o.id !== selectedObj.id),
              canvasWidthMm: doc.dimensions.width,
              canvasHeightMm: doc.dimensions.height,
              thresholdMm: Math.max(1.8, 7 / pxPerMm),
              enabled: true,
              snapToCanvas: isSnapToCanvasActive,
              snapToObjects: isSmartSnappingActive,
            });
            newX = snapRes.hasSnappedX ? snapRes.x : snap(rawX, true);
            newY = snapRes.hasSnappedY ? snapRes.y : snap(rawY, false);
            currentGuides = snapRes.guides;
          } else {
            newX = snap(rawX, true);
            newY = snap(rawY, false);
          }

          setActiveSnapGuides(currentGuides);
          onUpdateObject({ x: newX, y: newY });
        }
      } else if (selectedObj && !selectedObj.locked) {
        setActiveSnapGuides([]);
        if (dragHandle === 'se') {
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
    }
  };

  const handleMouseUp = () => {
    // 1. Commit group move updates if any
    if (isDragging && dragHandle === 'move' && groupDragStarts) {
      if (liveDragDelta.dx !== 0 || liveDragDelta.dy !== 0) {
        const updates = Object.keys(groupDragStarts).map(id => ({
          id,
          changes: {
            x: Number(Math.max(0, groupDragStarts[id].x + liveDragDelta.dx).toFixed(2)),
            y: Number(Math.max(0, groupDragStarts[id].y + liveDragDelta.dy).toFixed(2)),
          },
        }));
        if (onUpdateMultipleObjects) {
          onUpdateMultipleObjects(updates);
        } else {
          updates.forEach(u => onUpdateObject(u.changes));
        }
      }
    }

    // 2. Finalize marquee
    if (isMarquee && marqueeBox) {
      const hit = doc.objects.filter(o => {
        if (!o.visible || o.locked) return false;
        const r = o.x + o.width;
        const b = o.y + o.height;
        return !(r < marqueeBox.minMmX || o.x > marqueeBox.maxMmX || b < marqueeBox.minMmY || o.y > marqueeBox.maxMmY);
      });
      const hitIds = hit.map(o => o.id);
      const finalIds = marqueeOriginRef.current?.isShift
        ? Array.from(new Set([...(marqueeOriginRef.current?.initialSelectedIds || []), ...hitIds]))
        : hitIds;
      handleSelectMultiple(finalIds);
    }

    setIsDragging(false);
    setDragHandle(null);
    setDragStart(null);
    setGroupDragStarts(null);
    setPrimaryDragId(null);
    setLiveDragDelta({ dx: 0, dy: 0 });
    setActiveSnapGuides([]);
    setIsMarquee(false);
    setMarqueeBox(null);
    marqueeOriginRef.current = null;
  };

  // Keyboard navigation & deletion (Supports both single object and multi-selected groups)
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

        if (effectiveSelectedIds.length > 0) {
          e.preventDefault();
          onDeleteSelected();
          return;
        }
      }

      if (effectiveSelectedIds.length === 0) return;

      const step = e.shiftKey ? 5 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        if (effectiveSelectedIds.length === 1 && selectedObj && !selectedObj.locked) {
          onUpdateObject({
            x: Math.max(0, Number((selectedObj.x + dx).toFixed(2))),
            y: Math.max(0, Number((selectedObj.y + dy).toFixed(2))),
          });
        } else if (effectiveSelectedIds.length > 1 && onUpdateMultipleObjects) {
          const updates = doc.objects
            .filter(o => effectiveSelectedIds.includes(o.id) && !o.locked)
            .map(o => ({
              id: o.id,
              changes: {
                x: Math.max(0, Number((o.x + dx).toFixed(2))),
                y: Math.max(0, Number((o.y + dy).toFixed(2))),
              },
            }));
          onUpdateMultipleObjects(updates);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveSelectedIds, selectedObj, selectedGuideId, onUpdateObject, onUpdateMultipleObjects, onDeleteSelected, onRemoveGuide, doc.objects]);

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
      {/* 1. COMPACT LABEL EDITOR DOCUMENT TAB BAR & CONTROL STRIP */}
      {/* ==================================================================== */}
      <div className="bg-[#181a22] border-b border-[#2d313d] flex flex-col z-30 shrink-0 select-none shadow-xs">
        {/* Tier 1: Document / Template Tabs */}
        <div className="h-10 bg-[#14161e] border-b border-[#272b38] px-2 flex items-center justify-between overflow-x-auto scrollbar-none">
          {/* Left: Document Tabs Strip */}
          <div className="flex items-center space-x-1.5 h-full pt-1">
            {/* Open document tabs or current document tab */}
            {(openDocuments && openDocuments.length > 0 ? openDocuments : [doc])
              .filter((d): d is LabelDocument => Boolean(d && d.id))
              .map((tDoc) => {
                const isActive = tDoc.id === (activeDocumentId || doc?.id);
                const width = tDoc.dimensions?.width ?? 100;
                const height = tDoc.dimensions?.height ?? 150;
                return (
                  <div
                    key={tDoc.id}
                    onClick={() => onSelectDocumentTab?.(tDoc.id)}
                    className={`group relative flex items-center space-x-2 px-3 h-8.5 rounded-t-md cursor-pointer transition-all duration-150 border-t-2 shadow-xs ${
                      isActive
                        ? 'bg-[#1f232d] border-blue-500 text-white shadow-sm'
                        : 'bg-[#151720] border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1a1d26]'
                    }`}
                    title={`${tDoc.name || 'Untitled'} (${width}×${height}mm)`}
                  >
                    <Tag className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-400'}`} />

                    {/* Document / Template Name */}
                    <span className={`text-xs font-semibold tracking-wide whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {tDoc.name || 'Untitled Template'}
                    </span>

                    {/* Format Badge */}
                    <span className="text-[9px] font-mono bg-blue-950/90 border border-blue-500/50 text-blue-300 px-1.5 py-0.2 rounded font-bold shrink-0">
                      .lforge
                    </span>

                    {/* Physical Dimensions Chip */}
                    <span className="text-[10px] font-mono bg-[#101218] px-1.5 py-0.5 rounded text-gray-300 border border-[#2b303e] font-medium shrink-0">
                      {width}×{height} mm
                    </span>

                    {/* Unsaved indicator */}
                    {isActive && isModified && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5 shrink-0" title="Unsaved Changes" />
                    )}

                    {/* Close Tab Button */}
                    {openDocuments && openDocuments.filter(Boolean).length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseDocumentTab?.(tDoc.id);
                        }}
                        className="ml-1 p-0.5 rounded hover:bg-[#2e3444] text-gray-400 hover:text-white transition-colors shrink-0"
                        title="Close Template Tab"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

            {/* + New Document / Template Tab Button */}
            {onNewDocumentTab && (
              <button
                onClick={onNewDocumentTab}
                className="h-7.5 px-2.5 rounded hover:bg-[#232733] bg-[#181a24] border border-[#2d3243] text-gray-300 hover:text-blue-400 flex items-center space-x-1 text-[11px] font-medium transition-colors"
                title="Open Template / New Label Tab"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">New Tab</span>
              </button>
            )}
          </div>

          {/* Right: Quick Template Dropdown, Select/Pan tools, and Maximize */}
          <div className="flex items-center space-x-2 pl-2">
            {/* Quick Template Switcher Dropdown */}
            {onSelectTemplate && (
              <div className="flex items-center space-x-1.5">
                <span className="text-gray-400 text-[11px] font-medium hidden md:inline">Template:</span>
                <select
                  value={doc?.id || ''}
                  onChange={(e) => {
                    const found = (SAMPLE_TEMPLATES || []).find(t => t && t.id === e.target.value);
                    if (found) onSelectTemplate(found);
                  }}
                  className="bg-[#1b1e27] border border-[#343a49] text-xs text-gray-100 rounded px-2 py-1 font-medium hover:border-blue-500 focus:outline-none focus:border-blue-500 cursor-pointer h-7.5"
                  title="Switch Active Label Template"
                >
                  {(SAMPLE_TEMPLATES || []).filter(Boolean).map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.dimensions?.width ?? 0}×{tpl.dimensions?.height ?? 0}mm)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Select / Hand Pan Mode Selector */}
            <div className="flex items-center bg-[#222530] border border-[#313644] rounded p-0.5 space-x-0.5 h-7.5">
              <button
                onClick={() => setActiveTool?.('select')}
                className={`px-2 h-full rounded text-[11px] flex items-center space-x-1 transition-colors ${
                  !isHandModeActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2e3d]'
                }`}
                title="Select Tool (V)"
              >
                <MousePointer className="w-3 h-3" />
                <span className="hidden lg:inline">Select</span>
              </button>
              <button
                onClick={() => setActiveTool?.('pan')}
                className={`px-2 h-full rounded text-[11px] flex items-center space-x-1 transition-colors ${
                  isHandModeActive
                    ? 'bg-amber-600 text-white font-semibold shadow-xs'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2e3d]'
                }`}
                title="Hand Pan Tool (H / Spacebar)"
              >
                <Hand className="w-3 h-3" />
                <span className="hidden lg:inline">Pan</span>
              </button>
            </div>

            {/* Maximize / Focus Mode Button */}
            {onToggleMaximize && (
              <button
                onClick={onToggleMaximize}
                className={`h-7.5 w-7.5 rounded border flex items-center justify-center transition-colors ${
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

        {/* Tier 2: Viewport Sizing, Rulers, Guides, Grid & Zoom Strip */}
        <div className="h-8 bg-[#181a22] px-3 flex items-center justify-between text-xs text-gray-300">
          {/* Left: Fit & Scaling Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFitTemplate}
              className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded text-[11px] font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
              title="Auto-scale working template to fit the editor section"
            >
              <Maximize2 className="w-3 h-3 text-blue-400" />
              <span>Fit Template</span>
            </button>

            <button
              onClick={handleFitWidth}
              className="px-2 py-0.5 hover:bg-[#282c38] text-gray-400 hover:text-gray-200 rounded text-[11px] transition-colors"
              title="Scale template to fit viewport width"
            >
              Fit Width
            </button>

            <button
              onClick={handleFitHeight}
              className="px-2 py-0.5 hover:bg-[#282c38] text-gray-400 hover:text-gray-200 rounded text-[11px] transition-colors"
              title="Scale template to fit viewport height"
            >
              Fit Height
            </button>

            <button
              onClick={() => setZoom(1.0)}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${zoom === 1.0 ? 'bg-[#2b303e] text-white font-semibold' : 'hover:bg-[#282c38] text-gray-400 hover:text-gray-200'}`}
              title="1:1 Actual physical scale"
            >
              100%
            </button>

            <span className="text-gray-600">|</span>

            {/* Printable Margin Indicator */}
            <button
              onClick={() => setShowMargins(!showMargins)}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 border transition-colors ${
                showMargins
                  ? 'bg-blue-900/30 border-blue-500/40 text-blue-300'
                  : 'bg-[#222530] border-[#313644] text-gray-400 hover:text-gray-200'
              }`}
              title="Toggle Printable Margin Outline"
            >
              <Square className="w-3 h-3 text-blue-400" />
              <span>Margins</span>
            </button>

            {effectiveSelectedIds.length > 1 && (
              <div className="flex items-center space-x-1 bg-blue-950/70 border border-blue-500/50 text-blue-300 px-2 py-0.5 rounded text-[11px] font-mono shadow-xs">
                <Layers className="w-3 h-3 text-blue-400" />
                <span>{effectiveSelectedIds.length} Selected</span>
                <button
                  onClick={() => handleSelectSingle(null)}
                  className="ml-1 text-blue-400 hover:text-blue-100 font-bold"
                  title="Deselect all"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Center/Right: Rulers, Units, Guides, Grid, Zoom */}
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

            {/* Snap to Grid */}
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
              <span>Snap</span>
            </button>

            {/* Snap to Canvas Toggle (Magnetic alignment to label outer edges & centerlines) */}
            <button
              id="designer-canvas-snap-to-canvas-btn"
              onClick={toggleSnapToCanvas}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 border transition-colors ${
                isSnapToCanvasActive
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#222530] border-[#313644] text-gray-400 hover:text-gray-200'
              }`}
              title={
                isSnapToCanvasActive
                  ? 'Snap-to-Canvas Active: Magnetically snaps to label outer edges & center lines when dragging. Click to toggle. Hold Alt to suspend.'
                  : 'Enable Snap-to-Canvas (Magnetic alignment to label borders & midlines)'
              }
            >
              <Target className="w-3 h-3 text-emerald-400" />
              <span>Canvas Snap</span>
            </button>

            {/* Intelligent Object Snapping */}
            <button
              id="designer-canvas-smart-snap-btn"
              onClick={toggleSmartSnapping}
              className={`px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 border transition-colors ${
                isSmartSnappingActive
                  ? 'bg-fuchsia-600/20 border-fuchsia-500/50 text-fuchsia-300'
                  : 'bg-[#222530] border-[#313644] text-gray-400 hover:text-gray-200'
              }`}
              title={
                isSmartSnappingActive
                  ? 'Intelligent Object Snapping Active (Aligns to center lines of adjacent elements). Hold Alt to temporarily suspend.'
                  : 'Enable Intelligent Object Snapping'
              }
            >
              <AlignCenter className="w-3 h-3 text-fuchsia-400" />
              <span>Smart Snap</span>
            </button>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid?.(!showGrid)}
              className={`p-1 rounded transition-colors ${showGrid ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-[#282c38]'}`}
              title="Toggle Background Grid"
            >
              <Grid className="w-3.5 h-3.5" />
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
          </div>
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
          onMouseDown={(e) => {
            // Middle-click (button 1) or Hand tool active -> Start Hand Panning
            if (e.button === 1 || (e.button === 0 && isHandModeActive)) {
              e.preventDefault();
              startPanning(e.clientX, e.clientY);
              return;
            }
            // Left click on empty canvas pasteboard -> Start Marquee selection
            if (e.button === 0) {
              startMarquee(e);
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isMarquee) {
              if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                handleSelectSingle(null);
                setSelectedGuideId(null);
              }
            }
          }}
          style={{
            top: showRulers ? `${rulerThickness}px` : '0px',
            left: showRulers ? `${rulerThickness}px` : '0px',
            cursor: isPanning
              ? 'grabbing'
              : isHandModeActive
              ? 'grab'
              : isMarquee
              ? 'crosshair'
              : 'default',
          }}
          className="absolute bottom-0 right-0 overflow-auto bg-[#13151b]"
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
            {/* Real-time Marquee Selection Rectangle Overlay */}
            {isMarquee && marqueeBox && (
              <div
                className="absolute border border-blue-400 bg-blue-500/15 pointer-events-none z-50 rounded-xs shadow-sm"
                style={{
                  left: `${marqueeBox.left}px`,
                  top: `${marqueeBox.top}px`,
                  width: `${marqueeBox.width}px`,
                  height: `${marqueeBox.height}px`,
                }}
              >
                <div className="absolute -top-5 left-0 bg-blue-600/90 text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  {effectiveSelectedIds.length > 0
                    ? `${effectiveSelectedIds.length} element${effectiveSelectedIds.length > 1 ? 's' : ''} in marquee`
                    : 'Drag to select elements'}
                </div>
              </div>
            )}

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
              onMouseDown={(e) => {
                if (e.button === 1 || (e.button === 0 && isHandModeActive)) {
                  e.preventDefault();
                  e.stopPropagation();
                  startPanning(e.clientX, e.clientY);
                  return;
                }
                if (e.target === e.currentTarget && e.button === 0) {
                  e.stopPropagation();
                  startMarquee(e);
                }
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget && !isMarquee) {
                  if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    handleSelectSingle(null);
                    setSelectedGuideId(null);
                  }
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
              {showGrid && (() => {
                const majorWidth = gridSettings.interval * pxPerMm;
                const majorHeight = gridSettings.interval * pxPerMm;
                const effectiveSubInterval = gridSettings.subInterval > 0 && gridSettings.subInterval < gridSettings.interval
                  ? gridSettings.subInterval
                  : 0;
                const minorWidth = effectiveSubInterval * pxPerMm;
                const minorHeight = effectiveSubInterval * pxPerMm;
                const hasSubgrid = effectiveSubInterval > 0;

                let majorDash: string | undefined = undefined;
                let minorDash: string | undefined = undefined;

                if (gridSettings.dashPattern === 'solid') {
                  majorDash = undefined;
                  minorDash = undefined;
                } else if (gridSettings.dashPattern === 'dashed') {
                  majorDash = '4 2';
                  minorDash = '2 2';
                } else if (gridSettings.dashPattern === 'dotted') {
                  majorDash = '1 1';
                  minorDash = '1 1';
                } else {
                  majorDash = gridSettings.dashPattern;
                  minorDash = gridSettings.dashPattern;
                }

                return (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-0"
                    style={{ opacity: gridSettings.opacity }}
                  >
                    <defs>
                      {hasSubgrid && (
                        <pattern
                          id="canvas-sub-grid-pattern"
                          width={minorWidth}
                          height={minorHeight}
                          patternUnits="userSpaceOnUse"
                          overflow="visible"
                        >
                          {gridSettings.style === 'lines' && (
                            <path
                              d={`M ${minorWidth} 0 L 0 0 0 ${minorHeight}`}
                              fill="none"
                              stroke={gridSettings.color}
                              strokeWidth="0.5"
                              strokeDasharray={minorDash}
                              opacity="0.4"
                            />
                          )}
                          {gridSettings.style === 'dots' && (
                            <circle
                              cx="0"
                              cy="0"
                              r="1"
                              fill={gridSettings.color}
                              opacity="0.4"
                            />
                          )}
                          {gridSettings.style === 'crosses' && (
                            <path
                              d="M -2 0 L 2 0 M 0 -2 L 0 2"
                              fill="none"
                              stroke={gridSettings.color}
                              strokeWidth="0.5"
                              opacity="0.4"
                            />
                          )}
                        </pattern>
                      )}

                      <pattern
                        id="canvas-major-grid-pattern"
                        width={majorWidth}
                        height={majorHeight}
                        patternUnits="userSpaceOnUse"
                        overflow="visible"
                      >
                        {hasSubgrid && (
                          <rect width={majorWidth} height={majorHeight} fill="url(#canvas-sub-grid-pattern)" />
                        )}
                        {gridSettings.style === 'lines' && (
                          <path
                            d={`M ${majorWidth} 0 L 0 0 0 ${majorHeight}`}
                            fill="none"
                            stroke={gridSettings.color}
                            strokeWidth="1.2"
                            strokeDasharray={majorDash}
                            opacity="0.9"
                          />
                        )}
                        {gridSettings.style === 'dots' && (
                          <circle
                            cx="0"
                            cy="0"
                            r="1.75"
                            fill={gridSettings.color}
                            opacity="0.9"
                          />
                        )}
                        {gridSettings.style === 'crosses' && (
                          <path
                            d="M -4 0 L 4 0 M 0 -4 L 0 4"
                            fill="none"
                            stroke={gridSettings.color}
                            strokeWidth="1.2"
                            opacity="0.9"
                          />
                        )}
                      </pattern>
                    </defs>

                    <rect width="100%" height="100%" fill="url(#canvas-major-grid-pattern)" />
                  </svg>
                );
              })()}

              {/* Label Objects Rendering */}
              {[...doc.objects]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((obj) => {
                  const isSelected = effectiveSelectedIds.includes(obj.id);
                  const isGroupDragged = groupDragStarts && groupDragStarts[obj.id] !== undefined && isDragging && dragHandle === 'move';
                  const curX = isGroupDragged ? Math.max(0, groupDragStarts[obj.id].x + liveDragDelta.dx) : obj.x;
                  const curY = isGroupDragged ? Math.max(0, groupDragStarts[obj.id].y + liveDragDelta.dy) : obj.y;
                  const objXPx = curX * pxPerMm;
                  const objYPx = curY * pxPerMm;
                  const objWPx = obj.width * pxPerMm;
                  const objHPx = obj.height * pxPerMm;

                  return (
                    <div
                      key={obj.id}
                      id={`obj-${obj.id}`}
                      onMouseDown={(e) => {
                        handleStartObjectDrag(e, obj);
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
                        cursor: isPanning
                          ? 'grabbing'
                          : isHandModeActive
                          ? 'grab'
                          : obj.locked
                          ? 'default'
                          : 'move',
                        opacity: obj.visible ? obj.opacity : 0.2,
                      }}
                      className={`group ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-blue-300/60'}`}
                    >
                      {/* Object Content Renderer */}
                      {renderObjectContent(obj, activeRecord, counter, qrCache)}

                      {/* Single Object Selection Bounding Box & Resizing Handles */}
                      {isSelected && !obj.locked && effectiveSelectedIds.length === 1 && (
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

              {/* Group Bounding Box & Floating Action Bar for Multi-Selected Elements */}
              {(() => {
                if (effectiveSelectedIds.length <= 1) return null;
                const selectedObjs = doc.objects.filter(o => effectiveSelectedIds.includes(o.id));
                if (selectedObjs.length === 0) return null;

                const getCurObjCoords = (o: LabelObject) => {
                  const isGroupDragged = groupDragStarts && groupDragStarts[o.id] !== undefined && isDragging && dragHandle === 'move';
                  const x = isGroupDragged ? Math.max(0, groupDragStarts[o.id].x + liveDragDelta.dx) : o.x;
                  const y = isGroupDragged ? Math.max(0, groupDragStarts[o.id].y + liveDragDelta.dy) : o.y;
                  return { x, y, right: x + o.width, bottom: y + o.height };
                };

                const coords = selectedObjs.map(getCurObjCoords);
                const gMinX = Math.min(...coords.map(c => c.x));
                const gMinY = Math.min(...coords.map(c => c.y));
                const gMaxX = Math.max(...coords.map(c => c.right));
                const gMaxY = Math.max(...coords.map(c => c.bottom));
                const gW = gMaxX - gMinX;
                const gH = gMaxY - gMinY;

                return (
                  <>
                    {/* Dashed Multi-selection Group Outline with corner accents */}
                    <div
                      className="absolute border-2 border-dashed border-blue-500 bg-blue-500/5 pointer-events-none z-40 rounded-sm"
                      style={{
                        left: `${gMinX * pxPerMm}px`,
                        top: `${gMinY * pxPerMm}px`,
                        width: `${gW * pxPerMm}px`,
                        height: `${gH * pxPerMm}px`,
                      }}
                    >
                      <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-blue-600 border border-white rounded-xs" />
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 border border-white rounded-xs" />
                      <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-blue-600 border border-white rounded-xs" />
                      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-blue-600 border border-white rounded-xs" />
                    </div>

                    {/* Floating Group Action Bar */}
                    <div
                      className="absolute pointer-events-auto z-50 bg-[#171922] border border-blue-500/60 shadow-2xl rounded-md px-2 py-1 flex items-center space-x-1.5 backdrop-blur text-xs"
                      style={{
                        left: `${Math.max(4, gMinX * pxPerMm)}px`,
                        top: `${Math.max(4, gMinY * pxPerMm - 36)}px`,
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center space-x-1 text-[11px] font-bold text-blue-300 pr-1.5 border-r border-[#323746]">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>{selectedObjs.length} Selected</span>
                      </div>

                      {/* Align Group Actions */}
                      <div className="flex items-center space-x-0.5">
                        <button
                          onClick={() => onAlign?.('left')}
                          className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white"
                          title="Align Left (Group)"
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onAlign?.('center')}
                          className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white"
                          title="Align Center Horizontally (Group)"
                        >
                          <AlignCenter className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onAlign?.('right')}
                          className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white"
                          title="Align Right (Group)"
                        >
                          <AlignRight className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-[1px] h-3.5 bg-[#323746]" />
                        <button
                          onClick={() => onAlign?.('top')}
                          className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white"
                          title="Align Top (Group)"
                        >
                          <AlignStartVertical className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onAlign?.('middle')}
                          className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white"
                          title="Align Middle Vertically (Group)"
                        >
                          <AlignCenterVertical className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onAlign?.('bottom')}
                          className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white"
                          title="Align Bottom (Group)"
                        >
                          <AlignEndVertical className="w-3.5 h-3.5" />
                        </button>
                        {selectedObjs.length >= 3 && (
                          <>
                            <div className="w-[1px] h-3.5 bg-[#323746]" />
                            <button
                              onClick={() => onAlign?.('distribute-h')}
                              className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white"
                              title="Distribute Horizontally"
                            >
                              <AlignHorizontalDistributeCenter className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onAlign?.('distribute-v')}
                              className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white"
                              title="Distribute Vertically"
                            >
                              <AlignVerticalDistributeCenter className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>

                      <div className="w-[1px] h-3.5 bg-[#323746]" />

                      {/* Duplicate & Delete Group Actions */}
                      {onDuplicateSelected && (
                        <button
                          onClick={onDuplicateSelected}
                          className="p-1 rounded hover:bg-[#2b303f] text-gray-300 hover:text-white"
                          title="Duplicate Group (Ctrl+D)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={onDeleteSelected}
                        className="p-1 rounded hover:bg-red-600/30 text-red-400 hover:text-red-200"
                        title="Delete Selected Elements (Del)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                );
              })()}

              {/* Dynamic Snap-to-Canvas & Intelligent Object Snapping Guide Lines & Badges */}
              {isDragging && activeSnapGuides.map((guide) => {
                const isVertical = guide.axis === 'x'; // constant x, vertical line
                const isCanvasCenter = Boolean(guide.isCanvasCenter);
                const isCanvasEdge = Boolean(guide.isCanvasEdge);

                // Theme selection based on guide type
                const lineStyle = isCanvasCenter
                  ? 'bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,1)]'
                  : isCanvasEdge
                  ? 'bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,1)]'
                  : 'bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.9)]';

                const dotStyle = isCanvasCenter
                  ? 'bg-cyan-500 border-cyan-100 shadow-[0_0_6px_rgba(6,182,212,0.9)]'
                  : isCanvasEdge
                  ? 'bg-emerald-500 border-emerald-100 shadow-[0_0_6px_rgba(16,185,129,0.9)]'
                  : 'bg-fuchsia-600 border-white shadow-md';

                const badgeBg = isCanvasCenter
                  ? 'bg-cyan-950/95 text-cyan-200 border-cyan-400/90 shadow-[0_0_14px_rgba(6,182,212,0.4)]'
                  : isCanvasEdge
                  ? 'bg-emerald-950/95 text-emerald-200 border-emerald-400/90 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                  : 'bg-fuchsia-950/95 text-fuchsia-200 border-fuchsia-400/80 shadow-xl';

                if (isVertical) {
                  const lineXPx = guide.positionMm * pxPerMm;
                  const topPx = Math.max(0, guide.startMm * pxPerMm);
                  const bottomPx = Math.min(labelHeightPx, guide.endMm * pxPerMm);
                  const heightPx = Math.max(12, bottomPx - topPx);

                  return (
                    <div
                      key={guide.id}
                      className="absolute pointer-events-none z-45"
                      style={{
                        left: `${lineXPx}px`,
                        top: `${topPx}px`,
                        width: '0px',
                        height: `${heightPx}px`,
                      }}
                    >
                      {/* Vertical Guideline */}
                      <div className={`absolute inset-y-0 -left-[1px] w-[2px] ${lineStyle}`} />

                      {/* Source Indicator Dot */}
                      <div
                        className={`absolute -left-[5px] -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center z-10 ${dotStyle}`}
                        style={{ top: `${(guide.sourceCenter.y - guide.startMm) * pxPerMm}px` }}
                      >
                        <div className="w-1 h-1 bg-white rounded-full" />
                      </div>

                      {/* Target Indicator Dot */}
                      {!isCanvasEdge && (
                        <div
                          className={`absolute -left-[5px] -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center z-10 ${dotStyle}`}
                          style={{ top: `${(guide.targetCenter.y - guide.startMm) * pxPerMm}px` }}
                        >
                          <div className="w-1 h-1 bg-white rounded-full" />
                        </div>
                      )}

                      {/* Floating Alignment Badge */}
                      <div
                        className={`absolute left-2.5 -translate-y-1/2 border px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center space-x-1.5 whitespace-nowrap z-20 pointer-events-none ${badgeBg}`}
                        style={{ top: `${((guide.sourceCenter.y + guide.targetCenter.y) / 2 - guide.startMm) * pxPerMm}px` }}
                      >
                        {isCanvasCenter ? (
                          <Target className="w-3 h-3 text-cyan-400 shrink-0 animate-pulse" />
                        ) : isCanvasEdge ? (
                          <Magnet className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <AlignCenter className="w-3 h-3 text-fuchsia-400 shrink-0" />
                        )}
                        <span className="font-bold tracking-tight">
                          {isCanvasCenter
                            ? `Canvas Midline: ${guide.positionMm.toFixed(1)}mm`
                            : isCanvasEdge
                            ? `${guide.targetName}: ${guide.positionMm.toFixed(1)}mm`
                            : `Center X: ${guide.positionMm.toFixed(1)}mm`}
                        </span>
                        {!isCanvasCenter && !isCanvasEdge && guide.targetName && (
                          <span className="text-fuchsia-300/80 font-normal">({guide.targetName})</span>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // Horizontal Guideline (constant y)
                  const lineYPx = guide.positionMm * pxPerMm;
                  const leftPx = Math.max(0, guide.startMm * pxPerMm);
                  const rightPx = Math.min(labelWidthPx, guide.endMm * pxPerMm);
                  const widthPx = Math.max(12, rightPx - leftPx);

                  return (
                    <div
                      key={guide.id}
                      className="absolute pointer-events-none z-45"
                      style={{
                        left: `${leftPx}px`,
                        top: `${lineYPx}px`,
                        width: `${widthPx}px`,
                        height: '0px',
                      }}
                    >
                      {/* Horizontal Guideline */}
                      <div className={`absolute inset-x-0 -top-[1px] h-[2px] ${lineStyle}`} />

                      {/* Source Indicator Dot */}
                      <div
                        className={`absolute -top-[5px] -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center z-10 ${dotStyle}`}
                        style={{ left: `${(guide.sourceCenter.x - guide.startMm) * pxPerMm}px` }}
                      >
                        <div className="w-1 h-1 bg-white rounded-full" />
                      </div>

                      {/* Target Indicator Dot */}
                      {!isCanvasEdge && (
                        <div
                          className={`absolute -top-[5px] -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 flex items-center justify-center z-10 ${dotStyle}`}
                          style={{ left: `${(guide.targetCenter.x - guide.startMm) * pxPerMm}px` }}
                        >
                          <div className="w-1 h-1 bg-white rounded-full" />
                        </div>
                      )}

                      {/* Floating Alignment Badge */}
                      <div
                        className={`absolute -top-7 -translate-x-1/2 border px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center space-x-1.5 whitespace-nowrap z-20 pointer-events-none ${badgeBg}`}
                        style={{ left: `${((guide.sourceCenter.x + guide.targetCenter.x) / 2 - guide.startMm) * pxPerMm}px` }}
                      >
                        {isCanvasCenter ? (
                          <Target className="w-3 h-3 text-cyan-400 shrink-0 animate-pulse" />
                        ) : isCanvasEdge ? (
                          <Magnet className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                          <AlignCenterVertical className="w-3 h-3 text-fuchsia-400 shrink-0" />
                        )}
                        <span className="font-bold tracking-tight">
                          {isCanvasCenter
                            ? `Canvas Midline: ${guide.positionMm.toFixed(1)}mm`
                            : isCanvasEdge
                            ? `${guide.targetName}: ${guide.positionMm.toFixed(1)}mm`
                            : `Center Y: ${guide.positionMm.toFixed(1)}mm`}
                        </span>
                        {!isCanvasCenter && !isCanvasEdge && guide.targetName && (
                          <span className="text-fuchsia-300/80 font-normal">({guide.targetName})</span>
                        )}
                      </div>
                    </div>
                  );
                }
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
          fontFamily: getFontCssStack(textObj.style.fontFamily),
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
    const qrDataUrl = barcodeCache.get(cacheKey) || qrCache[cacheKey];

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
