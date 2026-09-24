import React, { useState, useEffect } from 'react';
import {
  Sliders,
  QrCode,
  Bookmark,
  Sparkles,
  Settings,
  Layers,
  ChevronRight
} from 'lucide-react';
import { LabelObject, BarcodeLabelObject, GridSettings } from '../../types/label';
import { DataSourceDefinition, SerializationCounter } from '../../types/database';
import { BarcodePreset } from '../../types/presets';
import { PropertiesPanel } from '../properties/PropertiesPanel';
import { QRCodeWizardPanel } from './QRCodeWizardPanel';
import { BarcodePresetsPanel } from './BarcodePresetsPanel';
import { QRErrorCorrectionLevel } from '../../services/qrCodeGenerator';

export type RightToolboxTab = 'properties' | 'qr-wizard' | 'presets';

interface RightToolboxProps {
  selectedObject: LabelObject | null;
  onUpdateObject: (updated: Partial<LabelObject>) => void;
  onAddQRCodeWithOptions?: (options: {
    value: string;
    errorCorrectionLevel: QRErrorCorrectionLevel;
    size?: number;
    color?: string;
    backgroundColor?: string;
    name?: string;
  }) => void;
  onAddBarcodeWithPreset?: (preset: BarcodePreset) => void;
  activeDataSource?: DataSourceDefinition;
  counter?: SerializationCounter;
  onOpenBarcodeWizard: () => void;
  onAlign?: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'center-page-h' | 'center-page-v' | 'center-both' | 'distribute-h' | 'distribute-v') => void;
  onZOrder?: (direction: 'forward' | 'backward' | 'front' | 'back') => void;
  gridSettings?: GridSettings;
  onUpdateGridSettings?: (settings: GridSettings) => void;
  initialTab?: RightToolboxTab;
  onTabChange?: (tab: RightToolboxTab) => void;
  // Relative Alignment additions
  alignmentMode?: 'bounds' | 'key';
  onSetAlignmentMode?: (mode: 'bounds' | 'key') => void;
  keyObjectId?: string | null;
  onSetKeyObjectId?: (id: string | null) => void;
  selectedObjectIds?: string[];
  objects?: LabelObject[];
}

export const RightToolbox: React.FC<RightToolboxProps> = ({
  selectedObject,
  onUpdateObject,
  onAddQRCodeWithOptions,
  onAddBarcodeWithPreset,
  activeDataSource,
  counter,
  onOpenBarcodeWizard,
  onAlign,
  onZOrder,
  gridSettings,
  onUpdateGridSettings,
  initialTab = 'properties',
  onTabChange,
  alignmentMode = 'bounds',
  onSetAlignmentMode,
  keyObjectId,
  onSetKeyObjectId,
  selectedObjectIds = [],
  objects = [],
}) => {
  const [activeTab, setActiveTab] = useState<RightToolboxTab>(initialTab);

  const handleSetTab = (tab: RightToolboxTab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const isSelectedQR =
    selectedObject?.type === 'qrcode' ||
    (selectedObject?.type === 'barcode' &&
      ((selectedObject as BarcodeLabelObject).barcodeStyle?.symbology === 'qr' ||
        (selectedObject as BarcodeLabelObject).barcodeStyle?.symbology === 'gs1-qr'));

  const isSelectedBarcode =
    selectedObject?.type === 'barcode' ||
    selectedObject?.type === 'qrcode' ||
    selectedObject?.type === 'datamatrix';

  return (
    <div className="w-80 bg-[#1e2129] border-l border-[#2f333f] text-[#c8cbd2] flex flex-col h-full select-none">
      {/* Top Main Navigation Tabs */}
      <div className="flex items-center bg-[#181b22] border-b border-[#2d313d] px-1 pt-1">
        <button
          onClick={() => handleSetTab('properties')}
          className={`flex-1 py-2 px-1.5 text-[10.5px] font-semibold flex items-center justify-center space-x-1 border-b-2 transition-colors ${
            activeTab === 'properties'
              ? 'border-blue-500 text-white bg-[#1e2129]'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1f232d]'
          }`}
          title="Properties & Alignment"
        >
          <Sliders className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Properties</span>
        </button>

        <button
          onClick={() => handleSetTab('presets')}
          className={`flex-1 py-2 px-1.5 text-[10.5px] font-semibold flex items-center justify-center space-x-1 border-b-2 transition-colors relative ${
            activeTab === 'presets'
              ? 'border-amber-500 text-white bg-[#1e2129]'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1f232d]'
          }`}
          title="Barcode & QR Presets"
        >
          <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Presets</span>
          {isSelectedBarcode && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1.5 right-1.5" />
          )}
        </button>

        <button
          onClick={() => handleSetTab('qr-wizard')}
          className={`flex-1 py-2 px-1.5 text-[10.5px] font-semibold flex items-center justify-center space-x-1 border-b-2 transition-colors relative ${
            activeTab === 'qr-wizard'
              ? 'border-emerald-500 text-white bg-[#1e2129]'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-[#1f232d]'
          }`}
          title="QR Code Configuration Wizard"
        >
          <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>QR Wizard</span>
          {isSelectedQR && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-1.5 right-1.5" />
          )}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'properties' && (
          <PropertiesPanel
            selectedObject={selectedObject}
            onUpdateObject={onUpdateObject}
            activeDataSource={activeDataSource}
            counter={counter}
            onOpenBarcodeWizard={onOpenBarcodeWizard}
            onOpenQRWizard={() => handleSetTab('qr-wizard')}
            onOpenPresets={() => handleSetTab('presets')}
            onAlign={onAlign}
            onZOrder={onZOrder}
            gridSettings={gridSettings}
            onUpdateGridSettings={onUpdateGridSettings}
            alignmentMode={alignmentMode}
            onSetAlignmentMode={onSetAlignmentMode}
            keyObjectId={keyObjectId}
            onSetKeyObjectId={onSetKeyObjectId}
            selectedObjectIds={selectedObjectIds}
            objects={objects}
          />
        )}

        {activeTab === 'presets' && (
          <BarcodePresetsPanel
            selectedObject={selectedObject}
            onUpdateObject={onUpdateObject}
            onAddBarcodeWithPreset={onAddBarcodeWithPreset}
            onSwitchToProperties={() => handleSetTab('properties')}
          />
        )}

        {activeTab === 'qr-wizard' && (
          <QRCodeWizardPanel
            selectedObject={selectedObject}
            onUpdateObject={onUpdateObject}
            onAddQRCodeWithOptions={onAddQRCodeWithOptions}
            activeDataSource={activeDataSource}
            counter={counter}
            onSwitchToProperties={() => handleSetTab('properties')}
          />
        )}
      </div>
    </div>
  );
};
