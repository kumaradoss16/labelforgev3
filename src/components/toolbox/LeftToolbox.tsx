import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  Type,
  FileText,
  Image as ImageIcon,
  Square,
  Circle,
  Minus,
  Table as TableIcon,
  Barcode as BarcodeIcon,
  QrCode,
  Grid,
  Database,
  Calendar,
  Hash,
  Radio,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Mail
} from 'lucide-react';
import { ObjectType } from '../../types/label';

interface LeftToolboxProps {
  currentTool?: string;
  activeTool?: string;
  setCurrentTool?: (tool: string) => void;
  setActiveTool?: (tool: string) => void;
  onAddObject?: (type: ObjectType | any, extra?: any) => void;
  onAddText?: (text?: string) => void;
  onAddBarcode?: (symbology: any, value: string, style?: any) => void;
  onAddQRCode?: () => void;
  onAddDataMatrix?: () => void;
  onAddShape?: (type: 'rect' | 'ellipse' | 'line') => void;
  onOpenBarcodeWizard?: (symbology?: string) => void;
  onOpenFontManager?: () => void;
}

export const LeftToolbox: React.FC<LeftToolboxProps> = (props) => {
  const currentTool = props.currentTool ?? props.activeTool ?? 'select';
  const setTool = (tool: string) => {
    props.setCurrentTool?.(tool);
    props.setActiveTool?.(tool);
  };

  const safeAddObject = (type: ObjectType | any, extra?: any) => {
    if (typeof props.onAddObject === 'function') {
      props.onAddObject(type, extra);
      return;
    }
    if (type === 'text' || type === 'rich-text') {
      props.onAddText?.(extra?.text || 'SAMPLE TEXT');
    } else if (type === 'barcode') {
      props.onAddBarcode?.(extra?.symbology || 'code128', extra?.value || '1234567890', extra?.style);
    } else if (type === 'qrcode') {
      props.onAddQRCode?.();
    } else if (type === 'datamatrix') {
      props.onAddDataMatrix?.();
    } else if (type === 'rect' || type === 'ellipse' || type === 'line') {
      props.onAddShape?.(type);
    }
  };

  const handleOpenBarcodeWizard = (sym?: string) => {
    props.onOpenBarcodeWizard?.(sym);
  };
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    selection: true,
    objects: true,
    barcodes: true,
    data: true,
    special: true,
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="w-48 bg-[#1e2129] border-r border-[#2f333f] text-[#c8cbd2] select-none flex flex-col h-full text-xs overflow-y-auto">
      <div className="p-2 font-semibold text-[11px] uppercase tracking-wider text-gray-400 border-b border-[#2d313d] flex items-center justify-between">
        <span>Toolbox</span>
        <span className="text-[10px] text-gray-500 font-mono">PROD</span>
      </div>

      <div className="p-1 space-y-1">
        {/* 1. SELECTION */}
        <div>
          <button
            onClick={() => toggleSection('selection')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-gray-400 hover:text-gray-200 hover:bg-[#272b35] rounded"
          >
            <span>Selection</span>
            {openSections.selection ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openSections.selection && (
            <div className="mt-0.5 space-y-0.5 pl-1">
              <button
                onClick={() => setTool('select')}
                className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-left transition-colors ${currentTool === 'select' ? 'bg-[#2563eb] text-white' : 'hover:bg-[#282d38] text-gray-300'}`}
              >
                <MousePointer className="w-3.5 h-3.5 text-blue-300" />
                <span>Select Pointer</span>
              </button>
              <button
                onClick={() => setTool('pan')}
                className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-left transition-colors ${currentTool === 'pan' ? 'bg-[#2563eb] text-white' : 'hover:bg-[#282d38] text-gray-300'}`}
              >
                <Hand className="w-3.5 h-3.5 text-amber-300" />
                <span>Pan Hand</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. OBJECTS */}
        <div className="pt-1 border-t border-[#2a2e39]">
          <button
            onClick={() => toggleSection('objects')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-gray-400 hover:text-gray-200 hover:bg-[#272b35] rounded"
          >
            <span>Objects</span>
            {openSections.objects ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openSections.objects && (
            <div className="mt-0.5 space-y-0.5 pl-1">
              <button
                onClick={() => safeAddObject('text')}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Type className="w-3.5 h-3.5 text-amber-400" />
                <span>Text Box</span>
              </button>
              <button
                onClick={() => safeAddObject('rich-text')}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rich Multilingual</span>
              </button>
              <button
                onClick={() => safeAddObject('rect')}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Square className="w-3.5 h-3.5 text-cyan-400" />
                <span>Rectangle</span>
              </button>
              <button
                onClick={() => safeAddObject('ellipse')}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Circle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ellipse / Circle</span>
              </button>
              <button
                onClick={() => safeAddObject('line')}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Minus className="w-3.5 h-3.5 text-gray-400" />
                <span>Dividing Line</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. BARCODES */}
        <div className="pt-1 border-t border-[#2a2e39]">
          <button
            onClick={() => toggleSection('barcodes')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-gray-400 hover:text-gray-200 hover:bg-[#272b35] rounded"
          >
            <span>Barcodes</span>
            {openSections.barcodes ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openSections.barcodes && (
            <div className="mt-0.5 space-y-0.5 pl-1">
              <button
                onClick={() => handleOpenBarcodeWizard()}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded bg-[#272c38] hover:bg-[#323847] text-blue-300 font-medium text-left border border-blue-600/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Barcode Wizard...</span>
              </button>
              <button
                onClick={() => safeAddObject('barcode', { symbology: 'code128' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <BarcodeIcon className="w-3.5 h-3.5 text-blue-400" />
                <span>Code 128 (1D)</span>
              </button>
              <button
                onClick={() => safeAddObject('qrcode')}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>2D QR Code</span>
              </button>
              <button
                onClick={() => safeAddObject('datamatrix')}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Grid className="w-3.5 h-3.5 text-purple-400" />
                <span>Data Matrix (ECC 200)</span>
              </button>
              <button
                onClick={() => safeAddObject('barcode', { symbology: 'gs1-128', value: '(01)00614141999996(10)LOT-X99(17)280630' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <span className="text-[9px] font-black text-amber-400 border border-amber-500/60 px-0.5 rounded">GS1</span>
                <span>GS1-128</span>
              </button>
              <button
                onClick={() => safeAddObject('barcode', { symbology: 'ean13', value: '5901234123457' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <BarcodeIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>EAN-13 Retail</span>
              </button>
              <button
                onClick={() => safeAddObject('barcode', { symbology: 'upca', value: '012345678905' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <BarcodeIcon className="w-3.5 h-3.5 text-rose-400" />
                <span>UPC-A Retail</span>
              </button>
              <button
                onClick={() => safeAddObject('barcode', { symbology: 'usps-imb', value: '0123456789012345678901234567890' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Mail className="w-3.5 h-3.5 text-orange-400" />
                <span>USPS Intelligent Mail</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. DATA SOURCES */}
        <div className="pt-1 border-t border-[#2a2e39]">
          <button
            onClick={() => toggleSection('data')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-gray-400 hover:text-gray-200 hover:bg-[#272b35] rounded"
          >
            <span>Data</span>
            {openSections.data ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openSections.data && (
            <div className="mt-0.5 space-y-0.5 pl-1">
              <button
                onClick={() => safeAddObject('text', { text: '{{Lot_Number}}', name: 'DB Field [Lot]' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Database Field</span>
              </button>
              <button
                onClick={() => safeAddObject('text', { text: 'SN-{{SERIAL}}', name: 'Serialization Counter' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>Counter / Serial</span>
              </button>
              <button
                onClick={() => safeAddObject('text', { text: 'EXP: {{DATE_YYMMDD}}', name: 'Date/Time Token' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                <span>Date / Time Stamp</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. SPECIAL */}
        <div className="pt-1 border-t border-[#2a2e39]">
          <button
            onClick={() => toggleSection('special')}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold text-gray-400 hover:text-gray-200 hover:bg-[#272b35] rounded"
          >
            <span>Special</span>
            {openSections.special ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {openSections.special && (
            <div className="mt-0.5 space-y-0.5 pl-1">
              <button
                onClick={() => safeAddObject('text', { text: '(( RFID TAG EMBEDDED ))', name: 'RFID Inlay Marker' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span>RFID Inlay Overlay</span>
              </button>
              <button
                onClick={() => safeAddObject('text', { text: '⚠ CAUTION / GHS 07', name: 'Hazard Symbol' })}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#282d38] text-gray-300 hover:text-white text-left"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>GHS / Caution Symbol</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
