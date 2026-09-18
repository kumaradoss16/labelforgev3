import React, { useState } from 'react';
import {
  X,
  FileBox,
  Download,
  Upload,
  ShieldCheck,
  Tag,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Printer,
  FileCode
} from 'lucide-react';
import { LabelDocument } from '../../types/label';
import { createLForgePackage, parseAndValidateLForgePackage, LForgePackage } from '../../services/lforgePackage';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: LabelDocument;
  onLoadDocument: (doc: LabelDocument) => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  onLoadDocument,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'manifest'>('export');
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message?: string;
    warnings?: string[];
  } | null>(null);

  // Generate current .lforge package
  const lforgePackage = createLForgePackage(currentDocument);
  const packageJson = JSON.stringify(lforgePackage, null, 2);

  const handleDownloadPackage = () => {
    const blob = new Blob([packageJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentDocument.name.replace(/\s+/g, '_')}.lforge`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = parseAndValidateLForgePackage(content);

      if (result.success && result.document) {
        setImportStatus({
          success: true,
          message: `Successfully validated package "${result.document.name}"`,
          warnings: result.warnings,
        });
        onLoadDocument(result.document);
      } else {
        setImportStatus({
          success: false,
          message: result.error || 'Validation failed: Not a valid .lforge package.',
          warnings: result.warnings,
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-[#1e2129] border border-[#343946] rounded-lg shadow-2xl flex flex-col max-h-[85vh] text-[#c9ccd3] text-xs overflow-hidden">
        {/* Header */}
        <div className="h-10 bg-[#252833] border-b border-[#343946] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileBox className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-white text-sm">Enterprise Template Package Manager (.lforge)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#323644] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="bg-[#1c1f26] border-b border-[#303440] px-5 flex space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'export' ? 'text-white border-blue-500 font-bold' : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Package &amp; Export</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'import' ? 'text-white border-emerald-500 font-bold' : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Validate &amp; Open (.lforge / .btw.json)</span>
          </button>

          <button
            onClick={() => setActiveTab('manifest')}
            className={`py-3 border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'manifest' ? 'text-white border-purple-500 font-bold' : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            <FileCode className="w-4 h-4 text-purple-400" />
            <span>Canonical Package Manifest</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#1e2129]">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#171921] border border-[#2e323e] rounded">
                <div className="font-semibold text-white text-sm mb-1 flex items-center space-x-2">
                  <span>{currentDocument.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300 font-mono">
                    .lforge v2.0
                  </span>
                </div>
                <p className="text-gray-400 leading-relaxed text-xs">
                  The <code className="text-blue-300 font-mono">.lforge</code> file format is an authentic, self-contained enterprise package bundling label vector geometry, Windows TTF/OTF font definitions, barcode symbology metadata, database schemas, and cryptographic checksum verification.
                </p>
              </div>

              {/* Package Metadata Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-[#171921] p-3 rounded border border-[#2e323e]">
                <div>
                  <span className="text-gray-500">Dimensions:</span>{' '}
                  <strong className="text-white font-mono">{currentDocument.dimensions.width} × {currentDocument.dimensions.height} mm</strong>
                </div>
                <div>
                  <span className="text-gray-500">Embedded Objects:</span>{' '}
                  <strong className="text-white font-mono">{currentDocument.objects.length} elements</strong>
                </div>
                <div>
                  <span className="text-gray-500">Package Checksum:</span>{' '}
                  <strong className="text-emerald-400 font-mono">{lforgePackage.manifest.checksum}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Producer Signature:</span>{' '}
                  <strong className="text-gray-300">{lforgePackage.manifest.producerVersion}</strong>
                </div>
              </div>

              {/* Dependencies Checklist */}
              <div className="p-3 bg-[#171921] border border-[#2e323e] rounded space-y-2">
                <div className="font-semibold text-xs text-gray-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Package Dependency Manifest</span>
                </div>

                <div className="text-[11px] space-y-1">
                  <div>
                    <span className="text-gray-500">Required Fonts:</span>{' '}
                    {lforgePackage.manifest.requiredFonts.length > 0 ? (
                      <span className="text-cyan-300 font-mono">{lforgePackage.manifest.requiredFonts.join(', ')}</span>
                    ) : (
                      <span className="text-gray-400 italic">None (Standard system fonts only)</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Required Symbologies:</span>{' '}
                    {lforgePackage.manifest.requiredSymbologies.length > 0 ? (
                      <span className="text-amber-300 font-mono">{lforgePackage.manifest.requiredSymbologies.join(', ')}</span>
                    ) : (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleDownloadPackage}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center space-x-2 text-xs shadow-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Package ({currentDocument.name.replace(/\s+/g, '_')}.lforge)</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[#3a3f4e] rounded-lg p-8 flex flex-col items-center justify-center text-center bg-[#171921]">
                <Upload className="w-8 h-8 text-emerald-400 mb-2" />
                <div className="font-semibold text-white text-sm mb-1">Select or drop a template package file</div>
                <div className="text-gray-400 text-xs mb-4">
                  Accepts canonical <code className="text-emerald-300 font-mono">.lforge</code> packages or legacy <code className="text-gray-300 font-mono">.btw.json</code> files.
                </div>

                <label className="cursor-pointer px-4 py-2 rounded bg-[#2a2e3b] hover:bg-[#343949] border border-[#3e4455] text-white font-medium text-xs transition-colors">
                  <span>Browse Package Files</span>
                  <input
                    type="file"
                    accept=".lforge,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {importStatus && (
                <div
                  className={`p-3 rounded border text-xs ${
                    importStatus.success
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-red-950/40 border-red-800 text-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-semibold">
                    {importStatus.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <span>{importStatus.message}</span>
                  </div>

                  {importStatus.warnings && importStatus.warnings.length > 0 && (
                    <div className="mt-2 text-[11px] space-y-0.5 text-amber-300 pl-6 list-disc">
                      {importStatus.warnings.map((w, i) => (
                        <div key={i}>• {w}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="space-y-2">
              <div className="text-gray-400 text-xs">
                Inspect raw canonical manifest JSON generated by LabelForge Enterprise Package Engine:
              </div>
              <pre className="p-3 bg-[#13151b] border border-[#2b2f3a] rounded text-[11px] font-mono text-cyan-300 overflow-auto max-h-72 leading-relaxed">
                {JSON.stringify(lforgePackage.manifest, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-10 bg-[#1a1c23] border-t border-[#2d313d] px-4 flex items-center justify-between text-[11px] text-gray-400">
          <span>Enterprise Format Compliance: ISO/IEC 15417 &amp; BarTender Compatibility Matrix</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#2c303c] hover:bg-[#383d4c] text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
