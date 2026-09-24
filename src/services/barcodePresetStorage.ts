import { BarcodePreset, PresetCategory } from '../types/presets';
import { BarcodeSymbology, BarcodeStyle, BarcodeLabelObject } from '../types/label';

const LOCAL_STORAGE_KEY = 'labelforge_barcode_presets_v1';

// In-memory fallback if localStorage is unavailable
let memoryStore: Record<string, string> = {};

function getStorageItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // Ignore error
  }
  return memoryStore[key] || null;
}

function setStorageItem(key: string, val: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
      return;
    }
  } catch {
    // Ignore error
  }
  memoryStore[key] = val;
}

export const BUILT_IN_PRESETS: BarcodePreset[] = [
  {
    id: 'builtin-gs1-128-shipping',
    name: 'GS1-128 Shipping (SSCC)',
    description: 'Standard logistics container tracking with Application Identifiers and human-readable text.',
    category: 'Logistics',
    isBuiltIn: true,
    symbology: 'gs1-128',
    width: 65,
    height: 25,
    color: '#000000',
    backgroundColor: 'transparent',
    humanReadable: true,
    humanReadableFont: 'monospace',
    humanReadableSize: 9,
    humanReadablePosition: 'bottom',
    quietZone: true,
    quietZoneSize: 3,
    sampleValue: '(00)306141411234567890',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-upca-retail',
    name: 'UPC-A Retail POS (100% Mag)',
    description: 'Standard North American retail point-of-sale barcode with 12 numeric digits.',
    category: 'Retail',
    isBuiltIn: true,
    symbology: 'upca',
    width: 37,
    height: 26,
    color: '#000000',
    backgroundColor: 'transparent',
    humanReadable: true,
    humanReadableFont: 'monospace',
    humanReadableSize: 9,
    humanReadablePosition: 'bottom',
    quietZone: true,
    quietZoneSize: 3,
    sampleValue: '012345678905',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-ean13-retail',
    name: 'EAN-13 Global Retail',
    description: 'Standard international retail barcode with 13 numeric digits and GTIN prefix.',
    category: 'Retail',
    isBuiltIn: true,
    symbology: 'ean13',
    width: 37,
    height: 26,
    color: '#000000',
    backgroundColor: 'transparent',
    humanReadable: true,
    humanReadableFont: 'monospace',
    humanReadableSize: 9,
    humanReadablePosition: 'bottom',
    quietZone: true,
    quietZoneSize: 3,
    sampleValue: '5901234123457',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-qr-high-ecc',
    name: 'Industrial High-Durability QR (ECC-H)',
    description: 'Rugged 30% Reed-Solomon error correction for harsh manufacturing, dirt, or tear resistance.',
    category: 'Industrial 2D',
    isBuiltIn: true,
    symbology: 'qr',
    width: 30,
    height: 30,
    color: '#000000',
    backgroundColor: 'transparent',
    errorCorrectionLevel: 'H',
    humanReadable: false,
    humanReadableFont: 'monospace',
    humanReadableSize: 8,
    humanReadablePosition: 'none',
    quietZone: true,
    quietZoneSize: 2,
    sampleValue: 'https://label.acme.com/asset/RUGGED-004',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-qr-standard-web',
    name: 'Standard Commercial QR (ECC-M)',
    description: 'Balanced 15% error recovery for website URLs, brochures, and consumer packaging.',
    category: 'Industrial 2D',
    isBuiltIn: true,
    symbology: 'qr',
    width: 25,
    height: 25,
    color: '#000000',
    backgroundColor: 'transparent',
    errorCorrectionLevel: 'M',
    humanReadable: false,
    humanReadableFont: 'monospace',
    humanReadableSize: 8,
    humanReadablePosition: 'none',
    quietZone: true,
    quietZoneSize: 2,
    sampleValue: 'https://example.com/item/4921',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-gs1-datamatrix-pharma',
    name: 'Pharma GS1 DataMatrix (2D)',
    description: 'High-density 2D matrix for healthcare serialization (GTIN + Batch + Expiry + Serial).',
    category: 'Healthcare',
    isBuiltIn: true,
    symbology: 'gs1-datamatrix',
    width: 18,
    height: 18,
    color: '#000000',
    backgroundColor: 'transparent',
    errorCorrectionLevel: 'M',
    humanReadable: false,
    humanReadableFont: 'monospace',
    humanReadableSize: 8,
    humanReadablePosition: 'none',
    quietZone: true,
    quietZoneSize: 1,
    sampleValue: '(01)00614141999996(17)261231(10)LOT9921(21)SN100234',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-datamatrix-industrial',
    name: 'Component DataMatrix ECC 200',
    description: 'Compact 2D Direct Part Marking (DPM) for electronics, PCBA, and mechanical parts.',
    category: 'Industrial 2D',
    isBuiltIn: true,
    symbology: 'datamatrix',
    width: 15,
    height: 15,
    color: '#000000',
    backgroundColor: 'transparent',
    errorCorrectionLevel: 'M',
    humanReadable: false,
    humanReadableFont: 'monospace',
    humanReadableSize: 8,
    humanReadablePosition: 'none',
    quietZone: true,
    quietZoneSize: 1,
    sampleValue: 'SN-PCBA-994182-REV3',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-itf14-carton',
    name: 'ITF-14 Outer Corrugated Carton',
    description: 'Interleaved 2 of 5 with thick bearer bars for master shipping cases and corrugated board.',
    category: 'Logistics',
    isBuiltIn: true,
    symbology: 'itf14',
    width: 80,
    height: 30,
    color: '#000000',
    backgroundColor: 'transparent',
    humanReadable: true,
    humanReadableFont: 'monospace',
    humanReadableSize: 10,
    humanReadablePosition: 'bottom',
    quietZone: true,
    quietZoneSize: 5,
    sampleValue: '10012345678902',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-code39-warehouse-bin',
    name: 'Code 39 Warehouse Bin Location',
    description: 'Alphanumeric industrial barcode for rack locations, aisle tags, and inventory bins.',
    category: 'Logistics',
    isBuiltIn: true,
    symbology: 'code39',
    width: 60,
    height: 20,
    color: '#000000',
    backgroundColor: 'transparent',
    humanReadable: true,
    humanReadableFont: 'monospace',
    humanReadableSize: 9,
    humanReadablePosition: 'bottom',
    quietZone: true,
    quietZoneSize: 3,
    sampleValue: 'AISLE-04-RACK-B',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-code128-asset',
    name: 'Code 128 General Asset Tag',
    description: 'High-density 1D alphanumeric barcode for IT assets, equipment, and calibration badges.',
    category: 'Logistics',
    isBuiltIn: true,
    symbology: 'code128',
    width: 50,
    height: 20,
    color: '#000000',
    backgroundColor: 'transparent',
    humanReadable: true,
    humanReadableFont: 'monospace',
    humanReadableSize: 9,
    humanReadablePosition: 'bottom',
    quietZone: true,
    quietZoneSize: 2,
    sampleValue: 'AST-2026-99120',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-pdf417-manifest',
    name: 'PDF417 Transport Manifest (2D)',
    description: 'Stacked 2D barcode for bills of lading, hazardous material declarations, and manifests.',
    category: 'Logistics',
    isBuiltIn: true,
    symbology: 'pdf417',
    width: 75,
    height: 25,
    color: '#000000',
    backgroundColor: 'transparent',
    humanReadable: false,
    humanReadableFont: 'monospace',
    humanReadableSize: 8,
    humanReadablePosition: 'none',
    quietZone: true,
    quietZoneSize: 2,
    sampleValue: 'MANIFEST#88912/ORIGIN:ORD/DEST:LAX/HAZMAT:NONE',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-qr-safety-red',
    name: 'Safety Red Warning QR (ECC-Q)',
    description: 'High-contrast red safety QR code with 25% error correction for hazardous hazard labels.',
    category: 'Healthcare',
    isBuiltIn: true,
    symbology: 'qr',
    width: 28,
    height: 28,
    color: '#dc2626',
    backgroundColor: '#ffffff',
    errorCorrectionLevel: 'Q',
    humanReadable: false,
    humanReadableFont: 'monospace',
    humanReadableSize: 8,
    humanReadablePosition: 'none',
    quietZone: true,
    quietZoneSize: 2,
    sampleValue: 'https://safety.acme.com/sds/GHS-0881',
    createdAt: 1700000000000,
  },
  {
    id: 'builtin-datamatrix-cobalt-blue',
    name: 'Cobalt Blue Direct Part DataMatrix',
    description: 'High-contrast blue DataMatrix for medical devices and cleanroom inventory badges.',
    category: 'Healthcare',
    isBuiltIn: true,
    symbology: 'datamatrix',
    width: 20,
    height: 20,
    color: '#1d4ed8',
    backgroundColor: '#ffffff',
    errorCorrectionLevel: 'M',
    humanReadable: false,
    humanReadableFont: 'monospace',
    humanReadableSize: 8,
    humanReadablePosition: 'none',
    quietZone: true,
    quietZoneSize: 1,
    sampleValue: 'MED-DEV-UID-99042',
    createdAt: 1700000000000,
  },
];

