import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Grid,
  List,
  Plus,
  Upload,
  Download,
  Star,
  Clock,
  FileBox,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShoppingBag,
  Boxes,
  BadgeCheck,
  Package,
  ShieldAlert,
  HeartPulse,
  FolderCode,
  RotateCcw,
  Sliders,
  Printer
} from 'lucide-react';
import { TemplateRecord, TemplateFilterState, TemplateCategory } from '../../types/template';
import {
  getStoredTemplates,
  searchAndFilterTemplates,
  toggleTemplateFavorite,
  deleteTemplate,
  duplicateTemplate,
  exportTemplatePackage,
  importTemplatePackage,
  restoreBuiltinTemplates,
  cloneTemplateToDocument,
  restoreTemplateVersion
} from '../../services/templateStorage';
import { TemplateCard } from './TemplateCard';
import { TemplateDetailsDrawer } from './TemplateDetailsDrawer';
import { NewTemplateModal } from './NewTemplateModal';
import { TemplateVersionHistoryModal } from './TemplateVersionHistoryModal';
import { LabelDocument } from '../../types/label';

interface TemplateCenterProps {
  onUseTemplateToDesign: (doc: LabelDocument, templateRecord: TemplateRecord) => void;
  onEditMasterTemplate?: (templateRecord: TemplateRecord) => void;
  onClose?: () => void;
}

const CATEGORY_ITEMS: { id: TemplateCategory | 'all'; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'all', label: 'All Templates', icon: FileBox },
  { id: 'shipping', label: 'Shipping & Logistics', icon: Truck },
  { id: 'retail', label: 'Retail & Pricing', icon: ShoppingBag },
  { id: 'inventory', label: 'Inventory & Warehouse', icon: Boxes },
  { id: 'identification', label: 'Identification & Badges', icon: BadgeCheck },
  { id: 'packaging', label: 'Packaging & Cartons', icon: Package },
  { id: 'product', label: 'Product & Manufacturing', icon: Layers },
  { id: 'industrial', label: 'Industrial & GHS Safety', icon: ShieldAlert },
  { id: 'compliance', label: 'Healthcare & Compliance', icon: HeartPulse },
  { id: 'custom', label: 'Custom User Templates', icon: FolderCode },
];

