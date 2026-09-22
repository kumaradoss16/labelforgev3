import {
  TemplateRecord,
  TemplateFilterState,
  TemplateCategory,
  TemplateVariableDef,
  TemplateVersionRecord
} from '../types/template';
import { LabelDocument } from '../types/label';
import { BUILTIN_TEMPLATES } from './templateLibraryData';
import { createLForgePackage, parseAndValidateLForgePackage, LForgePackage } from './lforgePackage';

const STORAGE_KEY_TEMPLATES = 'labelforge_templates_v3';
const STORAGE_KEY_FAVORITES = 'labelforge_template_favorites_v3';
const STORAGE_KEY_RECENT = 'labelforge_template_recent_v3';

/**
 * Extracts {{variable_name}} placeholders from a LabelDocument
 */
export function extractVariablesFromDocument(doc: LabelDocument): TemplateVariableDef[] {
  const variableMap = new Map<string, TemplateVariableDef>();
  const varRegex = /\{\{([a-zA-Z0-9_.-]+)\}\}/g;

  const scanText = (content?: string) => {
    if (!content) return;
    let match;
    while ((match = varRegex.exec(content)) !== null) {
      const key = match[1];
      if (!variableMap.has(key)) {
        let type: TemplateVariableDef['type'] = 'text';
        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('exp')) type = 'date';
        else if (key.toLowerCase().includes('price') || key.toLowerCase().includes('mrp') || key.toLowerCase().includes('cost')) type = 'currency';
        else if (key.toLowerCase().includes('qty') || key.toLowerCase().includes('count') || key.toLowerCase().includes('weight')) type = 'number';
        else if (key.toLowerCase().includes('barcode') || key.toLowerCase().includes('gtin') || key.toLowerCase().includes('sscc')) type = 'barcode';
        else if (key.toLowerCase().includes('qr') || key.toLowerCase().includes('url')) type = 'qr';

        variableMap.set(key, {
          key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          type,
          defaultValue: `[${key}]`,
          sampleValue: `Sample ${key.replace(/_/g, ' ')}`,
          required: false,
        });
      }
    }
  };

  for (const obj of doc.objects) {
    if ('text' in obj && typeof (obj as any).text === 'string') {
      scanText((obj as any).text);
    }
    if ('value' in obj && typeof (obj as any).value === 'string') {
      scanText((obj as any).value);
    }
  }

  return Array.from(variableMap.values());
}

/**
 * Replaces {{variable}} placeholders with values from data map safely
 */
export function resolveTemplateVariables(templateStr: string, data: Record<string, any>): string {
  if (!templateStr || typeof templateStr !== 'string') return '';
  return templateStr.replace(/\{\{([a-zA-Z0-9_.-]+)\}\}/g, (match, key) => {
    if (key in data && data[key] !== undefined && data[key] !== null) {
      return String(data[key]);
    }
    return match;
  });
}

/**
 * Initializes and retrieves all stored templates (Built-in + Custom + Imported)
 */
export function getStoredTemplates(): TemplateRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (!raw) {
      // First boot: Initialize with built-in templates
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(BUILTIN_TEMPLATES));
      return BUILTIN_TEMPLATES;
    }

    const parsed: TemplateRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(BUILTIN_TEMPLATES));
      return BUILTIN_TEMPLATES;
    }

    // Ensure all built-in templates exist in state even if newer ones were added
    const existingIds = new Set(parsed.map(t => t.id));
    const missingBuiltins = BUILTIN_TEMPLATES.filter(bt => !existingIds.has(bt.id));
    if (missingBuiltins.length > 0) {
      const merged = [...parsed, ...missingBuiltins];
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(merged));
      return merged;
    }

    return parsed;
  } catch (err) {
    console.error('Failed to load templates from localStorage:', err);
    return BUILTIN_TEMPLATES;
  }
}

/**
 * Persists all templates to storage
 */
export function persistTemplates(templates: TemplateRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(templates));
  } catch (err) {
    console.error('Failed to persist templates to localStorage:', err);
  }
}

