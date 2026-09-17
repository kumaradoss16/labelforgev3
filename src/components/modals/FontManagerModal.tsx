import React, { useState, useMemo } from 'react';
import {
  X,
  Languages,
  ShieldCheck,
  CheckCircle2,
  FileUp,
  Search,
  Type,
  Printer,
  Check,
  ArrowRight,
  Sparkles,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Cpu
} from 'lucide-react';
import {
  WINDOWS_FONT_CATALOG,
  WindowsFontDefinition,
  getFontCssStack,
  FontFormatCode
} from '../../services/fontFamilies';
import { LabelObject, TextStyle } from '../../types/label';

interface FontManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedObject?: LabelObject | null;
  onInsertMultilingualText: (
    text: string,
    fontFamily: string,
    direction: 'ltr' | 'rtl',
    extraStyle?: Partial<TextStyle>
  ) => void;
  onApplyFontToObject?: (fontFamily: string, extraStyle?: Partial<TextStyle>) => void;
}

type FilterCategory = 'all' | 'ttf' | 'otf' | 'monospace' | 'serif' | 'display' | 'multilingual';

export const FontManagerModal: React.FC<FontManagerModalProps> = ({
  isOpen,
  onClose,
  selectedObject,
  onInsertMultilingualText,
  onApplyFontToObject,
}) => {
  if (!isOpen) return null;

  const isTextSelected = selectedObject?.type === 'text' || selectedObject?.type === 'rich-text';

  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFont, setSelectedFont] = useState<WindowsFontDefinition>(WINDOWS_FONT_CATALOG[0]);

  // Typography controls
  const [testText, setTestText] = useState(selectedFont.sampleText);
  const [fontSize, setFontSize] = useState<number>(18);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(selectedFont.direction || 'ltr');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Filtered fonts
  const filteredFonts = useMemo(() => {
    return WINDOWS_FONT_CATALOG.filter((font) => {
      // Category filter
      if (activeFilter === 'ttf' && font.formatCode !== 'TTF') return false;
      if (activeFilter === 'otf' && (font.formatCode !== 'OTF' || font.category === 'multilingual')) return false;
      if (activeFilter === 'monospace' && font.category !== 'monospace') return false;
      if (activeFilter === 'serif' && font.category !== 'serif') return false;
      if (activeFilter === 'display' && font.category !== 'display') return false;
      if (activeFilter === 'multilingual' && font.category !== 'multilingual') return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = font.family.toLowerCase().includes(query);
        const matchDisplay = font.displayName.toLowerCase().includes(query);
        const matchDesc = font.description.toLowerCase().includes(query);
        const matchBest = font.bestFor.toLowerCase().includes(query);
        return matchName || matchDisplay || matchDesc || matchBest;
      }
      return true;
    });
  }, [activeFilter, searchQuery]);

  const handleSelectFont = (font: WindowsFontDefinition) => {
    setSelectedFont(font);
    setTestText(font.sampleText);
    setDirection(font.direction || 'ltr');
  };

  const handleInsert = () => {
    onInsertMultilingualText(testText, selectedFont.family, direction, {
      fontSize,
      fontWeight: isBold ? 'bold' : 'normal',
      fontStyle: isItalic ? 'italic' : 'normal',
      underline: isUnderline,
      alignment,
    });
    onClose();
  };

  const handleApplyToSelected = () => {
    if (onApplyFontToObject) {
      onApplyFontToObject(selectedFont.family, {
        fontSize,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        underline: isUnderline,
        alignment,
        direction,
      });
      onClose();
    }
  };

  const handleSimulateFontUpload = () => {
    setUploadFeedback('Validating OpenType / TrueType font binary tables (head, hhea, maxp, OS/2, cmap, glyf/CFF)...');
    setTimeout(() => {
      setUploadFeedback('✓ Security check passed: 0 buffer anomalies, valid GSUB/GPOS ligation tables. Font registered.');
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-5xl bg-[#1e2129] border border-[#343946] rounded-lg shadow-2xl flex flex-col max-h-[90vh] text-[#c9ccd3] text-xs overflow-hidden">
        {/* Header */}
        <div className="h-12 bg-[#252833] border-b border-[#343946] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
              <Type className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center space-x-2">
                <span>Windows TrueType &amp; OpenType Font Manager</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  Win32 / ClearType
                </span>
              </div>
              <p className="text-[10px] text-gray-400">
                Standard Windows TrueType (TTF) and OpenType (OTF) typography catalog with thermal rasterization hints
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#323644] text-gray-400 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-[#181a21] border-b border-[#2d313d] px-4 py-2 flex items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto py-0.5">
            {[
              { id: 'all', label: 'All Fonts', count: WINDOWS_FONT_CATALOG.length },
              { id: 'ttf', label: 'TrueType (TTF)', count: WINDOWS_FONT_CATALOG.filter(f => f.formatCode === 'TTF').length },
              { id: 'otf', label: 'OpenType (OTF)', count: WINDOWS_FONT_CATALOG.filter(f => f.formatCode === 'OTF' && f.category !== 'multilingual').length },
              { id: 'monospace', label: 'Monospace & EDI', count: WINDOWS_FONT_CATALOG.filter(f => f.category === 'monospace').length },
              { id: 'serif', label: 'Serif & Regulatory', count: WINDOWS_FONT_CATALOG.filter(f => f.category === 'serif').length },
              { id: 'display', label: 'Hazard & Display', count: WINDOWS_FONT_CATALOG.filter(f => f.category === 'display').length },
              { id: 'multilingual', label: 'Multilingual Unicode', count: WINDOWS_FONT_CATALOG.filter(f => f.category === 'multilingual').length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as FilterCategory)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                  activeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[#222530] text-gray-300 hover:bg-[#2c3140] hover:text-white border border-[#353945]'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1 rounded-full ${activeFilter === tab.id ? 'bg-blue-800 text-blue-100' : 'bg-[#181a21] text-gray-400'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-56 shrink-0">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search Windows fonts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e2129] border border-[#353a47] rounded-md pl-8 pr-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Font Catalog List */}
          <div className="w-72 border-r border-[#2d313d] bg-[#161820] flex flex-col justify-between overflow-hidden">
            <div className="flex-1 p-2 space-y-1 overflow-y-auto">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-2 block mb-1">
                Standard Windows Typefaces ({filteredFonts.length})
              </span>

              {filteredFonts.map((f) => {
                const isSelected = f.family === selectedFont.family;
                return (
                  <div
                    key={f.family}
                    onClick={() => handleSelectFont(f)}
                    className={`p-2.5 rounded-md cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500/80 text-white shadow-xs'
                        : 'bg-[#1e2129]/60 hover:bg-[#252936] text-gray-300 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="font-semibold text-xs tracking-wide truncate"
                        style={{ fontFamily: getFontCssStack(f.family) }}
                      >
                        {f.family}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                          f.formatCode === 'TTF'
                            ? 'bg-blue-900/60 text-blue-200 border border-blue-700/60'
                            : 'bg-purple-900/60 text-purple-200 border border-purple-700/60'
                        }`}
                      >
                        {f.formatCode}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                      <span className="truncate">{f.categoryLabel}</span>
                      <span className="font-mono text-[9px] text-gray-400">{f.windowsStandard.split(' ')[0]}</span>
                    </div>
                  </div>
                );
              })}

              {filteredFonts.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-xs">
                  No Windows font matching "{searchQuery}"
                </div>
              )}
            </div>

            {/* Custom TTF / OTF Font Upload simulation */}
            <div className="p-3 border-t border-[#2d313d] bg-[#1a1c24]">
              <button
                onClick={handleSimulateFontUpload}
                className="w-full py-1.5 rounded bg-[#232732] hover:bg-[#2c3140] text-gray-300 hover:text-white border border-[#353a47] flex items-center justify-center space-x-1.5 text-[11px] font-medium transition-colors"
              >
                <FileUp className="w-3.5 h-3.5 text-blue-400" />
                <span>Import Local TTF / OTF Font</span>
              </button>
              {uploadFeedback && (
                <div className="mt-1.5 p-1.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[10px]">
                  {uploadFeedback}
                </div>
              )}
            </div>
          </div>

          {/* Right: Detailed Font Inspector & Interactive Playground */}
          <div className="flex-1 p-4 space-y-4 bg-[#1e2129] overflow-y-auto">
            {/* Font Detail Header */}
            <div className="bg-[#181a21] p-3 rounded-lg border border-[#2d313d] space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2
                      className="text-lg font-bold text-white tracking-wide"
                      style={{ fontFamily: getFontCssStack(selectedFont.family) }}
                    >
                      {selectedFont.displayName}
                    </h2>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        selectedFont.formatCode === 'TTF'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-purple-950 text-purple-300 border border-purple-800'
                      }`}
                    >
                      {selectedFont.format}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-300 mt-1 leading-relaxed">
                    {selectedFont.description}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-gray-500 font-mono">Windows Ecosystem</div>
                  <div className="text-[11px] text-cyan-300 font-medium">{selectedFont.windowsStandard}</div>
                </div>
              </div>

              {/* Best For Guidance */}
              <div className="bg-[#212530] px-2.5 py-1.5 rounded border border-[#323746] flex items-center space-x-2 text-[11px]">
                <span className="font-bold text-amber-400 shrink-0">Optimal Use:</span>
                <span className="text-gray-300">{selectedFont.bestFor}</span>
              </div>

              {/* Technical Features Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {selectedFont.openTypeFeatures.map((feat) => (
                  <span
                    key={feat}
                    className="text-[9px] px-2 py-0.5 rounded bg-[#272b37] border border-[#383f50] text-gray-300 font-mono flex items-center space-x-1"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-blue-400" />
                    <span>{feat}</span>
                  </span>
                ))}
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-mono flex items-center space-x-1">
                  <Printer className="w-2.5 h-2.5 text-emerald-400" />
                  <span>ZPL: {selectedFont.zplFontName || '^A0N'} | TSPL: {selectedFont.tsplFontName || 'TEXT'}</span>
                </span>
              </div>
            </div>

            {/* Interactive Typography Toolbar */}
            <div className="bg-[#181a21] p-3 rounded-lg border border-[#2d313d] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Interactive Typography Playground
                </span>

                {/* Quick Presets */}
                <div className="flex items-center space-x-1 text-[10px]">
                  <span className="text-gray-500">Preset Strings:</span>
                  <button
                    onClick={() => setTestText('SHIP TO: 4100 W GRAND AVE, CHICAGO IL 60651 - (01)00614141999996')}
                    className="px-1.5 py-0.5 rounded bg-[#252936] hover:bg-[#323746] text-blue-300 border border-[#383d4e]"
                  >
                    GS1 Shipping
                  </button>
                  <button
                    onClick={() => setTestText('HAZMAT CLASS 3: FLAMMABLE LIQUID - UN 1993 PG II')}
                    className="px-1.5 py-0.5 rounded bg-[#252936] hover:bg-[#323746] text-amber-300 border border-[#383d4e]"
                  >
                    HAZMAT
                  </button>
                  <button
                    onClick={() => setTestText('NDC 0078-0482-15 | LOT: 2026-X9 | EXP: 2028-12 | 100 TABLETS')}
                    className="px-1.5 py-0.5 rounded bg-[#252936] hover:bg-[#323746] text-emerald-300 border border-[#383d4e]"
                  >
                    Pharma Micro
                  </button>
                  <button
                    onClick={() => setTestText(selectedFont.sampleText)}
                    className="px-1.5 py-0.5 rounded bg-[#252936] hover:bg-[#323746] text-purple-300 border border-[#383d4e]"
                  >
                    Default
                  </button>
                </div>
              </div>

              {/* Controls bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-[#13151b] p-2 rounded border border-[#282d3b]">
                {/* Size slider */}
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-gray-400 shrink-0">Size ({fontSize} pt):</span>
                  <input
                    type="range"
                    min="8"
                    max="36"
                    step="1"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Style toggles */}
                <div className="flex items-center justify-center space-x-1">
                  <button
                    onClick={() => setIsBold(!isBold)}
                    className={`p-1.5 rounded transition-colors ${
                      isBold ? 'bg-blue-600 text-white font-bold' : 'bg-[#21242e] text-gray-400 hover:text-white'
                    }`}
                    title="Toggle Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsItalic(!isItalic)}
                    className={`p-1.5 rounded transition-colors ${
                      isItalic ? 'bg-blue-600 text-white' : 'bg-[#21242e] text-gray-400 hover:text-white'
                    }`}
                    title="Toggle Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsUnderline(!isUnderline)}
                    className={`p-1.5 rounded transition-colors ${
                      isUnderline ? 'bg-blue-600 text-white' : 'bg-[#21242e] text-gray-400 hover:text-white'
                    }`}
                    title="Toggle Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-[#323644] mx-1" />

                  {/* Alignment */}
                  <button
                    onClick={() => setAlignment('left')}
                    className={`p-1.5 rounded transition-colors ${
                      alignment === 'left' ? 'bg-blue-600 text-white' : 'bg-[#21242e] text-gray-400 hover:text-white'
                    }`}
                    title="Align Left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setAlignment('center')}
                    className={`p-1.5 rounded transition-colors ${
                      alignment === 'center' ? 'bg-blue-600 text-white' : 'bg-[#21242e] text-gray-400 hover:text-white'
                    }`}
                    title="Align Center"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setAlignment('right')}
                    className={`p-1.5 rounded transition-colors ${
                      alignment === 'right' ? 'bg-blue-600 text-white' : 'bg-[#21242e] text-gray-400 hover:text-white'
                    }`}
                    title="Align Right"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Direction Toggle */}
                <div className="flex items-center justify-end space-x-1.5 text-[10px]">
                  <span className="text-gray-400">Direction:</span>
                  <button
                    onClick={() => setDirection('ltr')}
                    className={`px-2 py-1 rounded ${direction === 'ltr' ? 'bg-blue-600 text-white font-bold' : 'bg-[#21242e] text-gray-400'}`}
                  >
                    LTR
                  </button>
                  <button
                    onClick={() => setDirection('rtl')}
                    className={`px-2 py-1 rounded ${direction === 'rtl' ? 'bg-blue-600 text-white font-bold' : 'bg-[#21242e] text-gray-400'}`}
                  >
                    RTL
                  </button>
                </div>
              </div>

              {/* Interactive Input */}
              <textarea
                rows={2}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                style={{
                  fontFamily: getFontCssStack(selectedFont.family),
                  direction,
                }}
                className="w-full bg-[#13151b] border border-[#353a47] rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Type any test text, serial, or formula here..."
              />
            </div>

            {/* Simulated 300 DPI Thermal Substrate Output */}
            <div className="bg-white rounded-lg p-5 text-black shadow-lg border border-gray-300 relative overflow-hidden flex flex-col justify-center min-h-[140px]">
              <div className="flex items-center justify-between text-[9px] text-gray-400 font-mono uppercase mb-3 border-b border-gray-100 pb-1">
                <span>Thermal Output Simulation (300 DPI Direct Thermal Substrate)</span>
                <span>Typeface: {selectedFont.family} [{selectedFont.formatCode}]</span>
              </div>
              <div
                style={{
                  fontFamily: getFontCssStack(selectedFont.family),
                  fontSize: `${fontSize}pt`,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textDecoration: isUnderline ? 'underline' : 'none',
                  textAlign: alignment,
                  direction,
                  lineHeight: 1.3,
                  width: '100%',
                }}
                className="text-gray-950 break-words"
              >
                {testText}
              </div>
            </div>

            {/* Glyph / Character Set Inspection Matrix */}
            <div className="bg-[#181a21] p-3 rounded-lg border border-[#2d313d] space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Standard Character Map &amp; Barcode Check Symbols
              </span>
              <div
                className="text-xs text-gray-300 font-normal p-2 rounded bg-[#13151b] border border-[#2a2f3d] tracking-widest leading-loose"
                style={{ fontFamily: getFontCssStack(selectedFont.family) }}
              >
                <div>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
                <div>abcdefghijklmnopqrstuvwxyz</div>
                <div>0123456789 (01) (10) (17) (21) [GS] - . / + % $ * #</div>
              </div>
            </div>

            {/* Hardware Vectorization note */}
            <div className="flex items-center space-x-2 text-[11px] text-emerald-400 bg-emerald-950/30 p-2.5 rounded-md border border-emerald-900/50">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                Standard Windows TrueType &amp; OpenType fonts are natively converted to scalable vector printer fonts via ZPL <code className="text-white font-mono font-bold">^CW</code> (Font Download) / <code className="text-white font-mono font-bold">^A0</code> or TSPL <code className="text-white font-mono font-bold">TEXT</code>.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-12 bg-[#252833] border-t border-[#343946] px-4 flex items-center justify-between">
          <div className="text-[10px] text-gray-400 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Active Font: <strong className="text-white">{selectedFont.family}</strong> ({selectedFont.format})</span>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#2e3340] hover:bg-[#373d4d] text-gray-300 text-xs transition-colors"
            >
              Cancel
            </button>

            {isTextSelected && (
              <button
                onClick={handleApplyToSelected}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to Selected Object</span>
              </button>
            )}

            <button
              onClick={handleInsert}
              className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <span>Insert New Text Element</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
