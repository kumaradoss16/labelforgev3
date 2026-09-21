import React from 'react';
import {
  Scissors,
  Copy,
  Clipboard,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Barcode as BarcodeIcon,
  QrCode,
  Grid,
  Square,
  Circle,
  Minus,
  Type,
  Image as ImageIcon,
  Layers,
  Database,
  Play,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  Trash2,
  Settings,
  HelpCircle,
  FileSpreadsheet,
  Cpu,
  Printer,
  Sparkles,
  ArrowRightLeft,
  CheckSquare,
  Server,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  History
} from 'lucide-react';
import { LabelObject, TextLabelObject, BarcodeLabelObject, ShapeLabelObject, LabelDocument } from '../../types/label';
import { FONT_GROUPS } from '../../services/fontFamilies';

export type RibbonTab = 'home' | 'insert' | 'modify' | 'view' | 'data' | 'automation' | 'admin' | 'help';

interface RibbonProps {
  activeTab?: RibbonTab;
  setActiveTab?: (tab: RibbonTab) => void;
  selectedObject?: LabelObject | null;
  onUpdateObject?: (updated: Partial<LabelObject>) => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onAddObject?: (type: any, extraProps?: any) => void;
  onOpenBarcodeWizard?: (initialSymbology?: string) => void;
  onOpenPrintDialog?: () => void;
  onOpenPrintPreview?: () => void;
  onOpenDatabaseManager?: () => void;
  onOpenFontManager?: () => void;
  onOpenWorkflowDesigner?: () => void;
  onOpenShortcuts?: () => void;
  showRulers?: boolean;
  setShowRulers?: (val: boolean) => void;
  showGrid?: boolean;
  setShowGrid?: (val: boolean) => void;
  snapToGrid?: boolean;
  setSnapToGrid?: (val: boolean) => void;
  zoom?: number;
  setZoom?: (val: number | ((prev: number) => number)) => void;
  unit?: 'mm' | 'in' | 'cm' | 'pt';
  setUnit?: (u: 'mm' | 'in' | 'cm' | 'pt') => void;
  showGuides?: boolean;
  setShowGuides?: (val: boolean) => void;
  snapToGuides?: boolean;
  setSnapToGuides?: (val: boolean) => void;
  // Database record stepping
  recordIndex?: number;
  totalRecords?: number;
  onPrevRecord?: () => void;
  onNextRecord?: () => void;

  // Additional optional props passed from App
  document?: LabelDocument;
  onAddText?: () => void;
  onOpenWorkflowManager?: () => void;
  onOpenPrintModal?: () => void;
  onSave?: () => void;
  onOpen?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onAlign?: (alignment: any) => void;
  onZOrder?: (action: any) => void;
  onSelectTemplate?: (template: any) => void;
  onOpenBarTenderManager?: () => void;
  onOpenPrintHistory?: () => void;
}