/**
 * Retrieves a single template by ID
 */
export function getTemplateById(id: string): TemplateRecord | undefined {
  const templates = getStoredTemplates();
  return templates.find(t => t.id === id);
}

/**
 * Creates or updates a template
 */
export function saveTemplate(
  template: TemplateRecord,
  changeSummary: string = 'Updated template configuration',
  author?: string
): { success: boolean; template?: TemplateRecord; error?: string } {
  const templates = getStoredTemplates();
  const existingIdx = templates.findIndex(t => t.id === template.id);

  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const existing = templates[existingIdx];
    if (existing.isReadOnly && existing.type === 'builtin') {
      return {
        success: false,
        error: `Template "${existing.name}" is a protected built-in standard. Please use "Duplicate Template" to create an editable custom copy.`,
      };
    }

    const newVersion = (existing.version || 1) + 1;
    const authorName = author || template.createdBy || existing.createdBy || 'Design Engineer';
    const versionRecord: TemplateVersionRecord = {
      version: existing.version || 1,
      updatedAt: existing.updatedAt || now,
      updatedBy: existing.createdBy || authorName,
      changeSummary: changeSummary || `Revision v${existing.version || 1} update`,
      snapshotDoc: JSON.parse(JSON.stringify(existing.document)),
      elementCount: existing.document.objects.length,
      width: existing.width || existing.document.dimensions.width,
      height: existing.height || existing.document.dimensions.height,
      unit: existing.unit || existing.document.dimensions.unit,
      orientation: existing.orientation || existing.document.dimensions.orientation,
    };

    const updatedTemplate: TemplateRecord = {
      ...template,
      version: newVersion,
      updatedAt: now,
      createdBy: authorName,
      versionHistory: [versionRecord, ...(existing.versionHistory || [])].slice(0, 25),
      elementCount: template.document.objects.length,
    };

    templates[existingIdx] = updatedTemplate;
    persistTemplates(templates);
    return { success: true, template: updatedTemplate };
  } else {
    // New template
    const authorName = author || template.createdBy || 'Design Engineer';
    const newTemplate: TemplateRecord = {
      ...template,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: authorName,
      usageCount: 0,
      elementCount: template.document.objects.length,
      versionHistory: [],
    };

    templates.unshift(newTemplate);
    persistTemplates(templates);
    return { success: true, template: newTemplate };
  }
}

/**
 * Restores a template to a previous version snapshot
 */
