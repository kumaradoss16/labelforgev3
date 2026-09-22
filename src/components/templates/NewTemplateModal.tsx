import React, { useState } from 'react';
import { X, Plus, Sparkles, Check, Layers, Sliders } from 'lucide-react';
import { LabelSizePreset, TemplateCategory } from '../../types/template';
import { STANDARD_LABEL_PRESETS } from '../../services/templateLibraryData';
import { LabelDocument } from '../../types/label';
import { createTemplateFromDocument } from '../../services/templateStorage';

interface NewTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newTemplate: any) => void;
}

export const NewTemplateModal: React.FC<NewTemplateModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  if (!isOpen) return null;

  const [selectedPreset, setSelectedPreset] = useState<LabelSizePreset>(STANDARD_LABEL_PRESETS[0]);
  const [name, setName] = useState('New Custom Label Template');
  const [category, setCategory] = useState<TemplateCategory>('product');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [customWidth, setCustomWidth] = useState<number>(100);
  const [customHeight, setCustomHeight] = useState<number>(150);
  const [unit, setUnit] = useState<'mm' | 'in'>('mm');
  const [isCustomSize, setIsCustomSize] = useState(false);

  const handleSelectPreset = (preset: LabelSizePreset) => {
    setSelectedPreset(preset);
    setIsCustomSize(false);
    setCustomWidth(preset.width);
    setCustomHeight(preset.height);
    setUnit(preset.unit as any);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const width = isCustomSize ? customWidth : selectedPreset.width;
    const height = isCustomSize ? customHeight : selectedPreset.height;
    const actualUnit = isCustomSize ? unit : selectedPreset.unit;

    const newDoc: LabelDocument = {
      id: `doc-tpl-blank-${Date.now()}`,
      schemaVersion: '1.0.0',
      name: name.trim(),
      description: `Custom ${width}×${height}${actualUnit} template`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      author: 'Design Engineer',
      dimensions: {
        width,
        height,
        unit: actualUnit,
        dpi: 300,
        orientation,
        marginLeft: 2,
        marginTop: 2,
        marginRight: 2,
        marginBottom: 2,
        cornerRadius: 1,
      },
      metadata: {
        version: 1,
        status: 'draft',
      },
      objects: [
        {
          id: `txt-title-${Date.now()}`,
          name: 'Title Field',
          type: 'text',
          x: 4,
          y: 4,
          width: width - 8,
          height: 8,
          rotation: 0,
          locked: false,
          visible: true,
          opacity: 1,
          zIndex: 1,
          text: '{{Product_Name}}',
          style: {
            fontFamily: 'Segoe UI',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#000000',
            alignment: 'left',
          },
        },
        {
          id: `bc-primary-${Date.now()}`,
          name: 'Primary Barcode',
          type: 'barcode',
          x: 4,
          y: height - 25 > 15 ? 16 : 10,
          width: width - 8,
          height: Math.min(25, height / 3),
          rotation: 0,
          locked: false,
          visible: true,
          opacity: 1,
          zIndex: 2,
          value: '{{Barcode_Value}}',
          barcodeStyle: {
            symbology: 'code128',
            humanReadable: true,
            humanReadableFont: 'monospace',
            humanReadableSize: 8,
            humanReadablePosition: 'bottom',
            moduleWidth: 0.35,
            quietZone: true,
            quietZoneSize: 2,
            color: '#000000',
            backgroundColor: 'transparent',
          },
        },
      ],
    };

    const template = createTemplateFromDocument(newDoc, {
      name: name.trim(),
      description: `Custom ${width}×${height}${actualUnit} template`,
      category,
      tags: ['custom', category, `${width}x${height}`],
    });

    onCreated(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-[#1a1d26] border border-[#2e3342] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#202430] border-b border-[#2d323f] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white text-base">Create New Label Template</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2d323f] text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-300 mb-1">
              Template Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#12141a] border border-[#343a4a] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-300 mb-1">Template Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[#12141a] border border-[#343a4a] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="product">Product & Manufacturing</option>
                <option value="shipping">Shipping & Logistics</option>
                <option value="retail">Retail & Pricing</option>
                <option value="inventory">Inventory & Warehouse</option>
                <option value="identification">Identification & Badges</option>
                <option value="packaging">Packaging & Master Cartons</option>
                <option value="industrial">Industrial & GHS Safety</option>
                <option value="compliance">Healthcare & Compliance</option>
                <option value="custom">Custom User Category</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 mb-1">Default Orientation</label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                    orientation === 'portrait'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-[#12141a] border-[#343a4a] text-gray-400 hover:text-white'
                  }`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold ${
                    orientation === 'landscape'
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-[#12141a] border-[#343a4a] text-gray-400 hover:text-white'
                  }`}
                >
                  Landscape
                </button>
              </div>
            </div>
          </div>

          {/* Preset Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-semibold text-gray-300">Standard Dimension Presets</label>
              <button
                type="button"
                onClick={() => setIsCustomSize(!isCustomSize)}
                className="text-blue-400 hover:underline text-[11px]"
              >
                {isCustomSize ? '← Choose from standard presets' : '+ Enter custom dimensions'}
              </button>
            </div>

            {!isCustomSize ? (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {STANDARD_LABEL_PRESETS.map((p) => {
                  const isSelected = selectedPreset.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPreset(p)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-950/70 border-blue-500 text-white'
                          : 'bg-[#14161d] border-[#292e3a] text-gray-300 hover:bg-[#1c202a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs">{p.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <p className="text-gray-400 text-[10px] mt-0.5 truncate">{p.category}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 bg-[#14161d] border border-[#292e3a] rounded-lg grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 text-[11px] mb-1">Width</label>
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="w-full bg-[#1e222d] border border-[#373e4f] rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-[11px] mb-1">Height</label>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="w-full bg-[#1e222d] border border-[#373e4f] rounded px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-[11px] mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    className="w-full bg-[#1e222d] border border-[#373e4f] rounded px-2.5 py-1.5 text-white"
                  >
                    <option value="mm">Millimeters (mm)</option>
                    <option value="in">Inches (in)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end space-x-2 border-t border-[#2d323f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#252936] hover:bg-[#2e3344] text-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1.5 shadow-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Template</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
