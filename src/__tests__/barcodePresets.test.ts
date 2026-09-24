import { describe, it, expect, beforeEach } from 'vitest';
import {
  BUILT_IN_PRESETS,
  getAllPresets,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  updateCustomPreset,
  clearPresetsStorage,
  exportPresetsToJson,
  importPresetsFromJson,
  extractPresetFromObject,
  applyPresetToObject,
} from '../services/barcodePresetStorage';
import { BarcodeLabelObject } from '../types/label';

describe('Barcode Presets System & Right Toolbox Storage', () => {
  beforeEach(() => {
    clearPresetsStorage();
  });

  describe('1. Built-in Industrial Presets', () => {
    it('contains comprehensive pre-configured industrial and retail presets', () => {
      expect(BUILT_IN_PRESETS.length).toBeGreaterThanOrEqual(10);
      
      const symbologies = BUILT_IN_PRESETS.map((p) => p.symbology);
      expect(symbologies).toContain('gs1-128');
      expect(symbologies).toContain('upca');
      expect(symbologies).toContain('ean13');
      expect(symbologies).toContain('qr');
      expect(symbologies).toContain('datamatrix');
      expect(symbologies).toContain('gs1-datamatrix');
      expect(symbologies).toContain('itf14');
      expect(symbologies).toContain('code39');
      expect(symbologies).toContain('code128');
    });

    it('defines correct error correction level and dimensions for High-Durability QR', () => {
      const qrRugged = BUILT_IN_PRESETS.find((p) => p.id === 'builtin-qr-high-ecc');
      expect(qrRugged).toBeDefined();
      expect(qrRugged?.errorCorrectionLevel).toBe('H');
      expect(qrRugged?.width).toBe(30);
      expect(qrRugged?.height).toBe(30);
      expect(qrRugged?.isBuiltIn).toBe(true);
    });

    it('getAllPresets returns built-ins when no custom presets exist', () => {
      const all = getAllPresets();
      expect(all.length).toBe(BUILT_IN_PRESETS.length);
    });
  });

  describe('2. Custom Preset Lifecycle (Create, Read, Update, Delete)', () => {
    it('saves a new custom preset and persists to localStorage', () => {
      const saved = saveCustomPreset({
        name: 'Warehouse High-Rack Code 39',
        description: 'Large format 80x25mm code 39 for high bay scanning',
        category: 'Logistics',
        symbology: 'code39',
        width: 80,
        height: 25,
        color: '#000000',
        backgroundColor: 'transparent',
        humanReadable: true,
        humanReadableFont: 'monospace',
        humanReadableSize: 10,
        humanReadablePosition: 'bottom',
        quietZone: true,
        quietZoneSize: 4,
        sampleValue: 'BAY-104-LEVEL-3',
      });

      expect(saved.id).toMatch(/^preset-custom-/);
      expect(saved.isBuiltIn).toBe(false);

      const customList = getCustomPresets();
      expect(customList).toHaveLength(1);
      expect(customList[0].name).toBe('Warehouse High-Rack Code 39');

      const all = getAllPresets();
      expect(all.length).toBe(BUILT_IN_PRESETS.length + 1);
    });

    it('updates an existing custom preset', () => {
      const saved = saveCustomPreset({
        name: 'PCB Label',
        description: 'Small DataMatrix',
        category: 'Industrial 2D',
        symbology: 'datamatrix',
        width: 10,
        height: 10,
        color: '#000000',
        backgroundColor: 'transparent',
        humanReadable: false,
      });

      const updated = updateCustomPreset(saved.id, {
        name: 'PCB Label Rev B',
        width: 12,
        height: 12,
      });

      expect(updated).not.toBeNull();
      expect(updated?.name).toBe('PCB Label Rev B');
      expect(updated?.width).toBe(12);

      const fresh = getCustomPresets();
      expect(fresh[0].name).toBe('PCB Label Rev B');
    });

    it('deletes a custom preset by ID', () => {
      const saved = saveCustomPreset({
        name: 'To Delete',
        description: 'Testing delete',
        category: 'Custom',
        symbology: 'code128',
        width: 40,
        height: 20,
        color: '#000000',
        backgroundColor: 'transparent',
        humanReadable: true,
      });

      expect(getCustomPresets()).toHaveLength(1);
      const deleted = deleteCustomPreset(saved.id);
      expect(deleted).toBe(true);
      expect(getCustomPresets()).toHaveLength(0);
    });
  });

  describe('3. JSON Export & Import Validation', () => {
    it('exports custom presets to structured JSON', () => {
      saveCustomPreset({
        name: 'Exportable Preset 1',
        description: 'Test export',
        category: 'Retail',
        symbology: 'ean13',
        width: 37,
        height: 26,
        color: '#000000',
        backgroundColor: 'transparent',
        humanReadable: true,
      });

      const jsonStr = exportPresetsToJson();
      const parsed = JSON.parse(jsonStr);
      expect(parsed.app).toBe('LabelForge');
      expect(parsed.presets).toHaveLength(1);
      expect(parsed.presets[0].name).toBe('Exportable Preset 1');
    });

    it('imports and validates JSON presets correctly', () => {
      const importPayload = JSON.stringify({
        app: 'LabelForge',
        presets: [
          {
            name: 'Imported Pharma 2D',
            description: 'Imported from clinic system',
            category: 'Healthcare',
            symbology: 'gs1-datamatrix',
            width: 15,
            height: 15,
            color: '#1d4ed8',
            backgroundColor: '#ffffff',
            errorCorrectionLevel: 'M',
            humanReadable: false,
          },
          {
            name: 'Imported Pallet Tag',
            description: 'Imported from logistics system',
            category: 'Logistics',
            symbology: 'gs1-128',
            width: 70,
            height: 30,
            color: '#000000',
            backgroundColor: 'transparent',
            humanReadable: true,
          },
        ],
      });

      const res = importPresetsFromJson(importPayload);
      expect(res.importedCount).toBe(2);
      expect(res.errors).toBeUndefined();

      const customList = getCustomPresets();
      expect(customList).toHaveLength(2);
      expect(customList.map((c) => c.name)).toContain('Imported Pharma 2D');
      expect(customList.map((c) => c.name)).toContain('Imported Pallet Tag');
    });
  });

  describe('4. Object Extraction & Preset Application', () => {
    const mockBarcodeObj: BarcodeLabelObject = {
      id: 'obj-barcode-1',
      name: 'Serial Barcode',
      type: 'barcode',
      x: 10,
      y: 10,
      width: 55,
      height: 22,
      rotation: 0,
      zIndex: 1,
      visible: true,
      locked: false,
      opacity: 1,
      value: 'TEST123456',
      barcodeStyle: {
        symbology: 'code128',
        humanReadable: true,
        humanReadableFont: 'monospace',
        humanReadableSize: 10,
        humanReadablePosition: 'bottom',
        moduleWidth: 0.33,
        quietZone: true,
        quietZoneSize: 2.5,
        color: '#111827',
        backgroundColor: '#ffffff',
      },
    };

    it('extracts complete preset configuration from a canvas BarcodeLabelObject', () => {
      const extracted = extractPresetFromObject(mockBarcodeObj, 'Captured Barcode Spec', 'Logistics');
      expect(extracted.name).toBe('Captured Barcode Spec');
      expect(extracted.symbology).toBe('code128');
      expect(extracted.width).toBe(55);
      expect(extracted.height).toBe(22);
      expect(extracted.color).toBe('#111827');
      expect(extracted.backgroundColor).toBe('#ffffff');
      expect(extracted.humanReadable).toBe(true);
      expect(extracted.quietZoneSize).toBe(2.5);
    });

    it('applies preset changes correctly onto target BarcodeLabelObject', () => {
      const targetObj: BarcodeLabelObject = {
        id: 'target-1',
        name: 'Generic Code',
        type: 'barcode',
        x: 20,
        y: 20,
        width: 40,
        height: 15,
        rotation: 0,
        zIndex: 1,
        visible: true,
        locked: false,
        opacity: 1,
        value: 'DATA99',
        barcodeStyle: {
          symbology: 'code39',
          humanReadable: false,
          humanReadableFont: 'Arial',
          humanReadableSize: 8,
          humanReadablePosition: 'none',
          moduleWidth: 0.25,
          quietZone: false,
          quietZoneSize: 0,
          color: '#000000',
          backgroundColor: 'transparent',
        },
      };

      const preset = BUILT_IN_PRESETS.find((p) => p.id === 'builtin-qr-high-ecc')!;
      const updates = applyPresetToObject(preset, targetObj);

      expect(updates.type).toBe('qrcode');
      expect(updates.width).toBe(30);
      expect(updates.height).toBe(30);
      expect(updates.barcodeStyle?.symbology).toBe('qr');
      expect(updates.barcodeStyle?.errorCorrectionLevel).toBe('H');
    });
  });
});