export const Ribbon: React.FC<RibbonProps> = (props) => {
  const [internalTab, setInternalTab] = React.useState<RibbonTab>('home');
  const activeTab = props.activeTab ?? internalTab;
  const setActiveTab = (tab: RibbonTab) => {
    if (typeof props.setActiveTab === 'function') {
      props.setActiveTab(tab);
    }
    setInternalTab(tab);
  };

  const selectedObject = props.selectedObject ?? null;
  const onUpdateObject = props.onUpdateObject ?? (() => {});
  const onDeleteSelected = props.onDeleteSelected ?? props.onDelete ?? (() => {});
  const onDuplicateSelected = props.onDuplicateSelected ?? props.onDuplicate ?? (() => {});
  const onBringForward = props.onBringForward ?? (() => props.onZOrder?.('forward')) ?? (() => {});
  const onSendBackward = props.onSendBackward ?? (() => props.onZOrder?.('backward')) ?? (() => {});
  const onAddObject = (type: any, extraProps?: any) => {
    if (typeof props.onAddObject === 'function') {
      props.onAddObject(type, extraProps);
      return;
    }
    if (type === 'text') {
      props.onAddText?.();
    }
  };
  const onOpenBarcodeWizard = props.onOpenBarcodeWizard ?? (() => {});
  const onOpenPrintDialog = props.onOpenPrintDialog ?? props.onOpenPrintModal ?? (() => {});
  const onOpenPrintPreview = props.onOpenPrintPreview ?? props.onOpenPrintModal ?? (() => {});
  const onOpenBarTenderManager = props.onOpenBarTenderManager ?? (() => {});
  const onOpenDatabaseManager = props.onOpenDatabaseManager ?? (() => {});
  const onOpenFontManager = props.onOpenFontManager ?? (() => {});
  const onOpenWorkflowDesigner = props.onOpenWorkflowDesigner ?? props.onOpenWorkflowManager ?? (() => {});
  const onOpenShortcuts = props.onOpenShortcuts ?? (() => {});
  const showRulers = props.showRulers ?? true;
  const setShowRulers = props.setShowRulers ?? (() => {});
  const showGrid = props.showGrid ?? true;
  const setShowGrid = props.setShowGrid ?? (() => {});
  const snapToGrid = props.snapToGrid ?? true;
  const setSnapToGrid = props.setSnapToGrid ?? (() => {});
  const showGuides = props.showGuides ?? true;
  const setShowGuides = props.setShowGuides ?? (() => {});
  const snapToGuides = props.snapToGuides ?? true;
  const setSnapToGuides = props.setSnapToGuides ?? (() => {});
  const zoom = props.zoom ?? 1.25;
  const setZoom = props.setZoom ?? (() => {});
  const unit = props.unit ?? 'mm';
  const setUnit = props.setUnit ?? (() => {});
  const recordIndex = props.recordIndex ?? 0;
  const totalRecords = props.totalRecords ?? 0;
  const onPrevRecord = props.onPrevRecord ?? (() => {});
  const onNextRecord = props.onNextRecord ?? (() => {});
  const onAlign = props.onAlign;
  const onZOrder = props.onZOrder;
  const isText = selectedObject && (selectedObject.type === 'text' || selectedObject.type === 'rich-text');
  const textObj = isText ? (selectedObject as TextLabelObject) : null;
  const isBarcode = selectedObject && (selectedObject.type === 'barcode' || selectedObject.type === 'qrcode' || selectedObject.type === 'datamatrix');
  const barcodeObj = isBarcode ? (selectedObject as BarcodeLabelObject) : null;

  return (
    <div className="bg-[#242730] border-b border-[#323642] text-[#d6d8db] select-none shadow-sm flex flex-col">
      {/* 1. Ribbon Tabs Header */}
      <div className="flex items-center px-2 pt-1 border-b border-[#30343f] space-x-0.5 text-xs">
        {[
          { id: 'home', label: 'Home' },
          { id: 'insert', label: 'Insert' },
          { id: 'modify', label: 'Modify' },
          { id: 'view', label: 'View' },
          { id: 'data', label: 'Data Sources' },
          { id: 'automation', label: 'Automation' },
          { id: 'admin', label: 'Printers & Admin' },
          { id: 'help', label: 'Help' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as RibbonTab)}
            className={`px-3.5 py-1 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-white border-[#3b82f6] bg-[#2a2e39] rounded-t-sm'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#282c36]'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Contextual Badge if object is selected */}
        {selectedObject && (
          <div className="ml-4 px-2 py-0.5 rounded bg-blue-900/40 border border-blue-600/40 text-blue-300 text-[11px] flex items-center space-x-1.5 animate-in fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="font-semibold">{selectedObject.name}</span>
            <span className="text-gray-400 text-[10px]">({selectedObject.type.toUpperCase()})</span>
          </div>
        )}
      </div>

      {/* 2. Ribbon Content Ribbon Strip */}
      <div className="h-24 px-3 py-1.5 flex items-stretch space-x-3 overflow-x-auto text-xs">
        {/* ======================= HOME TAB ======================= */}
        {activeTab === 'home' && (
          <>
            {/* Clipboard Group */}
            <div className="flex flex-col justify-between border-r border-[#353945] pr-3">
              <div className="flex items-center space-x-1 flex-1">
                <button
                  onClick={onDuplicateSelected}
                  disabled={!selectedObject}
                  className="flex flex-col items-center justify-center px-2 py-1 rounded hover:bg-[#2f3440] disabled:opacity-30 text-gray-300 hover:text-white"
                  title="Duplicate Object (Ctrl+D)"
                >
                  <Copy className="w-4 h-4 text-blue-400 mb-0.5" />
                  <span className="text-[10px]">Duplicate</span>
                </button>
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={onDeleteSelected}
                    disabled={!selectedObject}
                    className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-red-950/60 text-gray-300 hover:text-red-300 disabled:opacity-30"
                    title="Delete (Del)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[10px]">Delete</span>
                  </button>
                  <button
                    onClick={() => onUpdateObject({ locked: !selectedObject?.locked })}
                    disabled={!selectedObject}
                    className="flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-[#2f3440] text-gray-300 hover:text-white disabled:opacity-30"
                    title="Lock/Unlock Position"
                  >
                    {selectedObject?.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-gray-400" />}
                    <span className="text-[10px]">{selectedObject?.locked ? 'Locked' : 'Lock'}</span>
                  </button>
                </div>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 text-center mt-1">Clipboard</span>
            </div>

            {/* Typography & Multilingual Font Group */}
            <div className="flex flex-col justify-between border-r border-[#353945] pr-3">
              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center space-x-1.5">
                  {/* Font family selector */}
                  <select
                    disabled={!isText}
                    value={textObj?.style.fontFamily || 'Segoe UI'}
                    onChange={(e) => {
                      if (textObj) {
                        onUpdateObject({ style: { ...textObj.style, fontFamily: e.target.value } });
                      }
                    }}
                    className="bg-[#1b1d24] border border-[#3b404d] rounded px-1.5 py-0.5 text-xs text-white disabled:opacity-40 w-44 focus:outline-none focus:border-blue-500"
                    title="Select Standard Windows TrueType (TTF) or OpenType (OTF) Font Family"
                  >
                    {FONT_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label} className="bg-[#181a22] text-gray-400 font-semibold">
                        {group.fonts.map((f) => (
                          <option key={f.family} value={f.family} className="bg-[#1e2129] text-white">
                            {f.family} [{f.formatCode}]
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {/* Font size */}
                  <select
                    disabled={!isText}
                    value={textObj?.style.fontSize || 10}
                    onChange={(e) => {
                      if (textObj) {
                        onUpdateObject({ style: { ...textObj.style, fontSize: Number(e.target.value) } });
                      }
                    }}
                    className="bg-[#1b1d24] border border-[#3b404d] rounded px-1 py-0.5 text-xs text-white disabled:opacity-40 w-14 focus:outline-none focus:border-blue-500"
                  >
                    {[6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48].map(s => (
                      <option key={s} value={s}>{s} pt</option>
                    ))}
                  </select>

                  <button
                    onClick={onOpenFontManager}
                    className="px-1.5 py-0.5 rounded bg-[#2e3340] hover:bg-[#394050] text-[10px] text-purple-300 font-medium border border-purple-800/40"
                    title="Open Font Manager & Unicode Inspector"
                  >
                    Fonts...
                  </button>
                </div>

                {/* Bold, Italic, Underline, Alignment & RTL */}
                <div className="flex items-center space-x-1">
                  <button
                    disabled={!isText}
                    onClick={() => textObj && onUpdateObject({ style: { ...textObj.style, fontWeight: textObj.style.fontWeight === 'bold' ? 'normal' : 'bold' } })}
                    className={`p-1 rounded ${textObj?.style.fontWeight === 'bold' ? 'bg-blue-600 text-white' : 'hover:bg-[#2f3440] text-gray-300'} disabled:opacity-30`}
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={!isText}
                    onClick={() => textObj && onUpdateObject({ style: { ...textObj.style, fontStyle: textObj.style.fontStyle === 'italic' ? 'normal' : 'italic' } })}
                    className={`p-1 rounded ${textObj?.style.fontStyle === 'italic' ? 'bg-blue-600 text-white' : 'hover:bg-[#2f3440] text-gray-300'} disabled:opacity-30`}
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={!isText}
                    onClick={() => textObj && onUpdateObject({ style: { ...textObj.style, underline: !textObj.style.underline } })}
                    className={`p-1 rounded ${textObj?.style.underline ? 'bg-blue-600 text-white' : 'hover:bg-[#2f3440] text-gray-300'} disabled:opacity-30`}
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-3 w-px bg-[#353945] mx-0.5" />

                  <button
                    disabled={!isText}
                    onClick={() => textObj && onUpdateObject({ style: { ...textObj.style, alignment: 'left' } })}
                    className={`p-1 rounded ${textObj?.style.alignment === 'left' ? 'bg-[#3b404d] text-white' : 'hover:bg-[#2f3440] text-gray-300'} disabled:opacity-30`}
                    title="Align Left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={!isText}
                    onClick={() => textObj && onUpdateObject({ style: { ...textObj.style, alignment: 'center' } })}
                    className={`p-1 rounded ${textObj?.style.alignment === 'center' ? 'bg-[#3b404d] text-white' : 'hover:bg-[#2f3440] text-gray-300'} disabled:opacity-30`}
                    title="Align Center"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={!isText}
                    onClick={() => textObj && onUpdateObject({ style: { ...textObj.style, alignment: 'right' } })}
                    className={`p-1 rounded ${textObj?.style.alignment === 'right' ? 'bg-[#3b404d] text-white' : 'hover:bg-[#2f3440] text-gray-300'} disabled:opacity-30`}
                    title="Align Right"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-3 w-px bg-[#353945] mx-0.5" />

                  {/* Text direction LTR / RTL */}
                  <button
                    disabled={!isText}
                    onClick={() => textObj && onUpdateObject({ style: { ...textObj.style, direction: textObj.style.direction === 'rtl' ? 'ltr' : 'rtl' } })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${textObj?.style.direction === 'rtl' ? 'bg-amber-600 text-white' : 'hover:bg-[#2f3440] text-gray-300'} disabled:opacity-30`}
                    title="Toggle RTL (Arabic/Hebrew) Text Direction"
                  >
                    {textObj?.style.direction === 'rtl' ? 'RTL ⇄' : 'LTR ⇄'}
                  </button>
                </div>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 text-center mt-1">Font &amp; Multilingual</span>
            </div>

            {/* Barcode Quick Gallery Group */}
            <div className="flex flex-col justify-between border-r border-[#353945] pr-3">
              <div className="flex items-center space-x-1.5 flex-1">
                <button
                  onClick={() => onAddObject('barcode', { symbology: 'code128' })}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#2f3440] text-gray-200"
                  title="Insert Standard Code 128 (1D)"
                >
                  <BarcodeIcon className="w-5 h-5 text-blue-400 mb-0.5" />
                  <span className="text-[10px]">Code 128</span>
                </button>
                <button
                  onClick={() => onAddObject('qrcode')}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#2f3440] text-gray-200"
                  title="Insert 2D QR Code"
                >
                  <QrCode className="w-5 h-5 text-emerald-400 mb-0.5" />
                  <span className="text-[10px]">QR Code</span>
                </button>
                <button
                  onClick={() => onAddObject('datamatrix')}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#2f3440] text-gray-200"
                  title="Insert Data Matrix ECC 200 (Pharma/DSCSA)"
                >
                  <Grid className="w-5 h-5 text-purple-400 mb-0.5" />
                  <span className="text-[10px]">Data Matrix</span>
                </button>
                <button
                  onClick={() => onAddObject('barcode', { symbology: 'gs1-128', value: '(01)00614141999996(10)LOT-X99(17)280630' })}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#2f3440] text-gray-200"
                  title="Insert GS1-128 with Application Identifiers"
                >
                  <div className="w-5 h-5 rounded border border-amber-400/80 flex items-center justify-center text-[8px] font-black text-amber-300 mb-0.5">
                    GS1
                  </div>
                  <span className="text-[10px]">GS1-128</span>
                </button>
                <button
                  onClick={() => onOpenBarcodeWizard()}
                  className="flex flex-col items-center justify-center p-1.5 rounded bg-[#2c313d] hover:bg-[#353b49] text-blue-300 border border-blue-600/30"
                  title="Open Full Barcode Catalog (25+ Symbologies)"
                >
                  <Sparkles className="w-4 h-4 text-blue-400 mb-0.5" />
                  <span className="text-[10px] font-semibold">Catalog...</span>
                </button>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 text-center mt-1">Barcode Gallery</span>
            </div>

            {/* Shapes & Objects Group */}
            <div className="flex flex-col justify-between border-r border-[#353945] pr-3">
              <div className="flex items-center space-x-1 flex-1">
                <button
                  onClick={() => onAddObject('text')}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#2f3440] text-gray-200"
                  title="Insert Text Box"
                >
                  <Type className="w-4 h-4 text-amber-400 mb-0.5" />
                  <span className="text-[10px]">Text</span>
                </button>
                <button
                  onClick={() => onAddObject('rect')}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#2f3440] text-gray-200"
                  title="Insert Rectangle"
                >
                  <Square className="w-4 h-4 text-cyan-400 mb-0.5" />
                  <span className="text-[10px]">Rect</span>
                </button>
                <button
                  onClick={() => onAddObject('line')}
                  className="flex flex-col items-center justify-center p-1.5 rounded hover:bg-[#2f3440] text-gray-200"
                  title="Insert Dividing Line"
                >
                  <Minus className="w-4 h-4 text-gray-300 mb-0.5" />
                  <span className="text-[10px]">Line</span>
                </button>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 text-center mt-1">Shapes</span>
            </div>

            {/* Arrange & Z-Order Group */}
            <div className="flex flex-col justify-between border-r border-[#353945] pr-3">
              <div className="flex flex-col space-y-1 justify-center flex-1">
                <button
                  onClick={onBringForward}
                  disabled={!selectedObject}
                  className="px-2 py-0.5 rounded bg-[#2a2e38] hover:bg-[#333845] disabled:opacity-30 text-[10px] text-gray-200"
                >
                  Bring Forward
                </button>
                <button
                  onClick={onSendBackward}
                  disabled={!selectedObject}
                  className="px-2 py-0.5 rounded bg-[#2a2e38] hover:bg-[#333845] disabled:opacity-30 text-[10px] text-gray-200"
                >
                  Send Backward
                </button>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-gray-500 text-center mt-1">Arrange</span>
            </div>

            {/* Align & Center Group */}
            {onAlign && (
              <div className="flex flex-col justify-between border-r border-[#353945] pr-3">
                <div className="flex flex-col space-y-1 flex-1 justify-center">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onAlign('left')}
                      disabled={!selectedObject}
                      className="p-1 rounded hover:bg-[#2f3440] disabled:opacity-30 text-gray-300 hover:text-white"
                      title="Align Left Edge"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onAlign('center')}
                      disabled={!selectedObject}
                      className="p-1 rounded hover:bg-[#2f3440] disabled:opacity-30 text-gray-300 hover:text-white"
                      title="Align Horizontal Center"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onAlign('right')}
                      disabled={!selectedObject}
                      className="p-1 rounded hover:bg-[#2f3440] disabled:opacity-30 text-gray-300 hover:text-white"
                      title="Align Right Edge"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onAlign('top')}
                      disabled={!selectedObject}
                      className="p-1 rounded hover:bg-[#2f3440] disabled:opacity-30 text-gray-300 hover:text-white"
                      title="Align Top Edge"
                    >
                      <AlignStartVertical className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onAlign('middle')}
                      disabled={!selectedObject}
                      className="p-1 rounded hover:bg-[#2f3440] disabled:opacity-30 text-gray-300 hover:text-white"
                      title="Align Vertical Center"
                    >
                      <AlignCenterVertical className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onAlign('bottom')}
                      disabled={!selectedObject}
                      className="p-1 rounded hover:bg-[#2f3440] disabled:opacity-30 text-gray-300 hover:text-white"
                      title="Align Bottom Edge"
                    >
                      <AlignEndVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-gray-500 text-center mt-1">Align</span>
              </div>
            )}

            {/* Print Quick Action & Batch History */}
            <div className="flex items-center space-x-1 border-l border-[#353945] pl-3">
              <div className="flex flex-col justify-between h-full">
                <button
                  onClick={onOpenPrintDialog}
                  className="flex flex-col items-center justify-center px-3 py-1 rounded bg-emerald-800/40 hover:bg-emerald-700/60 border border-emerald-600/50 text-emerald-200 transition-colors flex-1"
                  title="Send to Thermal or Spooler (Ctrl+P)"
                >
                  <Printer className="w-5 h-5 text-emerald-400 mb-0.5" />
                  <span className="text-[10px] font-bold">Print Job</span>
                </button>
                <span className="text-[9px] uppercase tracking-wider text-emerald-500 text-center mt-1">Dispatch</span>
              </div>

              {props.onOpenPrintHistory && (
                <div className="flex flex-col justify-between h-full">
                  <button
                    onClick={props.onOpenPrintHistory}
                    className="flex flex-col items-center justify-center px-2.5 py-1 rounded bg-blue-900/30 hover:bg-blue-800/50 border border-blue-600/40 text-blue-200 transition-colors flex-1"
                    title="View Batch Print History & Re-Print to Industrial Hardware"
                  >
                    <History className="w-5 h-5 text-blue-400 mb-0.5" />
                    <span className="text-[10px] font-bold">Job History</span>
                  </button>
                  <span className="text-[9px] uppercase tracking-wider text-blue-400 text-center mt-1">Re-Print</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* ======================= INSERT TAB ======================= */}
        {activeTab === 'insert' && (
          <div className="flex items-center space-x-2">
            <button onClick={() => onAddObject('text')} className="flex flex-col items-center p-2 rounded bg-[#2b2f3a] hover:bg-[#373c49]">
              <Type className="w-5 h-5 text-amber-400 mb-1" />
              <span className="text-[10px]">Text Box</span>
            </button>
            <button onClick={() => onAddObject('barcode', { symbology: 'code128' })} className="flex flex-col items-center p-2 rounded bg-[#2b2f3a] hover:bg-[#373c49]">
              <BarcodeIcon className="w-5 h-5 text-blue-400 mb-1" />
              <span className="text-[10px]">1D Barcode</span>
            </button>
            <button onClick={() => onAddObject('qrcode')} className="flex flex-col items-center p-2 rounded bg-[#2b2f3a] hover:bg-[#373c49]">
              <QrCode className="w-5 h-5 text-emerald-400 mb-1" />
              <span className="text-[10px]">2D QR Code</span>
            </button>
            <button onClick={() => onAddObject('datamatrix')} className="flex flex-col items-center p-2 rounded bg-[#2b2f3a] hover:bg-[#373c49]">
              <Grid className="w-5 h-5 text-purple-400 mb-1" />
              <span className="text-[10px]">Data Matrix</span>
            </button>
            <button onClick={() => onOpenBarcodeWizard('gs1-128')} className="flex flex-col items-center p-2 rounded bg-[#2b2f3a] hover:bg-[#373c49]">
              <Sparkles className="w-5 h-5 text-amber-400 mb-1" />
              <span className="text-[10px]">GS1 Assistant</span>
            </button>
            <button onClick={() => onAddObject('rect')} className="flex flex-col items-center p-2 rounded bg-[#2b2f3a] hover:bg-[#373c49]">
              <Square className="w-5 h-5 text-cyan-400 mb-1" />
              <span className="text-[10px]">Rectangle</span>
            </button>
            <button onClick={() => onAddObject('line')} className="flex flex-col items-center p-2 rounded bg-[#2b2f3a] hover:bg-[#373c49]">
              <Minus className="w-5 h-5 text-gray-400 mb-1" />
              <span className="text-[10px]">Divider Line</span>
            </button>
            <button onClick={() => onAddObject('text', { text: '{{SERIAL}}', name: 'Dynamic Counter' })} className="flex flex-col items-center p-2 rounded bg-[#2b2f3a] hover:bg-[#373c49]">
              <Cpu className="w-5 h-5 text-rose-400 mb-1" />
              <span className="text-[10px]">Serial Counter</span>
            </button>
            <button onClick={() => onAddObject('text', { text: 'EXP: {{DATE_YYMMDD}}', name: 'Date Variable' })} className="flex flex-col items-center p-2 rounded bg-[#2b2f3a] hover:bg-[#373c49]">
              <span className="font-mono text-sm font-bold text-teal-400">YYMM</span>
              <span className="text-[10px]">Date Token</span>
            </button>
          </div>
        )}

        {/* ======================= MODIFY TAB ======================= */}
        {activeTab === 'modify' && (
          <div className="flex items-center space-x-3">
            {selectedObject ? (
              <>
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-gray-400">Position (mm):</span>
                  <div className="flex items-center space-x-1">
                    <span>X:</span>
                    <input
                      type="number"
                      value={Math.round(selectedObject.x)}
                      onChange={(e) => onUpdateObject({ x: Number(e.target.value) })}
                      className="w-14 bg-[#1b1d24] border border-[#3b404d] rounded px-1 py-0.5 text-xs text-white"
                    />
                    <span>Y:</span>
                    <input
                      type="number"
                      value={Math.round(selectedObject.y)}
                      onChange={(e) => onUpdateObject({ y: Number(e.target.value) })}
                      className="w-14 bg-[#1b1d24] border border-[#3b404d] rounded px-1 py-0.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-gray-400">Dimensions (mm):</span>
                  <div className="flex items-center space-x-1">
                    <span>W:</span>
                    <input
                      type="number"
                      value={Math.round(selectedObject.width)}
                      onChange={(e) => onUpdateObject({ width: Math.max(5, Number(e.target.value)) })}
                      className="w-14 bg-[#1b1d24] border border-[#3b404d] rounded px-1 py-0.5 text-xs text-white"
                    />
                    <span>H:</span>
                    <input
                      type="number"
                      value={Math.round(selectedObject.height)}
                      onChange={(e) => onUpdateObject({ height: Math.max(5, Number(e.target.value)) })}
                      className="w-14 bg-[#1b1d24] border border-[#3b404d] rounded px-1 py-0.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1 border-r border-[#353945] pr-3">
                  <span className="text-[10px] text-gray-400">Transform:</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onUpdateObject({ rotation: ((selectedObject.rotation || 0) + 90) % 360 })}
                      className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200 flex items-center space-x-1 text-xs"
                      title="Rotate 90 Degrees"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                      <span>{selectedObject.rotation || 0}°</span>
                    </button>
                    <button
                      onClick={onDuplicateSelected}
                      className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200 text-xs"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={onDeleteSelected}
                      className="p-1.5 rounded bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Alignment & Distribution */}
                {onAlign && (
                  <div className="flex flex-col space-y-1 border-r border-[#353945] pr-3">
                    <span className="text-[10px] text-gray-400">Align to Canvas:</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => onAlign('left')}
                        className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200"
                        title="Align Left (Margin)"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onAlign('center')}
                        className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200"
                        title="Center Horizontally"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onAlign('right')}
                        className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200"
                        title="Align Right (Margin)"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-4 w-px bg-[#353945] mx-0.5" />
                      <button
                        onClick={() => onAlign('top')}
                        className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200"
                        title="Align Top (Margin)"
                      >
                        <AlignStartVertical className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onAlign('middle')}
                        className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200"
                        title="Center Vertically"
                      >
                        <AlignCenterVertical className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onAlign('bottom')}
                        className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200"
                        title="Align Bottom (Margin)"
                      >
                        <AlignEndVertical className="w-3.5 h-3.5" />
                      </button>
                      <div className="h-4 w-px bg-[#353945] mx-0.5" />
                      <button
                        onClick={() => onAlign('center-both')}
                        className="px-2 py-1 rounded bg-[#2a2e39] hover:bg-blue-600/40 text-blue-300 text-[10px] font-medium border border-blue-600/30"
                        title="Center Horizontally & Vertically"
                      >
                        Center Page
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <span className="text-gray-400 italic">Select an object on the canvas to inspect and modify geometry.</span>
            )}
          </div>
        )}

        {/* ======================= VIEW TAB ======================= */}
        {activeTab === 'view' && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 border-r border-[#353945] pr-3">
              <button
                onClick={() => setZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs w-12 text-center text-blue-300">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(4, Number((z + 0.25).toFixed(2))))}
                className="p-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(1.0)}
                className="px-2 py-1 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-[10px] text-gray-200"
              >
                100%
              </button>
              <button
                onClick={() => setZoom(1.5)}
                className="px-2 py-1 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-[10px] text-gray-200"
              >
                Fit
              </button>
            </div>

            <div className="flex items-center space-x-2 border-r border-[#353945] pr-3">
              <label className="flex items-center space-x-1 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={showRulers}
                  onChange={(e) => setShowRulers(e.target.checked)}
                  className="rounded bg-[#1b1d24] border-gray-600 text-blue-600"
                />
                <span>Rulers</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(e) => setShowGuides?.(e.target.checked)}
                  className="rounded bg-[#1b1d24] border-gray-600 text-cyan-600"
                />
                <span>Guides</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                  className="rounded bg-[#1b1d24] border-gray-600 text-blue-600"
                />
                <span>Grid</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="rounded bg-[#1b1d24] border-gray-600 text-amber-600"
                />
                <span>Snap Grid</span>
              </label>
              <label className="flex items-center space-x-1 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={snapToGuides}
                  onChange={(e) => setSnapToGuides?.(e.target.checked)}
                  className="rounded bg-[#1b1d24] border-gray-600 text-cyan-600"
                />
                <span>Snap Guides</span>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-gray-400">Units:</span>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="bg-[#1b1d24] border border-[#3b404d] rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value="mm">Millimeters (mm)</option>
                <option value="cm">Centimeters (cm)</option>
                <option value="in">Inches (in)</option>
                <option value="pt">Points (pt)</option>
              </select>
            </div>
          </div>
        )}

        {/* ======================= DATA SOURCES TAB ======================= */}
        {activeTab === 'data' && (
          <div className="flex items-center space-x-4">
            <button
              onClick={onOpenDatabaseManager}
              className="flex items-center space-x-2 px-3 py-2 rounded bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-700/50 text-cyan-200"
            >
              <Database className="w-5 h-5 text-cyan-400" />
              <div className="text-left">
                <div className="font-semibold text-xs">Database Connection</div>
                <div className="text-[10px] text-cyan-400/80">Connect SQL / CSV / JSON</div>
              </div>
            </button>

            {/* Record Navigator Stepper */}
            <div className="flex items-center space-x-2 bg-[#1c1f26] px-3 py-1.5 rounded border border-[#343845]">
              <span className="text-gray-400 text-xs font-medium">Record:</span>
              <button
                onClick={onPrevRecord}
                disabled={recordIndex <= 0}
                className="px-2 py-0.5 rounded bg-[#2e3340] hover:bg-[#3b4150] disabled:opacity-30 text-white font-bold text-xs"
              >
                ◀ Prev
              </button>
              <span className="font-mono font-bold text-xs text-amber-300">
                {totalRecords > 0 ? `${recordIndex + 1} / ${totalRecords}` : '0 / 0'}
              </span>
              <button
                onClick={onNextRecord}
                disabled={recordIndex >= totalRecords - 1}
                className="px-2 py-0.5 rounded bg-[#2e3340] hover:bg-[#3b4150] disabled:opacity-30 text-white font-bold text-xs"
              >
                Next ▶
              </button>
            </div>

            <button
              onClick={onOpenBarcodeWizard}
              className="flex items-center space-x-2 px-3 py-2 rounded bg-[#2c313d] hover:bg-[#363c4a] border border-[#3e4454] text-gray-200"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="text-xs">Manage Serialization Counters</span>
            </button>
          </div>
        )}

        {/* ======================= AUTOMATION TAB ======================= */}
        {activeTab === 'automation' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenWorkflowDesigner}
              className="flex items-center space-x-2 px-3 py-2 rounded bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-200"
            >
              <Play className="w-5 h-5 text-purple-400" />
              <div className="text-left">
                <div className="font-semibold text-xs">Workflow Designer</div>
                <div className="text-[10px] text-purple-400/80">Configure Triggers, Spoolers &amp; Webhooks</div>
              </div>
            </button>

            <button
              onClick={onOpenBarTenderManager}
              className="flex items-center space-x-2 px-3 py-2 rounded bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/50 text-blue-200"
            >
              <Server className="w-5 h-5 text-blue-400" />
              <div className="text-left">
                <div className="font-semibold text-xs">BarTender® Integration Service</div>
                <div className="text-[10px] text-blue-400/80">REST API, Commander XML, Webhook Spooler</div>
              </div>
            </button>

            <div className="flex items-center space-x-2 bg-[#1b1e25] px-2.5 py-1.5 rounded border border-emerald-900/40 text-emerald-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Auto-Print Spooler: <strong>Active (Watching /spool/inbox)</strong></span>
            </div>
          </div>
        )}

        {/* ======================= ADMIN TAB ======================= */}
        {activeTab === 'admin' && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-2.5 py-1.5 bg-[#1b1e25] rounded border border-[#343845] text-xs">
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Target: <strong>Zebra ZT410 Industrial (300 DPI, ZPL-II)</strong></span>
              <span className="text-emerald-400 font-bold ml-1">● READY</span>
            </div>

            <button
              onClick={onOpenBarTenderManager}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-900/50 hover:bg-blue-800/70 border border-blue-600/60 text-blue-200 text-xs font-semibold"
            >
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>BarTender® Fleet &amp; Queue Manager</span>
            </button>

            <button
              onClick={onOpenPrintDialog}
              className="px-3 py-1.5 rounded bg-[#2e3340] hover:bg-[#383e4d] text-xs text-gray-200"
            >
              Print Dispatch Workstation...
            </button>

            {props.onOpenPrintHistory && (
              <button
                onClick={props.onOpenPrintHistory}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#222734] hover:bg-[#2b3142] border border-[#343b4f] text-xs text-gray-200 font-medium"
              >
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span>Batch Print History &amp; Re-Print...</span>
              </button>
            )}

            <button
              onClick={onOpenFontManager}
              className="px-3 py-1.5 rounded bg-[#2e3340] hover:bg-[#383e4d] text-xs text-gray-200"
            >
              Font Installation &amp; Security...
            </button>
          </div>
        )}

        {/* ======================= HELP TAB ======================= */}
        {activeTab === 'help' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenShortcuts}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200 text-xs"
            >
              <HelpCircle className="w-4 h-4 text-blue-400" />
              <span>Keyboard Shortcuts</span>
            </button>
            <button
              onClick={onOpenBarcodeWizard}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#2b2f3a] hover:bg-[#373c49] text-gray-200 text-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Barcode Symbology Standards Reference</span>
            </button>
            <div className="text-[11px] text-gray-400">
              LabelForge Studio 2026 Enterprise Edition v3.4.0-PROD
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