export function restoreTemplateVersion(
  templateId: string,
  targetVersion: number,
  author: string = 'Design Engineer',
  customNote?: string
): { success: boolean; template?: TemplateRecord; error?: string } {
  const templates = getStoredTemplates();
  const existingIdx = templates.findIndex(t => t.id === templateId);
  if (existingIdx === -1) {
    return { success: false, error: 'Template not found' };
  }

  const existing = templates[existingIdx];
  if (existing.isReadOnly && existing.type === 'builtin') {
    return { success: false, error: 'Cannot modify built-in standard template' };
  }

  // Find the snapshot in versionHistory
  const snapshotRecord = (existing.versionHistory || []).find(v => v.version === targetVersion);
  if (!snapshotRecord) {
    return { success: false, error: `Version v${targetVersion} snapshot not found in audit history` };
  }

  const now = new Date().toISOString();
  const nextVersionNumber = (existing.version || 1) + 1;

  // Snapshot the CURRENT state before restoring so we never lose current progress
  const currentSnapshot: TemplateVersionRecord = {
    version: existing.version || 1,
    updatedAt: existing.updatedAt || now,
    updatedBy: existing.createdBy || author,
    changeSummary: `Pre-restore snapshot before reverting to v${targetVersion}`,
    snapshotDoc: JSON.parse(JSON.stringify(existing.document)),
    elementCount: existing.document.objects.length,
    width: existing.width || existing.document.dimensions.width,
    height: existing.height || existing.document.dimensions.height,
    unit: existing.unit || existing.document.dimensions.unit,
    orientation: existing.orientation || existing.document.dimensions.orientation,
    isRestorationPoint: true,
    restoredFromVersion: targetVersion,
  };

  // Reconstitute document from snapshotDoc
  const restoredDoc: LabelDocument = JSON.parse(JSON.stringify(snapshotRecord.snapshotDoc));
  restoredDoc.modified = now;
  if (!restoredDoc.metadata) {
    restoredDoc.metadata = {
      version: nextVersionNumber,
      status: 'approved',
    };
  } else {
    restoredDoc.metadata.version = nextVersionNumber;
  }

  const variables = extractVariablesFromDocument(restoredDoc);
  const sampleData: Record<string, any> = {};
  for (const v of variables) {
    sampleData[v.key] = v.sampleValue || v.defaultValue || `[${v.key}]`;
  }

  let primarySymbology: string | undefined;
  let supportsQr = false;
  for (const obj of restoredDoc.objects) {
    if (obj.type === 'barcode') {
      primarySymbology = (obj as any).barcodeStyle?.symbology || 'code128';
    } else if (obj.type === 'qrcode' || obj.type === 'datamatrix') {
      supportsQr = true;
    }
  }

  const updatedTemplate: TemplateRecord = {
    ...existing,
    version: nextVersionNumber,
    updatedAt: now,
    createdBy: author,
    document: restoredDoc,
    width: restoredDoc.dimensions.width,
    height: restoredDoc.dimensions.height,
    unit: (restoredDoc.dimensions.unit as any) || 'mm',
    orientation: restoredDoc.dimensions.orientation || 'portrait',
    elementCount: restoredDoc.objects.length,
    primarySymbology,
    supportsQr,
    variables,
    sampleData: { ...existing.sampleData, ...sampleData },
    versionHistory: [
      currentSnapshot,
      ...(existing.versionHistory || []),
    ].slice(0, 25),
  };

  templates[existingIdx] = updatedTemplate;
  persistTemplates(templates);
  return { success: true, template: updatedTemplate };
}

/**
 * Creates a manual milestone version checkpoint
 */
export function createManualVersionCheckpoint(
  templateId: string,
  changeSummary: string,
  author: string = 'Design Engineer'
): { success: boolean; template?: TemplateRecord; error?: string } {
  const templates = getStoredTemplates();
  const existingIdx = templates.findIndex(t => t.id === templateId);
  if (existingIdx === -1) {
    return { success: false, error: 'Template not found' };
  }

  const existing = templates[existingIdx];
  const now = new Date().toISOString();
  const nextVersion = (existing.version || 1) + 1;

  const versionRecord: TemplateVersionRecord = {
    version: existing.version || 1,
    updatedAt: now,
    updatedBy: author,
    changeSummary: changeSummary.trim() || `Milestone Checkpoint v${existing.version}`,
    snapshotDoc: JSON.parse(JSON.stringify(existing.document)),
    elementCount: existing.document.objects.length,
    width: existing.width || existing.document.dimensions.width,
    height: existing.height || existing.document.dimensions.height,
    unit: existing.unit || existing.document.dimensions.unit,
    orientation: existing.orientation || existing.document.dimensions.orientation,
    isMilestone: true,
  };

  const updatedTemplate: TemplateRecord = {
    ...existing,
    version: nextVersion,
    updatedAt: now,
    createdBy: author,
    versionHistory: [versionRecord, ...(existing.versionHistory || [])].slice(0, 25),
  };

  templates[existingIdx] = updatedTemplate;
  persistTemplates(templates);
  return { success: true, template: updatedTemplate };
}

/**
 * Creates a new template by forking a specific historical version
 */
