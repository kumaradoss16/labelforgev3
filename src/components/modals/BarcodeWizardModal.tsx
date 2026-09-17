import React, { useState } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Barcode as BarcodeIcon,
  QrCode,
  Grid
} from 'lucide-react';
import { BARCODE_CATALOG, parseGS1ApplicationIdentifiers, calculateGS1Modulo10, render1DBarcodeSvg, generateDataMatrixSvg } from '../../services/barcodeEngine';
import { COMMON_GS1_AIS, BarcodeCategory, BarcodeSymbologyInfo } from '../../types/barcode';
import { BarcodeSymbology, BarcodeStyle } from '../../types/label';

interface BarcodeWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertBarcode: (symbology: BarcodeSymbology, value: string, style?: Partial<BarcodeStyle>) => void;
  initialSymbology?: string;
}

export const BarcodeWizardModal: React.FC<BarcodeWizardModalProps> = ({
  isOpen,
  onClose,
  onInsertBarcode,
  initialSymbology = 'code128',
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSymbologyId, setSelectedSymbologyId] = useState<BarcodeSymbology>(
    (initialSymbology as BarcodeSymbology) || 'code128'
  );
  const [barcodeData, setBarcodeData] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'gs1-assistant'>('catalog');

  // GS1 Assistant State
  const [selectedAIs, setSelectedAIs] = useState<{ ai: string; value: string }[]>([
    { ai: '01', value: '00614141999996' },
    { ai: '10', value: 'LOT-2026-X99' },
    { ai: '17', value: '280630' },
    { ai: '21', value: 'SN-90823412' },
  ]);

  const categories: ('All' | BarcodeCategory)[] = [
    'All',
    'Linear 1D',
    '2D Matrix',
    'GS1 Standards',
    'Postal & Shipping',
    'Retail & Identification',
    'Specialized',
    'Composite & Healthcare',
  ];

  const filteredSymbologies = BARCODE_CATALOG.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.standard.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const selectedInfo = BARCODE_CATALOG.find((b) => b.id === selectedSymbologyId) || BARCODE_CATALOG[0];

  // Set default data on symbology switch if empty
  const currentData = barcodeData || selectedInfo.defaultData;

  // Build GS1 string from AIs
  const builtGS1String = selectedAIs
    .filter(a => a.value.trim() !== '')
    .map(a => `(${a.ai})${a.value.trim()}`)
    .join('');

  const handleInsert = () => {
    if (activeTab === 'gs1-assistant') {
      onInsertBarcode('gs1-128', builtGS1String, { humanReadable: true });
    } else {
      onInsertBarcode(selectedSymbologyId, currentData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-4xl bg-[#1e2129] border border-[#343946] rounded-lg shadow-2xl flex flex-col max-h-[85vh] text-[#c9ccd3] text-xs overflow-hidden">
        {/* Modal Header */}
        <div className="h-10 bg-[#252833] border-b border-[#343946] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white text-sm">LabelForge Barcode Catalog &amp; Standards Wizard</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#323644] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="bg-[#1c1f26] border-b border-[#303440] px-4 flex space-x-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-2 border-b-2 transition-colors ${
              activeTab === 'catalog' ? 'text-white border-blue-500 font-semibold' : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            Full Symbology Catalog (25+ Standards)
          </button>
          <button
            onClick={() => setActiveTab('gs1-assistant')}
            className={`py-2 border-b-2 transition-colors flex items-center space-x-1.5 ${
              activeTab === 'gs1-assistant' ? 'text-white border-amber-500 font-semibold' : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>GS1 Application Identifier (AI) Assistant</span>
          </button>
        </div>

        {/* Modal Body */}
        {activeTab === 'catalog' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Categories & Search */}
            <div className="w-56 border-r border-[#2d313d] bg-[#181a21] p-3 flex flex-col space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search standard..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1e212a] border border-[#353a47] rounded pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1">
                  Categories
                </span>
                <div className="space-y-0.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-2 py-1 rounded text-[11px] transition-colors ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-gray-300 hover:bg-[#232732] hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Column: Symbology List */}
            <div className="w-64 border-r border-[#2d313d] overflow-y-auto p-2 space-y-1 bg-[#1a1c24]">
              {filteredSymbologies.map((item) => {
                const isSelected = item.id === selectedSymbologyId;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedSymbologyId(item.id);
                      setBarcodeData(item.defaultData);
                    }}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-900/40 border border-blue-500/60 text-white'
                        : 'hover:bg-[#222631] text-gray-300 border border-transparent'
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between">
                      <span>{item.displayName}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                        item.status === 'SUPPORTED'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : item.status === 'PARTIALLY_SUPPORTED'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : item.status === 'REQUIRES_HARDWARE'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                          : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                      }`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">{item.standard}</div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Specification & Live Preview */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#1e2129]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>{selectedInfo.displayName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 font-mono">
                    {selectedInfo.standard}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{selectedInfo.description}</p>
              </div>

              {/* Data Input Field */}
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Barcode Data Payload:
                </label>
                <input
                  type="text"
                  value={currentData}
                  onChange={(e) => setBarcodeData(e.target.value)}
                  className="w-full bg-[#16181f] border border-[#353a47] rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Capability Matrix */}
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#171920] p-3 rounded border border-[#2d313d]">
                <div>
                  <span className="text-gray-500">Symbology Class:</span>{' '}
                  <strong className="text-gray-200">{selectedInfo.supports2D ? '2D Matrix' : 'Linear 1D'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">GS1 Compliant:</span>{' '}
                  <strong className={selectedInfo.supportsGS1 ? 'text-emerald-400' : 'text-gray-400'}>
                    {selectedInfo.supportsGS1 ? 'Yes' : 'No'}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500">Checksum Method:</span>{' '}
                  <strong className="text-gray-200">{selectedInfo.checksumType}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Native ZPL Command:</span>{' '}
                  <strong className="text-cyan-400 font-mono">{selectedInfo.nativeZPLCommand || '^BC'}</strong>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="bg-white rounded p-4 flex flex-col items-center justify-center min-h-[120px] shadow-inner">
                <span className="text-[9px] text-gray-400 font-mono mb-2 uppercase tracking-widest">
                  Live Vector Render Preview
                </span>
                {renderPreview(selectedSymbologyId, currentData, selectedInfo)}
              </div>
            </div>
          </div>
        ) : (
          /* ================= GS1 APPLICATION IDENTIFIER ASSISTANT ================= */
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#1e2129]">
            <div className="bg-[#181b23] border border-[#2e323e] p-3 rounded space-y-1">
              <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>GS1 General Specifications Compliance Engine</span>
              </h4>
              <p className="text-[11px] text-gray-400">
                Application Identifiers (AIs) define the meaning and format of data fields (GTIN, Batch/Lot, Dates, Serial Number) with automatic Modulo 10 check digit verification.
              </p>
            </div>

            {/* Configured AIs Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Active Application Identifiers:
                </span>
                <span className="text-[10px] text-gray-500 font-mono">FNC1 Prefixed</span>
              </div>

              <div className="space-y-1.5">
                {selectedAIs.map((item, idx) => {
                  const spec = COMMON_GS1_AIS.find(a => a.ai === item.ai);
                  return (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 bg-[#171920] p-2 rounded border border-[#2d313d]"
                    >
                      <span className="px-2 py-1 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-mono font-bold text-xs shrink-0">
                        ({item.ai})
                      </span>
                      <div className="flex-1">
                        <div className="text-[10px] text-gray-400 font-semibold">{spec?.title || `AI ${item.ai}`}</div>
                        <input
                          type="text"
                          value={item.value}
                          onChange={(e) => {
                            const copy = [...selectedAIs];
                            copy[idx].value = e.target.value;
                            setSelectedAIs(copy);
                          }}
                          className="w-full bg-[#12141a] border border-[#343845] rounded px-2 py-0.5 text-xs text-white font-mono mt-0.5"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const copy = selectedAIs.filter((_, i) => i !== idx);
                          setSelectedAIs(copy);
                        }}
                        className="p-1 text-gray-400 hover:text-red-400 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Add AI Buttons */}
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                Add Standard Identifier:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_GS1_AIS.filter(a => !selectedAIs.some(s => s.ai === a.ai)).map(ai => (
                  <button
                    key={ai.ai}
                    onClick={() => setSelectedAIs([...selectedAIs, { ai: ai.ai, value: ai.example }])}
                    className="px-2 py-1 rounded bg-[#252834] hover:bg-[#303544] text-[10px] text-gray-200 border border-[#353a49]"
                  >
                    + ({ai.ai}) {ai.title.split('(')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Built Barcode String Preview */}
            <div className="bg-[#171920] p-3 rounded border border-[#2d313d]">
              <span className="text-[10px] text-gray-400 uppercase font-bold block mb-1">
                Formatted GS1-128 Human Readable String:
              </span>
              <div className="font-mono text-xs text-amber-300 bg-black/40 p-2 rounded border border-amber-900/40 select-text">
                {builtGS1String || '(No AIs configured)'}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="h-12 bg-[#252833] border-t border-[#343946] px-4 flex items-center justify-between">
          <div className="text-[10px] text-gray-400">
            Complies with GS1 General Specifications &amp; ISO/IEC Standards
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#2e3340] hover:bg-[#373d4d] text-gray-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center space-x-1"
            >
              <span>Insert Onto Label Canvas</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function renderPreview(symbology: BarcodeSymbology, data: string, itemInfo?: BarcodeSymbologyInfo) {
  if (itemInfo && itemInfo.status === 'REQUIRES_HARDWARE') {
    return (
      <div className="flex flex-col items-center justify-center p-3 text-center">
        <div className="px-2.5 py-1 rounded bg-purple-100 text-purple-900 border border-purple-300 font-semibold text-xs mb-1">
          Hardware Encoding Required
        </div>
        <p className="text-[11px] text-gray-600 max-w-xs">
          Direct thermal/RFID hardware serialization. Native printer command: <strong className="font-mono">{itemInfo.nativeZPLCommand || '^WT'}</strong>
        </p>
        <div className="text-[10px] font-mono text-gray-500 mt-1">Payload: {data.slice(0, 32)}</div>
      </div>
    );
  }

  if (symbology === 'qr' || symbology === 'gs1-qr') {
    return (
      <div className="flex flex-col items-center justify-center">
        <QrCode className="w-20 h-20 text-black" />
        <span className="text-[10px] font-mono text-gray-700 mt-1">{data.slice(0, 30)}</span>
      </div>
    );
  }

  if (symbology === 'datamatrix' || symbology === 'gs1-datamatrix') {
    const svg = generateDataMatrixSvg(data, 25, 25, '#000000');
    return (
      <div className="w-20 h-20 flex items-center justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
    );
  }

  const { svgContent } = render1DBarcodeSvg(symbology, data, {
    symbology,
    humanReadable: true,
    humanReadableFont: 'monospace',
    humanReadableSize: 11,
    humanReadablePosition: 'bottom',
    moduleWidth: 0.33,
    quietZone: true,
    quietZoneSize: 2,
    color: '#000000',
    backgroundColor: 'transparent'
  }, 60, 25);

  return (
    <div
      className="flex items-center justify-center max-w-sm overflow-hidden"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