/**
 * Load all user custom presets stored in storage
 */
export function getCustomPresets(): BarcodePreset[] {
  try {
    const raw = getStorageItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) => ({
        ...p,
        isBuiltIn: false,
        category: p.category || 'Custom',
      }));
    }
    return [];
  } catch (err) {
    console.warn('[BarcodePresetStorage] Failed to parse custom presets from storage', err);
    return [];
  }
}

/**
 * Get all available presets (built-in + custom)
 */
export function getAllPresets(): BarcodePreset[] {
  const custom = getCustomPresets();
  return [...BUILT_IN_PRESETS, ...custom];
}

/**
 * Save a new custom preset into storage
 */
export function saveCustomPreset(
  presetData: Omit<BarcodePreset, 'id' | 'createdAt' | 'isBuiltIn'>
): BarcodePreset {
  const current = getCustomPresets();
  const newPreset: BarcodePreset = {
    ...presetData,
    id: `preset-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    isBuiltIn: false,
    category: presetData.category || 'Custom',
    createdAt: Date.now(),
  };

  const updated = [newPreset, ...current];
  try {
    setStorageItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('[BarcodePresetStorage] Failed to save custom preset to storage', err);
  }
  return newPreset;
}

/**
 * Delete a custom preset by ID
 */
export function deleteCustomPreset(id: string): boolean {
  try {
    const current = getCustomPresets();
    const filtered = current.filter((p) => p.id !== id);
    setStorageItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('[BarcodePresetStorage] Failed to delete custom preset', err);
    return false;
  }
}

/**
 * Clear all custom presets from storage (useful for tests or resetting)
 */
export function clearPresetsStorage(): void {
  try {
    setStorageItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
  } catch {
    memoryStore = {};
  }
}

/**
 * Update an existing custom preset
 */
export function updateCustomPreset(id: string, updates: Partial<BarcodePreset>): BarcodePreset | null {
  try {
    const current = getCustomPresets();
    const index = current.findIndex((p) => p.id === id);
    if (index === -1) return null;

    current[index] = {
      ...current[index],
      ...updates,
      isBuiltIn: false,
    };

    setStorageItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    return current[index];
  } catch (err) {
    console.error('[BarcodePresetStorage] Failed to update custom preset', err);
    return null;
  }
}

/**
 * Export all custom presets as JSON string
 */
export function exportPresetsToJson(): string {
  const custom = getCustomPresets();
  return JSON.stringify(
    {
      app: 'LabelForge',
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      presets: custom,
    },
    null,
    2
  );
}

/**
 * Import presets from JSON string
 */
export function importPresetsFromJson(jsonString: string): { importedCount: number; errors?: string } {
  try {
    const data = JSON.parse(jsonString);
    const candidateList = Array.isArray(data) ? data : data?.presets;

    if (!Array.isArray(candidateList)) {
      return { importedCount: 0, errors: 'Invalid preset file format: expected array of presets.' };
    }

    const current = getCustomPresets();
    const currentIds = new Set(current.map((c) => c.id));
    const imported: BarcodePreset[] = [];

    for (const item of candidateList) {
      if (!item.name || !item.symbology) continue;

      const validPreset: BarcodePreset = {
        id: currentIds.has(item.id)
          ? `preset-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          : item.id || `preset-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: item.name,
        description: item.description || '',
        category: item.category || 'Custom',
        isBuiltIn: false,
        symbology: item.symbology,
        width: typeof item.width === 'number' && item.width > 0 ? item.width : 40,
        height: typeof item.height === 'number' && item.height > 0 ? item.height : 20,
        color: item.color || '#000000',
        backgroundColor: item.backgroundColor || 'transparent',
        errorCorrectionLevel: item.errorCorrectionLevel,
        humanReadable: item.humanReadable !== undefined ? !!item.humanReadable : true,
        humanReadableFont: item.humanReadableFont || 'monospace',
        humanReadableSize: item.humanReadableSize || 9,
        humanReadablePosition: item.humanReadablePosition || 'bottom',
        quietZone: item.quietZone !== undefined ? !!item.quietZone : true,
        quietZoneSize: item.quietZoneSize || 2,
        sampleValue: item.sampleValue || '1234567890',
        createdAt: item.createdAt || Date.now(),
      };

      imported.push(validPreset);
    }

    const merged = [...imported, ...current];
    setStorageItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
    return { importedCount: imported.length };
  } catch (err: any) {
    return { importedCount: 0, errors: err?.message || 'Failed to parse JSON preset data.' };
  }
}

/**
 * Extract preset payload values directly from a selected BarcodeLabelObject
 */
export function extractPresetFromObject(
  obj: BarcodeLabelObject,
  name = 'Custom Barcode Preset',
  category: PresetCategory = 'Custom'
): Omit<BarcodePreset, 'id' | 'createdAt' | 'isBuiltIn'> {
  const style = obj.barcodeStyle || ({} as BarcodeStyle);
  return {
    name,
    description: `Custom preset derived from ${obj.name || obj.type.toUpperCase()}`,
    category,
    symbology: style.symbology || (obj.type === 'qrcode' ? 'qr' : obj.type === 'datamatrix' ? 'datamatrix' : 'code128'),
    width: Math.round(obj.width),
    height: Math.round(obj.height),
    color: style.color || '#000000',
    backgroundColor: style.backgroundColor || 'transparent',
    errorCorrectionLevel: style.errorCorrectionLevel || (style.symbology === 'qr' ? 'M' : undefined),
    humanReadable: style.humanReadable !== undefined ? style.humanReadable : true,
    humanReadableFont: style.humanReadableFont || 'monospace',
    humanReadableSize: style.humanReadableSize || 9,
    humanReadablePosition: style.humanReadablePosition || 'bottom',
    quietZone: style.quietZone !== undefined ? style.quietZone : true,
    quietZoneSize: style.quietZoneSize || 2,
    sampleValue: obj.value || '1234567890',
  };
}

/**
 * Apply a preset's properties to a target BarcodeLabelObject
 */
export function applyPresetToObject(
  preset: BarcodePreset,
  targetObject: BarcodeLabelObject
): Partial<BarcodeLabelObject> {
  const is2D =
    preset.symbology === 'qr' ||
    preset.symbology === 'gs1-qr' ||
    preset.symbology === 'datamatrix' ||
    preset.symbology === 'gs1-datamatrix' ||
    preset.symbology === 'aztec' ||
    preset.symbology === 'maxicode';

  const newType =
    preset.symbology === 'qr' || preset.symbology === 'gs1-qr'
      ? 'qrcode'
      : preset.symbology === 'datamatrix' || preset.symbology === 'gs1-datamatrix'
      ? 'datamatrix'
      : 'barcode';

  return {
    type: newType,
    width: preset.width,
    height: preset.height,
    barcodeStyle: {
      ...targetObject.barcodeStyle,
      symbology: preset.symbology,
      color: preset.color,
      backgroundColor: preset.backgroundColor,
      errorCorrectionLevel: preset.errorCorrectionLevel,
      humanReadable: preset.humanReadable,
      humanReadableFont: preset.humanReadableFont || 'monospace',
      humanReadableSize: preset.humanReadableSize || 9,
      humanReadablePosition: preset.humanReadablePosition || 'bottom',
      quietZone: preset.quietZone !== undefined ? preset.quietZone : true,
      quietZoneSize: preset.quietZoneSize !== undefined ? preset.quietZoneSize : 2,
    },
  };
}