export function forkTemplateFromVersion(
  templateId: string,
  targetVersion: number,
  newName: string,
  author: string = 'Design Engineer'
): { success: boolean; template?: TemplateRecord; error?: string } {
  const template = getTemplateById(templateId);
  if (!template) return { success: false, error: 'Template not found' };

  let targetDoc: LabelDocument;
  if (template.version === targetVersion) {
    targetDoc = JSON.parse(JSON.stringify(template.document));
  } else {
    const snap = (template.versionHistory || []).find(v => v.version === targetVersion);
    if (!snap) return { success: false, error: `Version v${targetVersion} snapshot not found` };
    targetDoc = JSON.parse(JSON.stringify(snap.snapshotDoc));
  }

  const forked = createTemplateFromDocument(targetDoc, {
    name: newName.trim() || `${template.name} (Forked v${targetVersion})`,
    description: `Created from version v${targetVersion} of ${template.name}`,
    category: template.category,
    tags: [...template.tags, `fork-v${targetVersion}`],
    author,
  });

  return { success: true, template: forked };
}

/**
 * Creates a new template record from an active LabelDocument
 */
export function createTemplateFromDocument(
  doc: LabelDocument,
  meta: {
    name: string;
    description?: string;
    category: TemplateCategory;
    tags?: string[];
    author?: string;
    version?: number;
    changeSummary?: string;
  }
): TemplateRecord {
  const variables = extractVariablesFromDocument(doc);
  const sampleData: Record<string, any> = {};
  for (const v of variables) {
    sampleData[v.key] = v.sampleValue || v.defaultValue || `[${v.key}]`;
  }

  // Detect primary symbology
  let primarySymbology: string | undefined;
  let supportsQr = false;
  for (const obj of doc.objects) {
    if (obj.type === 'barcode') {
      primarySymbology = (obj as any).barcodeStyle?.symbology || 'code128';
    } else if (obj.type === 'qrcode' || obj.type === 'datamatrix') {
      supportsQr = true;
    }
  }

  const templateId = `tpl-custom-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newTemplate: TemplateRecord = {
    id: templateId,
    name: meta.name.trim() || 'Custom Label Template',
    description: meta.description?.trim() || doc.description || 'Custom user created label template',
    category: meta.category || 'custom',
    type: 'custom',
    status: 'active',
    width: doc.dimensions.width,
    height: doc.dimensions.height,
    unit: (doc.dimensions.unit as any) || 'mm',
    orientation: doc.dimensions.orientation || 'portrait',
    tags: meta.tags || ['custom', 'user-created'],
    favorite: false,
    createdAt: now,
    updatedAt: now,
    createdBy: meta.author || doc.author || 'Design Engineer',
    version: meta.version || 1,
    isReadOnly: false,
    isLocked: false,
    primarySymbology,
    supportsQr,
    elementCount: doc.objects.length,
    variables,
    sampleData,
    document: {
      ...doc,
      id: `doc-${templateId}`,
      name: meta.name.trim(),
      description: meta.description?.trim(),
      modified: now,
    },
    usageCount: 0,
  };

  saveTemplate(newTemplate, meta.changeSummary || 'Initial template creation from active design');
  return newTemplate;
}

/**
 * Duplicates an existing template with a new unique ID
 */
export function duplicateTemplate(id: string, newName?: string): TemplateRecord | null {
  const templates = getStoredTemplates();
  const source = templates.find(t => t.id === id);
  if (!source) return null;

  const now = new Date().toISOString();
  const newId = `tpl-copy-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const copyName = newName?.trim() || `${source.name} (Copy)`;

  const duplicatedDoc: LabelDocument = {
    ...JSON.parse(JSON.stringify(source.document)),
    id: `doc-${newId}`,
    name: copyName,
    created: now,
    modified: now,
  };

  const copy: TemplateRecord = {
    ...JSON.parse(JSON.stringify(source)),
    id: newId,
    name: copyName,
    type: 'custom',
    isReadOnly: false,
    isLocked: false,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'Design Engineer',
    version: 1,
    usageCount: 0,
    lastUsedAt: undefined,
    versionHistory: [],
    document: duplicatedDoc,
  };

  templates.unshift(copy);
  persistTemplates(templates);
  return copy;
}

/**
 * Deletes a custom or imported template (Built-ins are protected)
 */