export const TemplateCenter: React.FC<TemplateCenterProps> = ({
  onUseTemplateToDesign,
  onEditMasterTemplate,
  onClose,
}) => {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedType, setSelectedType] = useState<TemplateFilterState['type']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orientationFilter, setOrientationFilter] = useState<'all' | 'portrait' | 'landscape'>('all');
  const [symbologyFilter, setSymbologyFilter] = useState('all');
  const [sortBy, setSortBy] = useState<TemplateFilterState['sortBy']>('used_desc');

  // Inspection Drawer & Modals
  const [inspectedTemplate, setInspectedTemplate] = useState<TemplateRecord | null>(null);
  const [versionHistoryTarget, setVersionHistoryTarget] = useState<TemplateRecord | null>(null);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshTemplates = () => {
    const loaded = getStoredTemplates();
    setTemplates(loaded);
  };

  const handleOpenVersionHistory = (template: TemplateRecord) => {
    setVersionHistoryTarget(template);
  };

  const handleDirectRestoreVersion = (template: TemplateRecord, targetVersion: number) => {
    const res = restoreTemplateVersion(template.id, targetVersion);
    if (res.success && res.template) {
      showFeedback('success', `Restored template "${template.name}" to revision v${targetVersion} (now active as v${res.template.version}).`);
      refreshTemplates();
      if (inspectedTemplate?.id === template.id) {
        setInspectedTemplate(res.template);
      }
      if (versionHistoryTarget?.id === template.id) {
        setVersionHistoryTarget(res.template);
      }
    } else {
      showFeedback('error', res.error || 'Failed to restore template version.');
    }
  };

  useEffect(() => {
    refreshTemplates();
  }, []);

  const filterState: TemplateFilterState = {
    searchQuery,
    category: selectedCategory,
    type: selectedType,
    orientation: orientationFilter,
    unit: 'all',
    barcodeSymbology: symbologyFilter,
    sortBy,
  };

  const filteredTemplates = searchAndFilterTemplates(templates, filterState);

  // Stats calculation
  const totalCount = templates.length;
  const favoritesCount = templates.filter(t => t.favorite).length;
  const customCount = templates.filter(t => t.type === 'custom' || t.type === 'imported').length;
  const recentCount = templates.filter(t => t.lastUsedAt && t.usageCount > 0).length;

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedbackNotice({ type, message });
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 4000);
  };

  const handleToggleFavorite = (id: string) => {
    toggleTemplateFavorite(id);
    refreshTemplates();
  };

  const handleDeleteTemplate = (template: TemplateRecord) => {
    if (confirm(`Are you sure you want to delete custom template "${template.name}"?`)) {
      const result = deleteTemplate(template.id);
      if (result.success) {
        showFeedback('success', `Deleted template "${template.name}".`);
        if (inspectedTemplate?.id === template.id) {
          setInspectedTemplate(null);
        }
        refreshTemplates();
      } else {
        showFeedback('error', result.error || 'Failed to delete template.');
      }
    }
  };

  const handleDuplicateTemplate = (template: TemplateRecord) => {
    const copy = duplicateTemplate(template.id);
    if (copy) {
      showFeedback('success', `Created duplicate: "${copy.name}".`);
      refreshTemplates();
    }
  };

  const handleExportTemplate = (template: TemplateRecord) => {
    try {
      const jsonStr = exportTemplatePackage(template);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.lforge`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback('success', `Exported template "${template.name}" to .lforge package.`);
    } catch (err: any) {
      showFeedback('error', `Export failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = importTemplatePackage(content);
      if (res.success && res.template) {
        showFeedback('success', `Successfully imported template "${res.template.name}".`);
        refreshTemplates();
        setSelectedCategory('all');
        setSelectedType('imported');
      } else {
        showFeedback('error', res.error || 'Failed to parse template package.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUseTemplate = (template: TemplateRecord, sampleDataOverride?: Record<string, any>) => {
    const clonedDoc = cloneTemplateToDocument(template, true);
    if (sampleDataOverride) {
      // Overwrite document variable values with custom sample data
      template.sampleData = sampleDataOverride;
    }
    onUseTemplateToDesign(clonedDoc, template);
  };

  const handleRestoreDefaults = () => {
    if (confirm('Restore standard factory templates? Your custom templates will be preserved.')) {
      restoreBuiltinTemplates();
      refreshTemplates();
      showFeedback('success', 'Factory standard templates restored.');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#13151b] text-gray-200 select-none overflow-hidden">
      {/* Hidden File Input for .lforge / .lftemplate */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".lforge,.lftemplate,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Top Banner & Action Controls */}
      <div className="h-14 px-6 bg-[#1a1c24] border-b border-[#292d38] flex items-center justify-between shadow-sm">
        {/* Left: Branding & Search */}
        <div className="flex items-center space-x-4 flex-1 max-w-2xl">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md">
              <FileBox className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm tracking-wide">Template Center</h1>
              <p className="text-gray-400 text-[10px]">Standard &amp; Custom LabelForge Designs</p>
            </div>
          </div>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates by name, barcode type, dimensions, tag..."
              className="w-full bg-[#111318] border border-[#2d323e] focus:border-blue-500 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {feedbackNotice && (
            <div
              className={`flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium animate-in fade-in ${
                feedbackNotice.type === 'success'
                  ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-300'
                  : 'bg-red-950/80 border border-red-700 text-red-300'
              }`}
            >
              {feedbackNotice.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              )}
              <span>{feedbackNotice.message}</span>
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#232733] hover:bg-[#2c3242] text-xs text-gray-200 font-medium border border-[#333948] transition-colors"
            title="Import .lforge or .lftemplate package"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            <span>Import Package</span>
          </button>

          <button
            onClick={() => setIsNewTemplateModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Main Content Area (Sidebar + Grid/List) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Taxonomy & Filters */}
        <div className="w-64 bg-[#161820] border-r border-[#272b36] p-3 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            {/* Quick Views */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2 block mb-1">
                Library Views
              </span>
              <div className="space-y-0.5 text-xs">
                <button
                  onClick={() => {
                    setSelectedType('all');
                    setSelectedCategory('all');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
                    selectedType === 'all' && selectedCategory === 'all'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-gray-300 hover:bg-[#20232c]'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <FileBox className="w-4 h-4 text-blue-400" />
                    <span>All Templates</span>
                  </span>
                  <span className="text-[10px] opacity-80">{totalCount}</span>
                </button>

                <button
                  onClick={() => setSelectedType('favorites')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
                    selectedType === 'favorites'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-gray-300 hover:bg-[#20232c]'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span>Favorites</span>
                  </span>
                  <span className="text-[10px] opacity-80">{favoritesCount}</span>
                </button>

                <button
                  onClick={() => setSelectedType('recent')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
                    selectedType === 'recent'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-gray-300 hover:bg-[#20232c]'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>Recently Used</span>
                  </span>
                  <span className="text-[10px] opacity-80">{recentCount}</span>
                </button>

                <button
                  onClick={() => setSelectedType('custom')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
                    selectedType === 'custom'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-gray-300 hover:bg-[#20232c]'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <FolderCode className="w-4 h-4 text-purple-400" />
                    <span>My Custom Templates</span>
                  </span>
                  <span className="text-[10px] opacity-80">{customCount}</span>
                </button>
              </div>
            </div>

            {/* Categories */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 px-2 block mb-1">
                Categories
              </span>
              <div className="space-y-0.5 text-xs">
                {CATEGORY_ITEMS.filter(c => c.id !== 'all').map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id && selectedType !== 'favorites' && selectedType !== 'recent' && selectedType !== 'custom';
                  const count = templates.filter(t => t.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedType('all');
                        setSelectedCategory(cat.id);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'text-gray-300 hover:bg-[#20232c]'
                      }`}
                    >
                      <span className="flex items-center space-x-2 truncate">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{cat.label}</span>
                      </span>
                      <span className="text-[10px] opacity-80 font-mono">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer of Sidebar */}
          <div className="pt-3 border-t border-[#272b36] space-y-1 text-xs">
            <button
              onClick={handleRestoreDefaults}
              className="w-full flex items-center space-x-2 px-2 py-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-[#20232c] text-[11px]"
              title="Restore standard built-in templates"
            >
              <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
              <span>Restore Factory Presets</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#13151b]">
          {/* Secondary Filter & Sort Toolbar */}
          <div className="h-11 px-5 bg-[#171921] border-b border-[#262a36] flex items-center justify-between text-xs">
            {/* Left: Active Filters */}
            <div className="flex items-center space-x-3">
              <span className="text-gray-400 font-medium">
                Showing <strong className="text-white">{filteredTemplates.length}</strong> of {totalCount} templates
              </span>

              <div className="h-4 w-px bg-[#2f3544]" />

              {/* Orientation Filter */}
              <select
                value={orientationFilter}
                onChange={(e) => setOrientationFilter(e.target.value as any)}
                className="bg-[#101217] border border-[#2d323f] rounded px-2 py-1 text-gray-200 text-[11px] focus:outline-none"
              >
                <option value="all">All Orientations</option>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>

              {/* Symbology Filter */}
              <select
                value={symbologyFilter}
                onChange={(e) => setSymbologyFilter(e.target.value)}
                className="bg-[#101217] border border-[#2d323f] rounded px-2 py-1 text-gray-200 text-[11px] focus:outline-none"
              >
                <option value="all">All Symbologies</option>
                <option value="gs1-128">GS1-128</option>
                <option value="code128">Code 128</option>
                <option value="ean13">EAN-13</option>
                <option value="itf14">ITF-14</option>
                <option value="code39">Code 39</option>
                <option value="gs1-datamatrix">DataMatrix</option>
                <option value="qr">QR Code (2D)</option>
              </select>
            </div>

            {/* Right: Sort & Grid/List View Mode */}
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-[11px]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#101217] border border-[#2d323f] rounded px-2 py-1 text-gray-200 text-[11px] focus:outline-none font-medium"
              >
                <option value="used_desc">Most Used</option>
                <option value="modified_desc">Recently Modified</option>
                <option value="name_asc">Name (A → Z)</option>
                <option value="name_desc">Name (Z → A)</option>
                <option value="elements_desc">Element Count</option>
                <option value="version_desc">Version</option>
              </select>

              <div className="h-4 w-px bg-[#2f3544] mx-1" />

              <div className="flex items-center bg-[#101217] border border-[#2d323f] rounded p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded ${
                    viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${
                    viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Templates Grid/List View Container */}
          <div className="flex-1 overflow-y-auto p-5">
            {filteredTemplates.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredTemplates.map((tpl) => (
                    <TemplateCard
                      key={tpl.id}
                      template={tpl}
                      viewMode="grid"
                      onUseTemplate={(t) => handleUseTemplate(t)}
                      onEditMasterTemplate={onEditMasterTemplate}
                      onDuplicate={handleDuplicateTemplate}
                      onToggleFavorite={handleToggleFavorite}
                      onExport={handleExportTemplate}
                      onDelete={handleDeleteTemplate}
                      onInspect={(t) => setInspectedTemplate(t)}
                      onOpenVersionHistory={handleOpenVersionHistory}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTemplates.map((tpl) => (
                    <TemplateCard
                      key={tpl.id}
                      template={tpl}
                      viewMode="list"
                      onUseTemplate={(t) => handleUseTemplate(t)}
                      onEditMasterTemplate={onEditMasterTemplate}
                      onDuplicate={handleDuplicateTemplate}
                      onToggleFavorite={handleToggleFavorite}
                      onExport={handleExportTemplate}
                      onDelete={handleDeleteTemplate}
                      onInspect={(t) => setInspectedTemplate(t)}
                      onOpenVersionHistory={handleOpenVersionHistory}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <FileBox className="w-12 h-12 text-gray-600 mb-3" />
                <h3 className="text-white font-bold text-sm">No Matching Templates Found</h3>
                <p className="text-xs max-w-sm text-gray-500 mt-1">
                  Try adjusting your search keywords, category filters, or symbology selection.
                </p>
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setSelectedType('all');
                      setOrientationFilter('all');
                      setSymbologyFilter('all');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#222632] hover:bg-[#2b3040] text-gray-200 text-xs font-medium border border-[#353c4d]"
                  >
                    Reset All Filters
                  </button>
                  <button
                    onClick={() => setIsNewTemplateModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
                  >
                    Create New Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details Inspection Drawer */}
      <TemplateDetailsDrawer
        template={inspectedTemplate}
        onClose={() => setInspectedTemplate(null)}
        onUseTemplate={(t, sampleData) => {
          setInspectedTemplate(null);
          handleUseTemplate(t, sampleData);
        }}
        onEditMasterTemplate={onEditMasterTemplate}
        onDuplicate={handleDuplicateTemplate}
        onExport={handleExportTemplate}
        onToggleFavorite={handleToggleFavorite}
        onOpenVersionHistory={handleOpenVersionHistory}
        onRestoreVersion={handleDirectRestoreVersion}
      />

      {/* Version History & Diff Modal */}
      <TemplateVersionHistoryModal
        isOpen={Boolean(versionHistoryTarget)}
        template={versionHistoryTarget}
        onClose={() => setVersionHistoryTarget(null)}
        onRestored={(updatedTpl, restoredVer) => {
          refreshTemplates();
          setVersionHistoryTarget(updatedTpl);
          if (inspectedTemplate?.id === updatedTpl.id) {
            setInspectedTemplate(updatedTpl);
          }
          showFeedback('success', `Successfully restored template "${updatedTpl.name}" to revision v${restoredVer} (now active as v${updatedTpl.version}).`);
        }}
        onUseVersion={(tpl, doc) => {
          setVersionHistoryTarget(null);
          onUseTemplateToDesign(doc, tpl);
        }}
      />

      {/* New Template Modal */}
      <NewTemplateModal
        isOpen={isNewTemplateModalOpen}
        onClose={() => setIsNewTemplateModalOpen(false)}
        onCreated={(createdTpl) => {
          refreshTemplates();
          showFeedback('success', `Created template "${createdTpl.name}".`);
          setInspectedTemplate(createdTpl);
        }}
      />
    </div>
  );
};
