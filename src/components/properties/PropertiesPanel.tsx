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
  FileText
} from 'lucide-react';
import { LabelObject, TextLabelObject, BarcodeLabelObject, ShapeLabelObject } from '../../types/label';
import { DataSourceDefinition, SerializationCounter } from '../../types/database';
import { BARCODE_CATALOG } from '../../services/barcodeEngine';
import { FONT_GROUPS, getFontDefinition } from '../../services/fontFamilies';

interface PropertiesPanelProps {
  selectedObject: LabelObject | null;
  onUpdateObject: (updated: Partial<LabelObject>) => void;
  activeDataSource?: DataSourceDefinition;
  counter?: SerializationCounter;
  onOpenBarcodeWizard: () => void;
  onAlign?: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'center-page-h' | 'center-page-v' | 'center-both') => void;
  onZOrder?: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedObject,
  onUpdateObject,
  activeDataSource,
  counter,
  onOpenBarcodeWizard,
  onAlign,
  onZOrder,
}) => {
  if (!selectedObject) {
    return (
      <aside className="w-72 bg-[#1e2129] border-l border-[#2f333f] text-[#c8cbd2] select-none flex flex-col h-full text-xs p-3">
        <div className="flex items-center space-x-2 text-gray-400 font-semibold border-b border-[#2d313d] pb-2">
          <Settings className="w-4 h-4 text-gray-400" />
          <span className="uppercase tracking-wider text-[11px]">Object Properties</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 p-4 space-y-2">
          <Settings className="w-8 h-8 text-gray-600 animate-spin-slow" />
          <p className="text-xs">No object selected on the canvas.</p>
          <p className="text-[10px] text-gray-600">Click any label element or insert a new barcode/text to view and edit its properties.</p>
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

  return (
    <aside className="w-72 bg-[#1e2129] border-l border-[#2f333f] text-[#c8cbd2] select-none flex flex-col h-full text-xs overflow-y-auto">
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
              <button
                onClick={onOpenBarcodeWizard}
                className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-0.5"
              >
                <Sparkles className="w-3 h-3" />
                <span>Catalog</span>
              </button>
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
      </div>
    </aside>
  );
};