export function deleteTemplate(id: string): { success: boolean; error?: string } {
  const templates = getStoredTemplates();
  const target = templates.find(t => t.id === id);
  if (!target) return { success: false, error: 'Template not found.' };

  if (target.isReadOnly && target.type === 'builtin') {
    return { success: false, error: 'Cannot delete protected built-in standard templates.' };
  }

  const updated = templates.filter(t => t.id !== id);
  persistTemplates(updated);
  return { success: true };
}

/**
 * Toggles template favorite status
 */
export function toggleTemplateFavorite(id: string): boolean {
  const templates = getStoredTemplates();
  const target = templates.find(t => t.id === id);
  if (!target) return false;

  target.favorite = !target.favorite;
  target.updatedAt = new Date().toISOString();
  persistTemplates(templates);
  return target.favorite;
}

/**
 * Records template usage timestamp and increments count
 */
export function recordTemplateUsage(id: string): void {
  const templates = getStoredTemplates();
  const target = templates.find(t => t.id === id);
  if (!target) return;

  target.usageCount = (target.usageCount || 0) + 1;
  target.lastUsedAt = new Date().toISOString();
  persistTemplates(templates);
}

/**
 * Restores factory default built-in templates
 */
export function restoreBuiltinTemplates(): void {
  const templates = getStoredTemplates();
  const customTemplates = templates.filter(t => t.type !== 'builtin');
  const merged = [...customTemplates, ...BUILTIN_TEMPLATES];
  persistTemplates(merged);
}

/**
 * Creates an independent working LabelDocument from a Template (Workflow: Use Template -> New Design)
 */
export function cloneTemplateToDocument(
  template: TemplateRecord,
  applySampleData: boolean = true
): LabelDocument {
  const now = new Date().toISOString();
  const clonedDoc: LabelDocument = JSON.parse(JSON.stringify(template.document));

  clonedDoc.id = `design-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  clonedDoc.name = `${template.name} - Design`;
  clonedDoc.created = now;
  clonedDoc.modified = now;
  clonedDoc.metadata = {
    targetPrinter: clonedDoc.metadata?.targetPrinter || 'Thermal-01',
    site: clonedDoc.metadata?.site || 'Global Distribution Center',
    version: 1,
    status: 'draft',
  };

  // If sample data substitution is requested, apply variables into object text/values
  if (applySampleData && template.sampleData) {
    for (const obj of clonedDoc.objects) {
      if ('text' in obj && typeof (obj as any).text === 'string') {
        (obj as any).text = resolveTemplateVariables((obj as any).text, template.sampleData);
      }
      if ('value' in obj && typeof (obj as any).value === 'string') {
        (obj as any).value = resolveTemplateVariables((obj as any).value, template.sampleData);
      }
    }
  }

  // Increment usage count for the template
  recordTemplateUsage(template.id);

  return clonedDoc;
}

/**
 * Exports a template as a canonical .lftemplate / .lforge JSON package
 */
export function exportTemplatePackage(template: TemplateRecord): string {
  const pkg = createLForgePackage(template.document);
  return JSON.stringify({
    ...pkg,
    templateMetadata: {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      variables: template.variables,
      sampleData: template.sampleData,
      printConfig: template.printConfig,
      version: template.version,
    }
  }, null, 2);
}

/**
 * Safely imports a .lftemplate or .lforge file
 */
export function importTemplatePackage(rawContent: string): {
  success: boolean;
  template?: TemplateRecord;
  warnings: string[];
  error?: string;
} {
  const parseResult = parseAndValidateLForgePackage(rawContent);
  if (!parseResult.success || !parseResult.document) {
    return {
      success: false,
      warnings: parseResult.warnings,
      error: parseResult.error || 'Invalid template package format.',
    };
  }

  try {
    const rawParsed = JSON.parse(rawContent);
    const meta = rawParsed.templateMetadata || {};
    const doc = parseResult.document;

    const templateId = `tpl-imported-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const variables = meta.variables || extractVariablesFromDocument(doc);
    const sampleData = meta.sampleData || {};

    const importedTemplate: TemplateRecord = {
      id: templateId,
      name: (meta.name || doc.name || 'Imported Template').trim(),
      description: meta.description || doc.description || 'Imported enterprise template package',
      category: meta.category || 'custom',
      type: 'imported',
      status: 'active',
      width: doc.dimensions.width,
      height: doc.dimensions.height,
      unit: (doc.dimensions.unit as any) || 'mm',
      orientation: doc.dimensions.orientation || 'portrait',
      tags: meta.tags || ['imported'],
      favorite: false,
      createdAt: now,
      updatedAt: now,
      createdBy: parseResult.manifest?.author || 'External Import',
      version: meta.version || 1,
      isReadOnly: false,
      isLocked: false,
      elementCount: doc.objects.length,
      variables,
      sampleData,
      printConfig: meta.printConfig,
      document: {
        ...doc,
        id: `doc-${templateId}`,
        name: (meta.name || doc.name || 'Imported Template').trim(),
        modified: now,
      },
      usageCount: 0,
    };

    saveTemplate(importedTemplate, 'Imported from .lforge/.lftemplate package');

    return {
      success: true,
      template: importedTemplate,
      warnings: parseResult.warnings,
    };
  } catch (err: any) {
    return {
      success: false,
      warnings: parseResult.warnings,
      error: `Failed to assemble imported template record: ${err?.message || 'Unknown error'}`,
    };
  }
}

