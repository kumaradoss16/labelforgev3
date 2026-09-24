import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  BookmarkPlus,
  Sparkles,
  Search,
  Check,
  Trash2,
  Download,
  Upload,
  Layers,
  ArrowRight,
  Plus,
  Sliders,
  Tag,
  Box,
  ShieldCheck,
  Copy,
  Info,
  ExternalLink,
  ChevronDown,
  X
} from 'lucide-react';
import { BarcodeLabelObject, LabelObject } from '../../types/label';
import { BarcodePreset, PresetCategory } from '../../types/presets';
import {
  getAllPresets,
  saveCustomPreset,
  deleteCustomPreset,
  updateCustomPreset,
  exportPresetsToJson,
  importPresetsFromJson,
  extractPresetFromObject,
  applyPresetToObject,
} from '../../services/barcodePresetStorage';

interface BarcodePresetsPanelProps {
  selectedObject: LabelObject | null;
  onUpdateObject: (updated: Partial<LabelObject>) => void;
  onAddBarcodeWithPreset?: (preset: BarcodePreset) => void;
  onSwitchToProperties?: () => void;
}

export const BarcodePresetsPanel: React.FC<BarcodePresetsPanelProps> = ({
  selectedObject,
  onUpdateObject,
  onAddBarcodeWithPreset,
  onSwitchToProperties,
}) => {
  const [presets, setPresets] = useState<BarcodePreset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory | 'All'>('All');
  const [appliedPresetId, setAppliedPresetId] = useState<string | null>(null);

  // Save new preset dialog state
  const [isSavingDialogOpen, setIsSavingDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState<PresetCategory>('Custom');

  // Import / Export JSON modal state
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonSuccess, setJsonSuccess] = useState<string | null>(null);

  const isBarcodeSelected =
    selectedObject !== null &&
    (selectedObject.type === 'barcode' || selectedObject.type === 'qrcode' || selectedObject.type === 'datamatrix');
  const selectedBarcodeObj = isBarcodeSelected ? (selectedObject as BarcodeLabelObject) : null;

  // Refresh preset list from storage
  const loadPresets = () => {
    setPresets(getAllPresets());
  };

  useEffect(() => {
    loadPresets();
  }, []);

  // Filter presets by search and category
  const filteredPresets = useMemo(() => {
    return presets.filter((p) => {
      const matchesCat =
        selectedCategory === 'All' ||
        (selectedCategory === 'Custom' ? !p.isBuiltIn : p.category === selectedCategory);
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.symbology.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [presets, selectedCategory, searchQuery]);

  // Handle saving current selection as preset
  const handleOpenSaveDialog = () => {
    if (!selectedBarcodeObj) return;
    const defaultName = `${selectedBarcodeObj.name || selectedBarcodeObj.barcodeStyle.symbology.toUpperCase()} Preset`;
    setNewPresetName(defaultName);
    setNewPresetDesc(`Custom preset saved with ${Math.round(selectedBarcodeObj.width)}x${Math.round(selectedBarcodeObj.height)}mm dimensions.`);
    setNewPresetCategory('Custom');
    setIsSavingDialogOpen(true);
  };

  const handleConfirmSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarcodeObj || !newPresetName.trim()) return;

    const baseData = extractPresetFromObject(selectedBarcodeObj, newPresetName.trim(), newPresetCategory);
    baseData.description = newPresetDesc.trim();
    saveCustomPreset(baseData);
    setIsSavingDialogOpen(false);
    loadPresets();
  };

  // Handle applying a preset to selected object
  const handleApplyPreset = (preset: BarcodePreset) => {
    if (selectedBarcodeObj) {
      const updates = applyPresetToObject(preset, selectedBarcodeObj);
      onUpdateObject(updates);
      setAppliedPresetId(preset.id);
      setTimeout(() => setAppliedPresetId(null), 2000);
    } else if (onAddBarcodeWithPreset) {
      onAddBarcodeWithPreset(preset);
      setAppliedPresetId(preset.id);
      setTimeout(() => setAppliedPresetId(null), 2000);
    }
  };

  // Handle deleting a custom preset
  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this custom preset?')) {
      deleteCustomPreset(id);
      loadPresets();
    }
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = exportPresetsToJson();
    setJsonText(jsonStr);
    setJsonError(null);
    setJsonSuccess('Presets exported below. You can copy or save this configuration.');
    setIsJsonModalOpen(true);
  };

  // Import JSON
  const handleOpenImportModal = () => {
    setJsonText('');
    setJsonError(null);
    setJsonSuccess(null);
    setIsJsonModalOpen(true);
  };

  const handleConfirmImport = () => {
    if (!jsonText.trim()) {
      setJsonError('Please paste valid JSON preset text.');
      return;
    }
    const res = importPresetsFromJson(jsonText);
    if (res.errors) {
      setJsonError(res.errors);
    } else {
      setJsonSuccess(`Successfully imported ${res.importedCount} presets!`);
      loadPresets();
      setTimeout(() => {
        setIsJsonModalOpen(false);
      }, 1200);
    }
  };

  const categories: (PresetCategory | 'All')[] = [
    'All',
    'Custom',
    'Logistics',
    'Retail',
    'Healthcare',
    'Industrial 2D',
  ];

  return (
    <div className="w-full bg-[#1e2129] text-[#c8cbd2] flex flex-col h-full text-xs select-none overflow-hidden">
      {/* 1. Header & Actions */}
      <div className="p-3 bg-[#242832] border-b border-[#2d313d] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5">
          <Bookmark className="w-4 h-4 text-amber-400" />
          <h2 className="font-bold text-[12px] text-white tracking-wide">Barcode Presets</h2>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleOpenImportModal}
            className="p-1.5 rounded hover:bg-[#323745] text-gray-400 hover:text-white transition-colors"
            title="Import Presets JSON"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleExportJson}
            className="p-1.5 rounded hover:bg-[#323745] text-gray-400 hover:text-white transition-colors"
            title="Export Presets JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Top Selected Object Status Bar */}
      <div className="px-3 py-2 bg-[#16181f] border-b border-[#2a2e3a] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5 overflow-hidden">
          <span className="text-[10px] text-gray-400 shrink-0">Target:</span>
          {isBarcodeSelected && selectedBarcodeObj ? (
            <span className="text-[10px] text-cyan-300 font-semibold truncate">
              {selectedBarcodeObj.name} ({selectedBarcodeObj.barcodeStyle.symbology.toUpperCase()})
            </span>
          ) : (
            <span className="text-[10px] text-gray-500 italic">No barcode selected (Will insert new)</span>
          )}
        </div>

        {isBarcodeSelected && (
          <button
            onClick={handleOpenSaveDialog}
            className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 text-[10px] font-medium flex items-center space-x-1 transition-all"
            title="Save selected barcode configuration as a new preset"
          >
            <BookmarkPlus className="w-3 h-3" />
            <span>Save Preset</span>
          </button>
        )}
      </div>

      {/* Save Custom Preset Form Popup / Inline Accordion */}
      {isSavingDialogOpen && (
        <div className="p-3 bg-[#181b22] border-b border-amber-500/40 shadow-lg space-y-2 shrink-0 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Save Custom Configuration Preset</span>
            </span>
            <button
              onClick={() => setIsSavingDialogOpen(false)}
              className="p-0.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleConfirmSavePreset} className="space-y-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Preset Name *</label>
              <input
                type="text"
                required
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. Warehouse Rack Code 39"
                className="w-full bg-[#12141a] border border-[#3b4150] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Category</label>
                <select
                  value={newPresetCategory}
                  onChange={(e) => setNewPresetCategory(e.target.value as PresetCategory)}
                  className="w-full bg-[#12141a] border border-[#3b4150] rounded px-1.5 py-1 text-xs text-white"
                >
                  <option value="Custom">Custom</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Retail">Retail</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Industrial 2D">Industrial 2D</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-0.5">Captured Specs</label>
                <div className="text-[10px] text-gray-300 font-mono py-1 px-1.5 bg-[#12141a] rounded border border-[#2b2f3a] truncate">
                  {selectedBarcodeObj?.barcodeStyle.symbology.toUpperCase()} ({Math.round(selectedBarcodeObj?.width || 0)}x{Math.round(selectedBarcodeObj?.height || 0)}mm)
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 block mb-0.5">Description (Optional)</label>
              <input
                type="text"
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
                placeholder="Brief usage instructions..."
                className="w-full bg-[#12141a] border border-[#3b4150] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsSavingDialogOpen(false)}
                className="px-2.5 py-1 rounded bg-[#2b303c] hover:bg-[#383e4e] text-gray-300 text-[10px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[10px] shadow"
              >
                Save Preset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Search and Category Filter Bar */}
      <div className="p-2.5 bg-[#181b22] border-b border-[#2d313d] space-y-2 shrink-0">
        {/* Search box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search presets (UPC, GS1, QR, size)..."
            className="w-full bg-[#12141a] border border-[#373c49] rounded pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-[#232733] text-gray-400 hover:text-gray-200 hover:bg-[#2c3140]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Preset Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredPresets.length === 0 ? (
          <div className="text-center py-10 px-4 text-gray-500 space-y-2">
            <Bookmark className="w-8 h-8 mx-auto text-gray-600 opacity-60" />
            <p className="text-xs">No barcode presets match your criteria.</p>
            {isBarcodeSelected && (
              <button
                onClick={handleOpenSaveDialog}
                className="mt-2 inline-flex items-center space-x-1 px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-medium"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save Selected Object as Preset</span>
              </button>
            )}
          </div>
        ) : (
          filteredPresets.map((preset) => {
            const isJustApplied = appliedPresetId === preset.id;
            const is2D =
              preset.symbology === 'qr' ||
              preset.symbology === 'gs1-qr' ||
              preset.symbology === 'datamatrix' ||
              preset.symbology === 'gs1-datamatrix' ||
              preset.symbology === 'pdf417';

            return (
              <div
                key={preset.id}
                className={`p-2.5 rounded-lg border transition-all ${
                  isJustApplied
                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-[#15171e] hover:bg-[#1a1d26] border-[#2c303c] hover:border-[#3e4455]'
                }`}
              >
                {/* Top Row: Title & Symbology Badges */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-semibold text-white text-xs truncate">{preset.name}</span>
                      <span className="px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 font-mono text-[9px] font-bold border border-blue-800/60">
                        {preset.symbology.toUpperCase()}
                      </span>
                      {preset.isBuiltIn ? (
                        <span className="px-1 py-0.2 rounded bg-gray-800 text-gray-400 text-[8px] uppercase tracking-wider font-semibold">
                          Built-in
                        </span>
                      ) : (
                        <span className="px-1 py-0.2 rounded bg-amber-950/70 text-amber-300 text-[8px] uppercase tracking-wider font-semibold border border-amber-800/50">
                          Custom
                        </span>
                      )}
                    </div>
                  </div>

                  {!preset.isBuiltIn && (
                    <button
                      onClick={(e) => handleDeletePreset(preset.id, e)}
                      className="p-1 rounded hover:bg-red-950/60 text-gray-400 hover:text-red-400 transition-colors shrink-0"
                      title="Delete custom preset"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Description */}
                {preset.description && (
                  <p className="text-[10px] text-gray-400 leading-snug mb-2">{preset.description}</p>
                )}

                {/* Specifications Bar */}
                <div className="grid grid-cols-2 gap-1.5 bg-[#0f1116] p-1.5 rounded border border-[#232733] text-[10px] text-gray-300 mb-2">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Dimensions:</span>
                    <span className="font-mono text-cyan-300 font-semibold">{preset.width}x{preset.height}mm</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Color:</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/30"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="font-mono text-xs">{preset.color}</span>
                  </div>

                  {preset.errorCorrectionLevel && (
                    <div className="flex items-center space-x-1">
                      <span className="text-gray-500">ECC Level:</span>
                      <span className="font-semibold text-emerald-400">ECC {preset.errorCorrectionLevel}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500">Human Text:</span>
                    <span className={preset.humanReadable ? 'text-amber-300' : 'text-gray-500'}>
                      {preset.humanReadable ? (preset.humanReadablePosition || 'bottom') : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleApplyPreset(preset)}
                    className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm ${
                      isJustApplied
                        ? 'bg-emerald-600 text-white'
                        : isBarcodeSelected
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-[#272c38] hover:bg-[#343b4c] text-blue-300 hover:text-white'
                    }`}
                  >
                    {isJustApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Applied!</span>
                      </>
                    ) : isBarcodeSelected ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Apply to Selected Barcode</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Insert Barcode to Canvas</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. JSON Export / Import Modal */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2129] border border-[#3b4150] rounded-xl max-w-lg w-full p-4 space-y-3 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#2d313d] pb-2">
              <div className="flex items-center space-x-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Barcode Presets JSON Tool</h3>
              </div>
              <button
                onClick={() => setIsJsonModalOpen(false)}
                className="p-1 rounded hover:bg-[#2f333f] text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {jsonError && (
              <div className="p-2 rounded bg-red-950/60 border border-red-800 text-red-200 text-xs">
                {jsonError}
              </div>
            )}
            {jsonSuccess && (
              <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{jsonSuccess}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] text-gray-400 block mb-1">JSON Configuration Data:</label>
              <textarea
                rows={9}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="Paste preset JSON array or configuration object here..."
                className="w-full bg-[#12141a] border border-[#373c49] rounded p-2 text-xs font-mono text-cyan-200 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonText);
                  setJsonSuccess('Copied JSON to clipboard!');
                  setTimeout(() => setJsonSuccess(null), 2000);
                }}
                className="px-2.5 py-1 rounded bg-[#2b303c] hover:bg-[#373e4e] text-gray-300 text-xs flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copy JSON</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsJsonModalOpen(false)}
                  className="px-3 py-1 rounded bg-[#2b303c] hover:bg-[#373e4e] text-gray-300 text-xs"
                >
                  Close
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-3.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow"
                >
                  Import Presets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
