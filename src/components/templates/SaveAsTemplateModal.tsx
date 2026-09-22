import React, { useState } from 'react';
import { X, Save, Tag, FolderPlus, Layers, Info, CheckCircle2 } from 'lucide-react';
import { LabelDocument } from '../../types/label';
import { TemplateCategory } from '../../types/template';
import { createTemplateFromDocument } from '../../services/templateStorage';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LabelDocument;
  onSaved: (templateName: string) => void;
}

const CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'shipping', label: 'Shipping & Logistics' },
  { id: 'retail', label: 'Retail & Pricing' },
  { id: 'inventory', label: 'Inventory & Warehouse' },
  { id: 'product', label: 'Product & Manufacturing' },
  { id: 'identification', label: 'Identification & Badges' },
  { id: 'packaging', label: 'Packaging & Cartons' },
  { id: 'industrial', label: 'Industrial & GHS Safety' },
  { id: 'compliance', label: 'Healthcare & Compliance' },
  { id: 'custom', label: 'Custom User Templates' },
];

export const SaveAsTemplateModal: React.FC<SaveAsTemplateModalProps> = ({
  isOpen,
  onClose,
  document,
  onSaved,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(document.name || 'New Template');
  const [description, setDescription] = useState(document.description || '');
  const [category, setCategory] = useState<TemplateCategory>('custom');
  const [tagsInput, setTagsInput] = useState('custom, enterprise');
  const [author, setAuthor] = useState(document.author || 'Design Engineer');
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Template name is required.');
      return;
    }

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      createTemplateFromDocument(document, {
        name: name.trim(),
        description: description.trim(),
        category,
        tags,
        author: author.trim(),
      });

      onSaved(name.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save template.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        className="w-full max-w-lg bg-[#1a1d26] border border-[#2e3342] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[#202430] border-b border-[#2d323f] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderPlus className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-white text-base">Save as Template</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#2d323f] text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded bg-red-950/60 border border-red-800 text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-300 mb-1">
              Template Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 4x6 Shipping Carrier Label"
              className="w-full bg-[#12141a] border border-[#343a4a] focus:border-blue-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                className="w-full bg-[#12141a] border border-[#343a4a] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 mb-1">Author / Engineer</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-[#12141a] border border-[#343a4a] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-300 mb-1">Description / Purpose</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe label layout, target printer, or business use case..."
              className="w-full bg-[#12141a] border border-[#343a4a] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-300 mb-1">Tags (Comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. shipping, fedex, 4x6, thermal"
              className="w-full bg-[#12141a] border border-[#343a4a] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          {/* Current Document Snapshot Details */}
          <div className="p-3 bg-[#13151b] border border-[#292d38] rounded-lg flex items-center justify-between text-gray-400">
            <span className="flex items-center space-x-1.5 font-mono">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {document.dimensions.width} × {document.dimensions.height} {document.dimensions.unit} • {document.objects.length} Elements
              </span>
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Ready for Template Center</span>
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-[#2d323f]">
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
              <Save className="w-4 h-4" />
              <span>Save to Template Center</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