/**
 * Filters and searches templates by user criteria
 */
export function searchAndFilterTemplates(
  templates: TemplateRecord[],
  filter: TemplateFilterState
): TemplateRecord[] {
  return templates.filter(t => {
    // 1. Search Query
    if (filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      const matchName = t.name.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchCategory = t.category.toLowerCase().includes(q);
      const matchTags = t.tags.some(tag => tag.toLowerCase().includes(q));
      const matchSymbology = (t.primarySymbology || '').toLowerCase().includes(q);
      const matchSize = `${t.width}x${t.height}`.includes(q) || `${t.width}×${t.height}`.includes(q);

      if (!matchName && !matchDesc && !matchCategory && !matchTags && !matchSymbology && !matchSize) {
        return false;
      }
    }

    // 2. Category
    if (filter.category !== 'all' && t.category !== filter.category) {
      return false;
    }

    // 3. Type Filter
    if (filter.type === 'builtin' && t.type !== 'builtin') return false;
    if (filter.type === 'custom' && t.type !== 'custom') return false;
    if (filter.type === 'imported' && t.type !== 'imported') return false;
    if (filter.type === 'favorites' && !t.favorite) return false;
    if (filter.type === 'recent' && (!t.lastUsedAt || t.usageCount === 0)) return false;

    // 4. Orientation
    if (filter.orientation !== 'all' && t.orientation !== filter.orientation) {
      return false;
    }

    // 5. Unit
    if (filter.unit !== 'all' && t.unit !== filter.unit) {
      return false;
    }

    // 6. Barcode Symbology
    if (filter.barcodeSymbology && filter.barcodeSymbology !== 'all') {
      if (filter.barcodeSymbology === 'qr' && !t.supportsQr) return false;
      if (filter.barcodeSymbology !== 'qr' && t.primarySymbology !== filter.barcodeSymbology) return false;
    }

    // 7. Tag
    if (filter.tag && !t.tags.includes(filter.tag)) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    switch (filter.sortBy) {
      case 'name_asc':
        return a.name.localeCompare(b.name);
      case 'name_desc':
        return b.name.localeCompare(a.name);
      case 'modified_desc':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'modified_asc':
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      case 'used_desc':
        return (b.usageCount || 0) - (a.usageCount || 0);
      case 'version_desc':
        return (b.version || 1) - (a.version || 1);
      case 'elements_desc':
        return (b.elementCount || 0) - (a.elementCount || 0);
      default:
        return 0;
    }
  });
}
