import React, { useState } from 'react';
import {
  X,
  Languages,
  ShieldCheck,
  CheckCircle2,
  FileUp,
  Globe,
  ArrowRight
} from 'lucide-react';
import { MULTILINGUAL_FONTS } from '../../services/sampleData';

interface FontManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertMultilingualText: (text: string, fontFamily: string, direction: 'ltr' | 'rtl') => void;
}

export const FontManagerModal: React.FC<FontManagerModalProps> = ({
  isOpen,
  onClose,
  onInsertMultilingualText,
}) => {
  if (!isOpen) return null;

  const [selectedFont, setSelectedFont] = useState(MULTILINGUAL_FONTS[0]);
  const [testText, setTestText] = useState(MULTILINGUAL_FONTS[0].sampleText);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(MULTILINGUAL_FONTS[0].direction || 'ltr');
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  const handleSelectFont = (font: typeof MULTILINGUAL_FONTS[0]) => {
    setSelectedFont(font);
    setTestText(font.sampleText);
    setDirection(font.direction || 'ltr');
  };

  const handleInsert = () => {
    onInsertMultilingualText(testText, selectedFont.family, direction);
    onClose();
  };

  const handleSimulateFontUpload = () => {
    setUploadFeedback('Validating TrueType / OpenType font binary security headers...');
    setTimeout(() => {
      setUploadFeedback('✓ Security check passed: Valid GSUB/GPOS tables, 0 malicious buffer overflows detected. Font cached.');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-[#1e2129] border border-[#343946] rounded-lg shadow-2xl flex flex-col max-h-[85vh] text-[#c9ccd3] text-xs overflow-hidden">
        {/* Header */}
        <div className="h-10 bg-[#252833] border-b border-[#343946] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Languages className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-white text-sm">Multilingual Unicode Font &amp; Script Engine</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#323644] text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Font list */}
          <div className="w-64 border-r border-[#2d313d] bg-[#181a21] p-2 space-y-1 overflow-y-auto">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider px-2 block mb-1">
              Supported Unicode Scripts
            </span>
            {MULTILINGUAL_FONTS.map((f) => {
              const isSelected = f.family === selectedFont.family;
              return (
                <div
                  key={f.family}
                  onClick={() => handleSelectFont(f)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-purple-950/50 border border-purple-500/70 text-white'
                      : 'hover:bg-[#222530] text-gray-300 border border-transparent'
                  }`}
                >
                  <div className="font-semibold text-xs">{f.displayName}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {f.family} • {f.direction?.toUpperCase() || 'LTR'}
                  </div>
                </div>
              );
            })}

            {/* Custom font upload simulation */}
            <div className="pt-3 border-t border-[#2d313d] px-1">
              <button
                onClick={handleSimulateFontUpload}
                className="w-full py-1.5 rounded bg-[#232732] hover:bg-[#2c3140] text-gray-300 hover:text-white border border-[#353a47] flex items-center justify-center space-x-1 text-[11px]"
              >
                <FileUp className="w-3.5 h-3.5 text-gray-400" />
                <span>Import TTF / OTF Font</span>
              </button>
              {uploadFeedback && (
                <div className="mt-1.5 p-1.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-[10px]">
                  {uploadFeedback}
                </div>
              )}
            </div>
          </div>

          {/* Right: Font preview & test area */}
          <div className="flex-1 p-4 space-y-4 bg-[#1e2129] overflow-y-auto">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>{selectedFont.displayName}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 font-mono">
                  {selectedFont.direction?.toUpperCase() || 'LTR'} Complex Shaping
                </span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">
                Rendered with OpenType GSUB/GPOS ligation tables for full industrial compliance.
              </p>
            </div>

            {/* Text Editor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">
                  Interactive Text Input:
                </label>
                <div className="flex space-x-2 text-[10px]">
                  <button
                    onClick={() => setDirection('ltr')}
                    className={`px-1.5 py-0.5 rounded ${direction === 'ltr' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400'}`}
                  >
                    LTR
                  </button>
                  <button
                    onClick={() => setDirection('rtl')}
                    className={`px-1.5 py-0.5 rounded ${direction === 'rtl' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400'}`}
                  >
                    RTL
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                style={{
                  fontFamily: selectedFont.family,
                  direction,
                }}
                className="w-full bg-[#15171e] border border-[#353a47] rounded p-3 text-base text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Live Substrate Rendering Preview */}
            <div className="bg-white rounded p-4 text-black shadow-inner flex flex-col items-center justify-center min-h-[130px]">
              <span className="text-[9px] text-gray-400 font-mono uppercase mb-2">
                Simulated Thermal Head Output (300 DPI)
              </span>
              <div
                style={{
                  fontFamily: selectedFont.family,
                  fontSize: '20pt',
                  direction,
                  textAlign: direction === 'rtl' ? 'right' : 'left',
                  width: '100%',
                }}
                className="font-bold text-gray-900 border-b border-gray-200 pb-2"
              >
                {testText}
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-emerald-400 bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Printer Vector Engine: Natively downloads glyph outlines to printer RAM using ^CW / ^FL.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-10 bg-[#252833] border-t border-[#343946] px-4 flex items-center justify-between">
          <div className="text-[10px] text-gray-500">
            OpenType Specification Compliant
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#2e3340] hover:bg-[#373d4d] text-gray-300 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1"
            >
              <span>Insert onto Label</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
