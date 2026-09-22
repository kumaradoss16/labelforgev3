import React, { useState } from 'react';
import { X, Check, Copy, Download, ExternalLink, ShieldCheck, Sparkles, Layers } from 'lucide-react';
import { LabelForgeLogo, LogoVariant } from '../common/LabelForgeLogo';
import { isDesktopApp } from '../../services/desktopBridge';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [selectedVariant, setSelectedVariant] = useState<LogoVariant>('full');
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null);

  if (!isOpen) return null;

  const variants: { id: LogoVariant; title: string; subtitle: string; desc: string }[] = [
    {
      id: 'full',
      title: 'Full Color',
      subtitle: '(Primary)',
      desc: 'Official primary brand mark: Deep navy squircle, layered 3D electric blue shadow plate, crisp white label, cyan fold & scanner brackets, warm orange corner accent.',
    },
    {
      id: 'dark',
      title: 'Dark Mode',
      subtitle: '(Alternative)',
      desc: 'Charcoal and deep obsidian squircle with calibrated high-contrast cyan & cobalt vectors for dark themes.',
    },
    {
      id: 'light',
      title: 'Light Mode',
      subtitle: '(Alternative)',
      desc: 'Crisp porcelain-white container with subtle border outline and full-color tag geometry for light environments.',
    },
    {
      id: 'mono',
      title: 'Monochrome',
      subtitle: '(1 Color)',
      desc: 'High-contrast monochrome silhouette for single-color direct thermal tags, laser engraving, and documentation.',
    },
    {
      id: 'small',
      title: 'Small Size',
      subtitle: '(16×16 / 32×32)',
      desc: 'Pixel-aligned vector simplification for browser favicons, desktop taskbars, and quick-access toolbar icons.',
    },
  ];

  const handleCopySvg = (varId: LogoVariant) => {
    // Read the SVG or produce clean inline SVG string
    const svgCode = `<svg width="128" height="128" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- LabelForge Studio Brand Icon (${varId}) -->
  <rect x="0" y="0" width="100" height="100" rx="23" fill="${varId === 'light' ? '#ffffff' : varId === 'mono' ? '#000000' : '#0c1a3e'}" />
  <path d="M 61 17.5 L 68.5 17.5 A 3 3 0 0 1 71.5 20.5 L 71.5 28" stroke="${varId === 'mono' ? '#ffffff' : '#00e5ff'}" stroke-width="3.6" stroke-linecap="round" />
  <path d="M 30 38 L 30 52.5 A 6 6 0 0 0 34 58 L 46 68 A 7 7 0 0 0 52 70 L 61 70 L 62.5 65.5 L 44 65.5 A 5 5 0 0 1 40 61.5 L 33 46 Z" fill="${varId === 'mono' ? '#222222' : '#003b87'}" />
  <path d="M 34.5 28 A 7 7 0 0 0 30 34.5 L 30 51 A 5 5 0 0 0 33 55 L 44 66 A 6 6 0 0 0 49 68 L 63 68 A 5 5 0 0 0 67 65 L 67.5 60 L 64 57 L 60 57 A 4 4 0 0 1 57 55.5 L 42 38 A 4 4 0 0 1 41 33 L 41 28 Z" fill="${varId === 'mono' ? '#444444' : '#0070f3'}" />
  <path d="M 60.5 45 L 68.5 37 A 4 4 0 0 1 71 40 L 71 43 A 4 4 0 0 1 69 46.5 L 63 51 A 3 3 0 0 1 60 50 Z" fill="${varId === 'mono' ? '#888888' : '#ff7a00'}" />
  <path d="M 43 16.5 A 6.5 6.5 0 0 0 36.5 23 L 36.5 43 A 6 6 0 0 0 38.5 47.5 L 45 54 A 5 5 0 0 0 48.5 55.5 L 57 55.5 A 5 5 0 0 0 60.5 54 L 68 46.5 A 5 5 0 0 0 69.5 43 L 69.5 34 A 4 4 0 0 0 68 31 L 59 22 L 52 16.5 Z" fill="#ffffff" />
  <circle cx="43" cy="23.5" r="4.2" fill="${varId === 'light' ? '#f1f5f9' : varId === 'mono' ? '#000000' : '#0c1a3e'}" />
  <path d="M 52 16.5 L 52 24.5 A 1.5 1.5 0 0 0 53.5 26 L 61 24.5 Z" fill="${varId === 'mono' ? '#cccccc' : '#00c4ff'}" />
  <g fill="${varId === 'mono' ? '#000000' : '#091430'}">
    <rect x="41.5" y="30" width="2.8" height="15" rx="0.7" />
    <rect x="45.5" y="30" width="2.0" height="15" rx="0.6" />
    <rect x="48.7" y="30" width="1.4" height="15" rx="0.5" />
    <rect x="51.3" y="30" width="2.0" height="15" rx="0.6" />
    <rect x="54.5" y="30" width="2.8" height="15" rx="0.7" />
    <rect x="58.5" y="30" width="1.4" height="15" rx="0.5" />
  </g>
</svg>`;
    navigator.clipboard.writeText(svgCode);
    setCopiedVariant(varId);
    setTimeout(() => setCopiedVariant(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-[#181a22] border border-[#2e3342] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-gray-200">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1e222e] border-b border-[#2e3342] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <LabelForgeLogo size={28} variant="full" className="rounded-lg shadow-sm" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center space-x-2">
                <span>LabelForge Studio 2026</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/60 font-mono font-bold">
                  Enterprise v3.4.0
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Official Brand Identity, Icon Suite &amp; System Diagnostics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2d3344] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Hero Showcase */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-[#141824] to-[#0f121a] border border-[#2b3142] flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="shrink-0 p-3 rounded-2xl bg-[#090c14] border border-[#272e42] shadow-xl">
              <LabelForgeLogo size={110} variant={selectedVariant} />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <span className="text-base font-bold text-white tracking-wide">
                  {variants.find(v => v.id === selectedVariant)?.title}
                </span>
                <span className="text-xs text-blue-400 font-mono">
                  {variants.find(v => v.id === selectedVariant)?.subtitle}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {variants.find(v => v.id === selectedVariant)?.desc}
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <button
                  onClick={() => handleCopySvg(selectedVariant)}
                  className="px-3 py-1.5 rounded-lg bg-[#222736] hover:bg-[#2e3549] text-gray-200 text-xs font-medium flex items-center space-x-1.5 transition-colors border border-[#343b50]"
                >
                  {copiedVariant === selectedVariant ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">SVG Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      <span>Copy SVG Markup</span>
                    </>
                  )}
                </button>
                <a
                  href="/favicon.svg"
                  download="labelforge-brand-icon.svg"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </a>
              </div>
            </div>
          </div>

          {/* Icon Suite Variants Gallery (as shown in reference image) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Brand Identity Icon Specifications:</span>
              </label>
              <span className="text-[11px] text-gray-400">Click to preview style</span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {variants.map((v) => {
                const isSelected = selectedVariant === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-[#1e2538] border-blue-500 shadow-md scale-[1.02]'
                        : 'bg-[#14161f] border-[#292e3e] hover:border-gray-500 hover:bg-[#1a1e2a]'
                    }`}
                  >
                    <div className="my-1">
                      <LabelForgeLogo size={v.id === 'small' ? 32 : 44} variant={v.id} />
                    </div>
                    <div className="text-center mt-1">
                      <div className="text-[11px] font-bold text-white truncate max-w-full">
                        {v.title}
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono">
                        {v.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Engine Specifications & Environment */}
          <div className="p-4 rounded-xl bg-[#13151c] border border-[#262a37] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Application</span>
              <span className="font-semibold text-white">LabelForge Studio</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Build Target</span>
              <span className="font-semibold text-blue-400 font-mono">
                {isDesktopApp() ? 'Electron Native x64' : 'Web Studio (PWA ready)'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Spooler Bridge</span>
              <span className="font-semibold text-emerald-400 font-mono">Direct Port 9100 / REST</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Symbology Engine</span>
              <span className="font-semibold text-purple-400 font-mono">GS1 Universal 2026</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#1e222e] border-t border-[#2e3342] flex items-center justify-between text-xs">
          <span className="text-[11px] text-gray-400">
            &copy; 2026 LabelForge Systems. All enterprise rights reserved.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#2c3244] hover:bg-[#3a425a] text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
