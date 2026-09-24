import React from 'react';
import {
  Settings,
  Type,
  Barcode as BarcodeIcon,
  Maximize2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RotateCw,
  Database,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Maximize,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  FileText,
  QrCode,
  ArrowRight,
  Bookmark,
  Image as ImageIcon,
  Upload,
  Link,
  Key
} from 'lucide-react';
import { LabelObject, TextLabelObject, BarcodeLabelObject, ShapeLabelObject, ImageLabelObject, GridSettings } from '../../types/label';
import { DataSourceDefinition, SerializationCounter } from '../../types/database';
import { BARCODE_CATALOG } from '../../services/barcodeEngine';
import { FONT_GROUPS, getFontDefinition } from '../../services/fontFamilies';

interface PropertiesPanelProps {
  selectedObject: LabelObject | null;
  onUpdateObject: (updated: Partial<LabelObject>) => void;
  activeDataSource?: DataSourceDefinition;
  counter?: SerializationCounter;
  onOpenBarcodeWizard: () => void;
  onOpenQRWizard?: () => void;
  onOpenPresets?: () => void;
  onAlign?: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'center-page-h' | 'center-page-v' | 'center-both' | 'distribute-h' | 'distribute-v') => void;
  onZOrder?: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
  gridSettings?: GridSettings;
  onUpdateGridSettings?: (settings: GridSettings) => void;
  // Relative Alignment additions
  alignmentMode?: 'bounds' | 'key';
  onSetAlignmentMode?: (mode: 'bounds' | 'key') => void;
  keyObjectId?: string | null;
  onSetKeyObjectId?: (id: string | null) => void;
  selectedObjectIds?: string[];
  objects?: LabelObject[];
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedObject,
  onUpdateObject,
  activeDataSource,
  counter,
  onOpenBarcodeWizard,
  onOpenQRWizard,
  onOpenPresets,
  onAlign,
  onZOrder,
  gridSettings = {
    style: 'lines',
    interval: 10,
    subInterval: 2,
    dashPattern: 'dashed',
    opacity: 0.2,
    color: '#2563eb'
  },
  onUpdateGridSettings,
  alignmentMode = 'bounds',
  onSetAlignmentMode,
  keyObjectId,
  onSetKeyObjectId,
  selectedObjectIds = [],
  objects = [],
}) => {
  const isMultiSelect = selectedObjectIds.length > 1;

  if (isMultiSelect) {
    const selectedObjs = objects.filter(o => selectedObjectIds.includes(o.id));
    return (
      <aside className="w-full bg-[#1e2129] text-[#c8cbd2] select-none flex flex-col h-full text-xs overflow-y-auto">
        {/* Header */}
        <div className="p-2.5 font-semibold text-[11px] uppercase tracking-wider text-gray-300 border-b border-[#2d313d] flex items-center justify-between bg-[#242832]">
          <div className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Group Properties ({selectedObjs.length} Items)</span>
          </div>
        </div>

        <div className="p-3 space-y-4">
          {/* Relative Alignment mode selection */}
          <section className="space-y-2 bg-[#14161d] p-3 rounded border border-[#2a2d37]">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Alignment Mode Settings
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Align Reference Target:</label>
                <div className="grid grid-cols-2 gap-1 bg-[#1c1e26] p-0.5 rounded border border-[#343a49]">
                  <button
                    type="button"
                    onClick={() => onSetAlignmentMode?.('bounds')}
                    className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                      alignmentMode === 'bounds'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Selection Bounds
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetAlignmentMode?.('key')}
                    className={`py-1 rounded text-[10px] font-semibold transition-colors flex items-center justify-center ${
                      alignmentMode === 'key'
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Key Object
                  </button>
                </div>
              </div>

              {alignmentMode === 'key' && (
                <div className="space-y-1.5 pt-1.5 border-t border-[#252834]">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Designated Key Object Anchor:</span>
                    <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-300 px-1 py-0.2 rounded font-bold">
                      Stationary
                    </span>
                  </div>
                  <select
                    value={keyObjectId || ''}
                    onChange={(e) => onSetKeyObjectId?.(e.target.value)}
                    className="w-full bg-[#1c1e26] border border-[#343a49] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {selectedObjs.map(o => (
                      <option key={o.id} value={o.id} className="bg-[#1e2129]">
                        {o.name} ({o.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-500 leading-normal">
                    Tip: You can also set any item as the key object by clicking on it directly in the canvas.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Group Align Actions */}
          {onAlign && (
            <section className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Align Selection Group
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => onAlign('left')}
                  className="p-2 bg-[#252a37] hover:bg-blue-600/30 text-gray-300 hover:text-white border border-[#323846] rounded flex flex-col items-center justify-center space-y-1 text-[10px]"
                  title="Align Left Edges"
                >
                  <AlignLeft className="w-4 h-4 text-blue-400" />
                  <span>Align Left</span>
                </button>
                <button
                  onClick={() => onAlign('center')}
                  className="p-2 bg-[#252a37] hover:bg-blue-600/30 text-gray-300 hover:text-white border border-[#323846] rounded flex flex-col items-center justify-center space-y-1 text-[10px]"
                  title="Align Center Horizontally"
                >
                  <AlignCenter className="w-4 h-4 text-blue-400" />
                  <span>Align Center</span>
                </button>
                <button
                  onClick={() => onAlign('right')}
                  className="p-2 bg-[#252a37] hover:bg-blue-600/30 text-gray-300 hover:text-white border border-[#323846] rounded flex flex-col items-center justify-center space-y-1 text-[10px]"
                  title="Align Right Edges"
                >
                  <AlignRight className="w-4 h-4 text-blue-400" />
                  <span>Align Right</span>
                </button>
                <button
                  onClick={() => onAlign('top')}
                  className="p-2 bg-[#252a37] hover:bg-blue-600/30 text-gray-300 hover:text-white border border-[#323846] rounded flex flex-col items-center justify-center space-y-1 text-[10px]"
                  title="Align Top Edges"
                >
                  <AlignStartVertical className="w-4 h-4 text-blue-400" />
                  <span>Align Top</span>
                </button>
                <button
                  onClick={() => onAlign('middle')}
                  className="p-2 bg-[#252a37] hover:bg-blue-600/30 text-gray-300 hover:text-white border border-[#323846] rounded flex flex-col items-center justify-center space-y-1 text-[10px]"
                  title="Align Centers Vertically"
                >
                  <AlignCenterVertical className="w-4 h-4 text-blue-400" />
                  <span>Align Middle</span>
                </button>
                <button
                  onClick={() => onAlign('bottom')}
                  className="p-2 bg-[#252a37] hover:bg-blue-600/30 text-gray-300 hover:text-white border border-[#323846] rounded flex flex-col items-center justify-center space-y-1 text-[10px]"
                  title="Align Bottom Edges"
                >
                  <AlignEndVertical className="w-4 h-4 text-blue-400" />
                  <span>Align Bottom</span>
                </button>
              </div>
            </section>
          )}

          {/* Page Centering and Distributions */}
          {onAlign && (
            <section className="space-y-2 pt-2 border-t border-[#2d313d]">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Distribute &amp; Center Layout
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={selectedObjs.length < 3}
                  onClick={() => onAlign('distribute-h')}
                  className="p-1.5 bg-[#1f232e] hover:bg-[#282d3b] disabled:opacity-30 disabled:cursor-not-allowed border border-[#343a4b] text-[10px] rounded flex items-center justify-center space-x-1"
                >
                  <span>Distribute Horiz</span>
                </button>
                <button
                  disabled={selectedObjs.length < 3}
                  onClick={() => onAlign('distribute-v')}
                  className="p-1.5 bg-[#1f232e] hover:bg-[#282d3b] disabled:opacity-30 disabled:cursor-not-allowed border border-[#343a4b] text-[10px] rounded flex items-center justify-center space-x-1"
                >
                  <span>Distribute Vert</span>
                </button>
                <button
                  onClick={() => onAlign('center-page-h')}
                  className="p-1.5 bg-[#1f232e] hover:bg-[#282d3b] border border-[#343a4b] text-[10px] rounded flex items-center justify-center space-x-1 col-span-2"
                >
                  <span>Center Page Horizontally</span>
                </button>
                <button
                  onClick={() => onAlign('center-page-v')}
                  className="p-1.5 bg-[#1f232e] hover:bg-[#282d3b] border border-[#343a4b] text-[10px] rounded flex items-center justify-center space-x-1 col-span-2"
                >
                  <span>Center Page Vertically</span>
                </button>
              </div>
            </section>
          )}

          {/* Quick Info/Guide Box */}
          <section className="p-2.5 rounded bg-blue-950/20 border border-blue-900/40 text-[11px] text-blue-300 leading-relaxed">
            <div className="font-bold flex items-center mb-1 text-blue-200">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 mr-1.5" />
              Relative Alignment Concept
            </div>
            When using <strong className="text-white">Key Object</strong> alignment target, the selected Key Object serves as a fixed reference anchor. It stays stationary while other selected items move to align perfectly with its edge/center.
          </section>
        </div>
      </aside>
    );
  }

  if (!selectedObject) {
    const handleUpdateGrid = (changes: Partial<GridSettings>) => {
      if (onUpdateGridSettings) {
        onUpdateGridSettings({
          ...gridSettings,
          ...changes
        });
      }
    };

    return (
      <aside className="w-full bg-[#1e2129] text-[#c8cbd2] select-none flex flex-col h-full text-xs overflow-y-auto">
        {/* Header */}
        <div className="p-2.5 font-semibold text-[11px] uppercase tracking-wider text-gray-300 border-b border-[#2d313d] flex items-center justify-between bg-[#242832]">
          <div className="flex items-center space-x-1.5">
            <Settings className="w-3.5 h-3.5 text-blue-400" />
            <span>Canvas Properties</span>
          </div>
        </div>

        <div className="p-3 space-y-4">
          {/* General Workspace Info */}
          <section className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Workspace</div>
            <div className="bg-[#14161d] p-2.5 rounded border border-[#2a2d37] space-y-1.5">
              <div className="flex justify-between text-gray-400">
                <span>Selection:</span>
                <span className="text-gray-300 font-medium">None (Canvas Selected)</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-normal">
                Click any element on the canvas to edit its properties, or customize the designer's grid alignment helpers below.
              </p>
            </div>
          </section>

          {/* Grid Style Section */}
          <section className="space-y-2 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Advanced Grid Layout</div>
            
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Grid Pattern Style</label>
                <div className="grid grid-cols-3 gap-1 bg-[#16181f] p-0.5 rounded border border-[#373c49]">
                  {(['lines', 'dots', 'crosses'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleUpdateGrid({ style: s })}
                      className={`py-1 rounded text-[10px] font-medium capitalize transition-colors ${
                        gridSettings.style === s
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Color Picker */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Grid & Alignment Color</label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={gridSettings.color}
                      onChange={(e) => handleUpdateGrid({ color: e.target.value })}
                      className="w-full bg-[#16181f] border border-[#373c49] rounded pl-8 pr-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <div
                      className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: gridSettings.color }}
                    />
                  </div>
                  <input
                    type="color"
                    value={gridSettings.color.startsWith('#') ? gridSettings.color : '#2563eb'}
                    onChange={(e) => handleUpdateGrid({ color: e.target.value })}
                    className="w-8 h-6 bg-transparent border-0 cursor-pointer p-0 shrink-0"
                  />
                </div>
                {/* Preset circles */}
                <div className="flex items-center space-x-1.5 mt-1.5">
                  {['#2563eb', '#64748b', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#ffffff'].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleUpdateGrid({ color })}
                      className={`w-4.5 h-4.5 rounded-full border border-white/15 transition-transform hover:scale-110 ${
                        gridSettings.color === color ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-[#1e2129]' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Grid Opacity Slider (Independent of Background) */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] text-gray-400">Grid Opacity</label>
                  <span className="text-[10px] font-mono text-gray-400">{Math.round(gridSettings.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={gridSettings.opacity * 100}
                  onChange={(e) => handleUpdateGrid({ opacity: parseInt(e.target.value) / 100 })}
                  className="w-full accent-blue-500 cursor-pointer bg-[#16181f] rounded-lg h-1"
                />
              </div>

              {/* Major Interval (Interval) */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Major Grid (mm)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={gridSettings.interval}
                    onChange={(e) => handleUpdateGrid({ interval: Math.max(1, parseInt(e.target.value) || 10) })}
                    className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Sub-Grid Interval</label>
                  <select
                    value={gridSettings.subInterval}
                    onChange={(e) => handleUpdateGrid({ subInterval: parseFloat(e.target.value) })}
                    className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={1}>1 mm</option>
                    <option value={2}>2 mm</option>
                    <option value={5}>5 mm</option>
                    <option value={0.5}>0.5 mm</option>
                    {gridSettings.interval % 5 === 0 && <option value={gridSettings.interval / 5}>1/5 Major ({gridSettings.interval / 5}mm)</option>}
                    {gridSettings.interval % 10 === 0 && <option value={gridSettings.interval / 10}>1/10 Major ({gridSettings.interval / 10}mm)</option>}
                    {gridSettings.interval % 4 === 0 && <option value={gridSettings.interval / 4}>1/4 Major ({gridSettings.interval / 4}mm)</option>}
                    {gridSettings.interval % 2 === 0 && <option value={gridSettings.interval / 2}>1/2 Major ({gridSettings.interval / 2}mm)</option>}
                  </select>
                </div>
              </div>

              {/* Dash Pattern Configuration */}
              <div className="pt-1">
                <label className="text-[10px] text-gray-400 block mb-1">Grid Line Dash Pattern</label>
                <select
                  value={['solid', 'dashed', 'dotted'].includes(gridSettings.dashPattern) ? gridSettings.dashPattern : 'custom'}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      handleUpdateGrid({ dashPattern: '3 1 1 1' });
                    } else {
                      handleUpdateGrid({ dashPattern: val as any });
                    }
                  }}
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 mb-1.5"
                >
                  <option value="solid">Solid Lines</option>
                  <option value="dashed">Dashed Pattern</option>
                  <option value="dotted">Dotted / Dense Pattern</option>
                  <option value="custom">Custom Pattern Array...</option>
                </select>

                {!['solid', 'dashed', 'dotted'].includes(gridSettings.dashPattern) && (
                  <div>
                    <label className="text-[9px] text-gray-500 block mb-0.5">Custom SVG dasharray (e.g. "4 2 1 2")</label>
                    <input
                      type="text"
                      value={gridSettings.dashPattern}
                      onChange={(e) => handleUpdateGrid({ dashPattern: e.target.value })}
                      placeholder="e.g. 5 2 2 2"
                      className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Quick Snap Settings for user convenience */}
          <section className="space-y-1.5 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Canvas Helpers</div>
            <div className="bg-[#14161d] p-2 rounded border border-[#2a2d37] space-y-1">
              <div className="flex justify-between items-center text-[10px] text-gray-400 py-1">
                <span>Rulers Visible:</span>
                <span className="font-semibold text-blue-400">Enabled</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 py-1">
                <span>Guides Snapping:</span>
                <span className="font-semibold text-cyan-400">Active</span>
              </div>
            </div>
          </section>
        </div>
      </aside>
    );
  }

  const isText = selectedObject.type === 'text' || selectedObject.type === 'rich-text';
  const textObj = isText ? (selectedObject as TextLabelObject) : null;
  const isBarcode = selectedObject.type === 'barcode' || selectedObject.type === 'qrcode' || selectedObject.type === 'datamatrix';
  const barcodeObj = isBarcode ? (selectedObject as BarcodeLabelObject) : null;
  const isShape = selectedObject.type === 'rect' || selectedObject.type === 'ellipse' || selectedObject.type === 'line';
  const shapeObj = isShape ? (selectedObject as ShapeLabelObject) : null;
  const isImage = selectedObject.type === 'image';
  const imageObj = isImage ? (selectedObject as ImageLabelObject) : null;

  return (
    <aside className="w-full bg-[#1e2129] text-[#c8cbd2] select-none flex flex-col h-full text-xs overflow-y-auto">
      {/* Header */}
      <div className="p-2.5 font-semibold text-[11px] uppercase tracking-wider text-gray-300 border-b border-[#2d313d] flex items-center justify-between bg-[#242832]">
        <div className="flex items-center space-x-1.5">
          <Settings className="w-3.5 h-3.5 text-blue-400" />
          <span>Object Properties</span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onUpdateObject({ visible: !selectedObject.visible })}
            className="p-1 rounded hover:bg-[#323745] text-gray-400 hover:text-white"
            title={selectedObject.visible ? 'Hide Object' : 'Show Object'}
          >
            {selectedObject.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-red-400" />}
          </button>
          <button
            onClick={() => onUpdateObject({ locked: !selectedObject.locked })}
            className="p-1 rounded hover:bg-[#323745] text-gray-400 hover:text-white"
            title={selectedObject.locked ? 'Unlock Object' : 'Lock Object'}
          >
            {selectedObject.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* 1. GENERAL IDENTITY */}
        <section className="space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">General</div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Object Name</label>
            <input
              type="text"
              value={selectedObject.name}
              onChange={(e) => onUpdateObject({ name: e.target.value })}
              className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
            <span>Type:</span>
            <span className="font-mono text-blue-300 font-bold">{selectedObject.type.toUpperCase()}</span>
          </div>
        </section>

        {/* 2. GEOMETRY & TRANSFORM */}
        <section className="space-y-2 border-t border-[#2d313d] pt-3">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
            <span>Geometry (mm)</span>
            <button
              onClick={() => onUpdateObject({ rotation: ((selectedObject.rotation || 0) + 90) % 360 })}
              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center space-x-0.5"
            >
              <RotateCw className="w-3 h-3" />
              <span>{selectedObject.rotation || 0}°</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">X Position</label>
              <input
                type="number"
                step="0.5"
                value={selectedObject.x}
                onChange={(e) => onUpdateObject({ x: Number(e.target.value) })}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Y Position</label>
              <input
                type="number"
                step="0.5"
                value={selectedObject.y}
                onChange={(e) => onUpdateObject({ y: Number(e.target.value) })}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Width</label>
              <input
                type="number"
                step="0.5"
                value={selectedObject.width}
                onChange={(e) => onUpdateObject({ width: Math.max(2, Number(e.target.value)) })}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Height</label>
              <input
                type="number"
                step="0.5"
                value={selectedObject.height}
                onChange={(e) => onUpdateObject({ height: Math.max(2, Number(e.target.value)) })}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-1.5 py-0.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Quick Alignment to Canvas */}
          {onAlign && (
            <div className="pt-2 border-t border-[#252834]">
              <div className="text-[10px] text-gray-400 mb-1.5 flex items-center justify-between">
                <span>Align to Label</span>
                <button
                  onClick={() => onAlign('center-both')}
                  className="text-[9px] text-blue-400 hover:text-blue-300 underline"
                  title="Center horizontally and vertically on page"
                >
                  Center Both
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1 bg-[#16181f] p-1 rounded border border-[#2d313d]">
                <button
                  onClick={() => onAlign('left')}
                  className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white flex items-center justify-center"
                  title="Align Left (Margin)"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlign('center')}
                  className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white flex items-center justify-center"
                  title="Center Horizontally"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlign('right')}
                  className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white flex items-center justify-center"
                  title="Align Right (Margin)"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlign('top')}
                  className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white flex items-center justify-center"
                  title="Align Top (Margin)"
                >
                  <AlignStartVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlign('middle')}
                  className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white flex items-center justify-center"
                  title="Center Vertically"
                >
                  <AlignCenterVertical className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onAlign('bottom')}
                  className="p-1 rounded hover:bg-blue-600/30 text-gray-300 hover:text-white flex items-center justify-center"
                  title="Align Bottom (Margin)"
                >
                  <AlignEndVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Layer Ordering / Z-Order */}
          {onZOrder && (
            <div className="pt-1">
              <div className="text-[10px] text-gray-400 mb-1 flex items-center justify-between">
                <span>Layer Stacking (Z-Index: {selectedObject.zIndex})</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <button
                  onClick={() => onZOrder('front')}
                  className="px-1.5 py-1 rounded bg-[#252834] hover:bg-[#323646] text-[10px] text-gray-300 hover:text-white flex items-center justify-center space-x-0.5"
                  title="Bring to Front"
                >
                  <ChevronsUp className="w-3 h-3 text-blue-400" />
                  <span>Front</span>
                </button>
                <button
                  onClick={() => onZOrder('forward')}
                  className="px-1.5 py-1 rounded bg-[#252834] hover:bg-[#323646] text-[10px] text-gray-300 hover:text-white flex items-center justify-center space-x-0.5"
                  title="Bring Forward (+1)"
                >
                  <ArrowUp className="w-3 h-3 text-blue-400" />
                  <span>Up</span>
                </button>
                <button
                  onClick={() => onZOrder('backward')}
                  className="px-1.5 py-1 rounded bg-[#252834] hover:bg-[#323646] text-[10px] text-gray-300 hover:text-white flex items-center justify-center space-x-0.5"
                  title="Send Backward (-1)"
                >
                  <ArrowDown className="w-3 h-3 text-gray-400" />
                  <span>Down</span>
                </button>
                <button
                  onClick={() => onZOrder('back')}
                  className="px-1.5 py-1 rounded bg-[#252834] hover:bg-[#323646] text-[10px] text-gray-300 hover:text-white flex items-center justify-center space-x-0.5"
                  title="Send to Back"
                >
                  <ChevronsDown className="w-3 h-3 text-gray-400" />
                  <span>Back</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 3. BARCODE SPECIFIC PROPERTIES */}
        {isBarcode && barcodeObj && (
          <section className="space-y-2 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
              <span>Barcode Specification</span>
              <div className="flex items-center space-x-2">
                {onOpenPresets && (
                  <button
                    onClick={onOpenPresets}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-0.5"
                    title="Open Barcode Presets"
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Presets</span>
                  </button>
                )}
                <button
                  onClick={onOpenBarcodeWizard}
                  className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-0.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Catalog</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Symbology</label>
              <select
                value={barcodeObj.barcodeStyle.symbology}
                onChange={(e) => {
                  const sym = e.target.value as any;
                  onUpdateObject({
                    barcodeStyle: { ...barcodeObj.barcodeStyle, symbology: sym },
                  });
                }}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {BARCODE_CATALOG.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Data / Expression Value</label>
              <textarea
                rows={2}
                value={barcodeObj.value}
                onChange={(e) => onUpdateObject({ value: e.target.value })}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick Variable Insertion Chips */}
            <div>
              <span className="text-[9px] text-gray-500 block mb-1">Bind Database Variable:</span>
              <div className="flex flex-wrap gap-1">
                {activeDataSource?.fields.slice(0, 5).map(f => (
                  <button
                    key={f.name}
                    onClick={() => onUpdateObject({ value: `{{${f.name}}}` })}
                    className="px-1.5 py-0.5 rounded bg-[#272c38] hover:bg-[#343b4c] text-[9px] text-cyan-300 font-mono"
                  >
                    {`{{${f.name}}}`}
                  </button>
                ))}
                <button
                  onClick={() => onUpdateObject({ value: '{{SERIAL}}' })}
                  className="px-1.5 py-0.5 rounded bg-[#272c38] hover:bg-[#343b4c] text-[9px] text-amber-300 font-mono"
                >
                  {'{{SERIAL}}'}
                </button>
              </div>
            </div>

            {/* Human Readable Options for 1D barcodes */}
            {barcodeObj.barcodeStyle.symbology !== 'qr' && barcodeObj.barcodeStyle.symbology !== 'datamatrix' && (
              <div className="space-y-1.5 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={barcodeObj.barcodeStyle.humanReadable}
                    onChange={(e) =>
                      onUpdateObject({
                        barcodeStyle: { ...barcodeObj.barcodeStyle, humanReadable: e.target.checked },
                      })
                    }
                    className="rounded bg-[#16181f] border-gray-600 text-blue-600"
                  />
                  <span>Show Human-Readable Text</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={barcodeObj.barcodeStyle.quietZone}
                    onChange={(e) =>
                      onUpdateObject({
                        barcodeStyle: { ...barcodeObj.barcodeStyle, quietZone: e.target.checked },
                      })
                    }
                    className="rounded bg-[#16181f] border-gray-600 text-blue-600"
                  />
                  <span>Enforce Quiet Zone Margins</span>
                </label>
              </div>
            )}

            {/* Error correction for 2D QR */}
            {(barcodeObj.barcodeStyle.symbology === 'qr' || barcodeObj.barcodeStyle.symbology === 'gs1-qr') && (
              <div className="space-y-2 pt-1">
                {/* QR Code Wizard Banner */}
                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-700/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-300 flex items-center space-x-1">
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>QR Code Wizard</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-200 font-mono font-semibold">
                      ECC {barcodeObj.barcodeStyle.errorCorrectionLevel || 'M'}
                    </span>
                  </div>
                  <p className="text-[9px] text-gray-300 leading-tight">
                    Full URL encoding, vCard profiles, and custom Error Correction Levels (L, M, Q, H).
                  </p>
                  {onOpenQRWizard && (
                    <button
                      onClick={onOpenQRWizard}
                      className="w-full py-1 px-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center justify-center space-x-1 shadow-sm transition-colors"
                    >
                      <span>Open in QR Wizard</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Error Correction Level (ECC)</label>
                  <select
                    value={barcodeObj.barcodeStyle.errorCorrectionLevel || 'M'}
                    onChange={(e) =>
                      onUpdateObject({
                        barcodeStyle: { ...barcodeObj.barcodeStyle, errorCorrectionLevel: e.target.value as any },
                      })
                    }
                    className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="L">L (7% recovery - Highest density)</option>
                    <option value="M">M (15% recovery - Standard)</option>
                    <option value="Q">Q (25% recovery - Industrial)</option>
                    <option value="H">H (30% recovery - Max durability)</option>
                  </select>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 4. TEXT & MULTILINGUAL PROPERTIES */}
        {isText && textObj && (
          <section className="space-y-2 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Typography &amp; Content</div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Label Text / Expression</label>
              <textarea
                rows={3}
                value={textObj.text}
                onChange={(e) => onUpdateObject({ text: e.target.value })}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Quick Variable Insertion Chips */}
            <div>
              <span className="text-[9px] text-gray-500 block mb-1">Insert Dynamic Token:</span>
              <div className="flex flex-wrap gap-1">
                {activeDataSource?.fields.slice(0, 4).map(f => (
                  <button
                    key={f.name}
                    onClick={() => onUpdateObject({ text: `${textObj.text} {{${f.name}}}` })}
                    className="px-1.5 py-0.5 rounded bg-[#272c38] hover:bg-[#343b4c] text-[9px] text-cyan-300 font-mono"
                  >
                    {`{{${f.name}}}`}
                  </button>
                ))}
                <button
                  onClick={() => onUpdateObject({ text: `${textObj.text} {{SERIAL}}` })}
                  className="px-1.5 py-0.5 rounded bg-[#272c38] hover:bg-[#343b4c] text-[9px] text-amber-300 font-mono"
                >
                  {'{{SERIAL}}'}
                </button>
                <button
                  onClick={() => onUpdateObject({ text: `${textObj.text} {{DATE_YYMMDD}}` })}
                  className="px-1.5 py-0.5 rounded bg-[#272c38] hover:bg-[#343b4c] text-[9px] text-emerald-300 font-mono"
                >
                  {'{{DATE}}'}
                </button>
              </div>
            </div>

            {/* Font Family (Standard Windows TTF & OTF) */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] text-gray-400">Font Family</label>
                {(() => {
                  const fontDef = getFontDefinition(textObj.style.fontFamily);
                  return (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                        fontDef.formatCode === 'TTF'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-purple-950 text-purple-300 border border-purple-800'
                      }`}
                    >
                      {fontDef.format}
                    </span>
                  );
                })()}
              </div>
              <select
                value={textObj.style.fontFamily || 'Segoe UI'}
                onChange={(e) =>
                  onUpdateObject({ style: { ...textObj.style, fontFamily: e.target.value } })
                }
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
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
              {(() => {
                const fontDef = getFontDefinition(textObj.style.fontFamily);
                return (
                  <div className="mt-1 text-[10px] text-gray-400 bg-[#16181f] p-1.5 rounded border border-[#2b303d] space-y-0.5">
                    <div className="text-gray-300 font-medium">{fontDef.description}</div>
                    <div className="text-[9px] text-gray-500 flex items-center justify-between">
                      <span>{fontDef.windowsStandard}</span>
                      <span className="font-mono text-cyan-400">{fontDef.categoryLabel}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Typography Formatting Toolbar */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Style &amp; Alignment</label>
              <div className="flex items-center justify-between bg-[#16181f] border border-[#373c49] rounded p-0.5">
                <div className="flex items-center space-x-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObject({
                        style: {
                          ...textObj.style,
                          fontWeight: textObj.style.fontWeight === 'bold' ? 'normal' : 'bold',
                        },
                      })
                    }
                    className={`p-1 rounded transition-colors ${
                      textObj.style.fontWeight === 'bold'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-gray-400 hover:text-white hover:bg-[#282d38]'
                    }`}
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObject({
                        style: {
                          ...textObj.style,
                          fontStyle: textObj.style.fontStyle === 'italic' ? 'normal' : 'italic',
                        },
                      })
                    }
                    className={`p-1 rounded transition-colors ${
                      textObj.style.fontStyle === 'italic'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#282d38]'
                    }`}
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObject({
                        style: {
                          ...textObj.style,
                          underline: !textObj.style.underline,
                        },
                      })
                    }
                    className={`p-1 rounded transition-colors ${
                      textObj.style.underline
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#282d38]'
                    }`}
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-[1px] h-3.5 bg-[#323746]" />

                <div className="flex items-center space-x-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObject({
                        style: { ...textObj.style, alignment: 'left' },
                      })
                    }
                    className={`p-1 rounded transition-colors ${
                      (!textObj.style.alignment || textObj.style.alignment === 'left')
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#282d38]'
                    }`}
                    title="Align Left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObject({
                        style: { ...textObj.style, alignment: 'center' },
                      })
                    }
                    className={`p-1 rounded transition-colors ${
                      textObj.style.alignment === 'center'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#282d38]'
                    }`}
                    title="Align Center"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObject({
                        style: { ...textObj.style, alignment: 'right' },
                      })
                    }
                    className={`p-1 rounded transition-colors ${
                      textObj.style.alignment === 'right'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#282d38]'
                    }`}
                    title="Align Right"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateObject({
                        style: { ...textObj.style, alignment: 'justify' },
                      })
                    }
                    className={`p-1 rounded transition-colors ${
                      textObj.style.alignment === 'justify'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-[#282d38]'
                    }`}
                    title="Justify"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Font Size (pt)</label>
                <input
                  type="number"
                  value={textObj.style.fontSize}
                  onChange={(e) => onUpdateObject({ style: { ...textObj.style, fontSize: Number(e.target.value) } })}
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Text Color</label>
                <input
                  type="color"
                  value={textObj.style.color || '#000000'}
                  onChange={(e) => onUpdateObject({ style: { ...textObj.style, color: e.target.value } })}
                  className="w-full h-7 bg-[#16181f] border border-[#373c49] rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={textObj.style.wrap}
                  onChange={(e) => onUpdateObject({ style: { ...textObj.style, wrap: e.target.checked } })}
                  className="rounded bg-[#16181f] border-gray-600 text-blue-600"
                />
                <span>Enable Multi-Line Text Wrapping</span>
              </label>
            </div>
          </section>
        )}

        {/* 5. SHAPE PROPERTIES */}
        {isShape && shapeObj && (
          <section className="space-y-2 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Shape Styling</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Border Width (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={shapeObj.shapeStyle.strokeWidth}
                  onChange={(e) => onUpdateObject({ shapeStyle: { ...shapeObj.shapeStyle, strokeWidth: Number(e.target.value) } })}
                  className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white"
                />
              </div>
              {shapeObj.type === 'rect' && (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-0.5">Corner Radius (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={shapeObj.shapeStyle.borderRadius || 0}
                    onChange={(e) => onUpdateObject({ shapeStyle: { ...shapeObj.shapeStyle, borderRadius: Number(e.target.value) } })}
                    className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* 6. GRAPHIC / IMAGE PROPERTIES */}
        {isImage && imageObj && (
          <section className="space-y-2.5 border-t border-[#2d313d] pt-3">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-pink-400" />
                <span>Graphic / Image Source</span>
              </span>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Image URL / Data URI</label>
              <textarea
                rows={2}
                value={imageObj.src}
                onChange={(e) => onUpdateObject({ src: e.target.value })}
                className="w-full bg-[#16181f] border border-[#373c49] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                placeholder="https://... or data:image/png;base64,..."
              />
            </div>

            {/* Local Image File Upload */}
            <div>
              <label className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 rounded bg-[#272c38] hover:bg-[#323847] text-gray-200 border border-[#3c4354] cursor-pointer text-xs transition-colors">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Choose Local Image File...</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const base64 = evt.target?.result as string;
                        if (base64) {
                          onUpdateObject({ src: base64, name: file.name.slice(0, 20) });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>

            <div className="pt-1">
              <label className="flex items-center space-x-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={imageObj.aspectRatioLocked ?? true}
                  onChange={(e) => onUpdateObject({ aspectRatioLocked: e.target.checked })}
                  className="rounded bg-[#16181f] border-gray-600 text-blue-600"
                />
                <span>Lock Aspect Ratio (Preserve Proportions)</span>
              </label>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
