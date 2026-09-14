import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TitleBar } from './components/header/TitleBar';
import { Ribbon, RibbonTab } from './components/ribbon/Ribbon';
import { LeftToolbox } from './components/toolbox/LeftToolbox';
import { DesignerCanvas } from './components/canvas/DesignerCanvas';
import { PropertiesPanel } from './components/properties/PropertiesPanel';
import { BottomDock } from './components/bottom/BottomDock';
import { StatusBar } from './components/bottom/StatusBar';

// Modals
import { BarcodeWizardModal } from './components/modals/BarcodeWizardModal';
import { PrintModal } from './components/modals/PrintModal';
import { DatabaseManagerModal } from './components/modals/DatabaseManagerModal';
import { FontManagerModal } from './components/modals/FontManagerModal';
import { WorkflowDesignerModal } from './components/modals/WorkflowDesignerModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';

// Types & Services
import { LabelDocument, LabelObject, TextLabelObject, BarcodeLabelObject, ShapeLabelObject, BarcodeSymbology, BarcodeStyle, GuideLine } from './types/label';
import { PrinterProfile, PrintJob } from './types/printer';
import { DataSourceDefinition, SerializationCounter } from './types/database';
import { SAMPLE_TEMPLATES, SAMPLE_PRINTERS, SAMPLE_DATA_SOURCES, SAMPLE_SERIAL_COUNTER } from './services/sampleData';
import { runPreflightValidation } from './services/preflightValidator';

export const App: React.FC = () => {
  // Document state with undo/redo
  const [document, setDocument] = useState<LabelDocument>(SAMPLE_TEMPLATES[0]);
  const [historyPast, setHistoryPast] = useState<LabelDocument[]>([]);
  const [historyFuture, setHistoryFuture] = useState<LabelDocument[]>([]);
  const [isModified, setIsModified] = useState(false);

  // Selection & Tools
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string>('select');

  // Ribbon Tab & Viewport Guides
  const [activeRibbonTab, setActiveRibbonTab] = useState<RibbonTab>('home');
  const [showRulers, setShowRulers] = useState<boolean>(true);

  // Canvas Viewport & Ruler Guides
  const [zoom, setZoom] = useState<number>(1.25);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [lockGuides, setLockGuides] = useState<boolean>(false);
  const [snapToGuides, setSnapToGuides] = useState<boolean>(true);
  const [guides, setGuides] = useState<GuideLine[]>([
    { id: 'g-1', type: 'h', position: 10 },
    { id: 'g-2', type: 'h', position: 35 },
  ]);

  // Collapsible Workspace Side Panels for Maximum Working Area
  const [isToolboxOpen, setIsToolboxOpen] = useState<boolean>(true);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState<boolean>(true);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);

  // Enterprise Hardware & Database State
  const [printers, setPrinters] = useState<PrinterProfile[]>(SAMPLE_PRINTERS);
  const [activePrinterId, setActivePrinterId] = useState<string>(SAMPLE_PRINTERS[0].id);
  const [dataSources, setDataSources] = useState<DataSourceDefinition[]>(SAMPLE_DATA_SOURCES);
  const [activeDataSourceId, setActiveDataSourceId] = useState<string>(SAMPLE_DATA_SOURCES[0].id);
  const [activeRecordIndex, setActiveRecordIndex] = useState<number>(0);
  const [counter, setCounter] = useState<SerializationCounter>(SAMPLE_SERIAL_COUNTER);

  // Modals state
  const [isBarcodeWizardOpen, setIsBarcodeWizardOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Guide handlers
  const handleAddGuide = (newGuide: GuideLine) => {
    setGuides(prev => [...prev, newGuide]);
    showToast(`Added Guide at ${newGuide.position} mm`);
  };

  const handleRemoveGuide = (guideId: string) => {
    setGuides(prev => prev.filter(g => g.id !== guideId));
  };

  const handleClearGuides = () => {
    setGuides([]);
    showToast('All guides cleared');
  };

  // Focus mode / Maximize editor section
  const handleToggleFocusMode = () => {
    setIsFocusMode(prev => {
      const next = !prev;
      if (next) {
        setIsToolboxOpen(false);
        setIsPropertiesOpen(false);
        showToast('Maximized Editor Section (Focus Mode)');
      } else {
        setIsToolboxOpen(true);
        setIsPropertiesOpen(true);
        showToast('Restored Standard Workspace');
      }
      return next;
    });
  };

  const activePrinter = printers.find(p => p.id === activePrinterId) || printers[0];
  const activeDataSource = dataSources.find(d => d.id === activeDataSourceId) || dataSources[0];
  const activeRecord = activeDataSource?.records[activeRecordIndex];
  const selectedObject = document.objects.find(o => o.id === selectedObjectId) || null;

  // Preflight validation diagnostics
  const diagnostics = runPreflightValidation(document);

  // Record history for Undo
  const pushHistory = (newDoc: LabelDocument) => {
    setHistoryPast(prev => [...prev.slice(-20), document]);
    setHistoryFuture([]);
    setDocument(newDoc);
    setIsModified(true);
  };

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryFuture(prev => [document, ...prev]);
    setHistoryPast(prev => prev.slice(0, prev.length - 1));
    setDocument(previous);
  }, [historyPast, document]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryPast(prev => [...prev, document]);
    setHistoryFuture(prev => prev.slice(1));
    setDocument(next);
  }, [historyFuture, document]);

  // Object manipulations
  const handleUpdateObject = (updated: Partial<LabelObject>) => {
    if (!selectedObjectId) return;
    const newObjects = document.objects.map(obj => {
      if (obj.id === selectedObjectId) {
        return { ...obj, ...updated } as LabelObject;
      }
      return obj;
    });
    pushHistory({ ...document, objects: newObjects });
  };

  const handleUpdateObjectById = (id: string, updated: Partial<LabelObject>) => {
    const newObjects = document.objects.map(obj => {
      if (obj.id === id) {
        return { ...obj, ...updated } as LabelObject;
      }
      return obj;
    });
    pushHistory({ ...document, objects: newObjects });
  };

  const handleDeleteObject = (id?: string) => {
    const targetId = id || selectedObjectId;
    if (!targetId) return;
    const newObjects = document.objects.filter(o => o.id !== targetId);
    if (selectedObjectId === targetId) setSelectedObjectId(null);
    pushHistory({ ...document, objects: newObjects });
    showToast('Object deleted');
  };

  const handleDuplicateObject = () => {
    if (!selectedObject) return;
    const newObj: LabelObject = {
      ...JSON.parse(JSON.stringify(selectedObject)),
      id: `obj-${Date.now()}`,
      name: `${selectedObject.name} (Copy)`,
      x: selectedObject.x + 3,
      y: selectedObject.y + 3,
      zIndex: document.objects.length + 1,
    };
    pushHistory({ ...document, objects: [...document.objects, newObj] });
    setSelectedObjectId(newObj.id);
    showToast('Object duplicated');
  };

  // Add Object Handlers
  const handleAddText = (defaultText = 'SAMPLE TEXT') => {
    const newObj: TextLabelObject = {
      id: `text-${Date.now()}`,
      name: `Text Field ${document.objects.length + 1}`,
      type: 'text',
      x: 10,
      y: 10,
      width: 50,
      height: 10,
      rotation: 0,
      zIndex: document.objects.length + 1,
      visible: true,
      locked: false,
      opacity: 1,
      text: defaultText,
      style: {
        fontFamily: 'Segoe UI',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000000',
        alignment: 'left',
        wrap: false,
      },
    };
    pushHistory({ ...document, objects: [...document.objects, newObj] });
    setSelectedObjectId(newObj.id);
    setActiveTool('select');
  };

  const handleAddBarcode = (symbology: BarcodeSymbology, val: string, style?: Partial<BarcodeStyle>) => {
    const is2D = symbology === 'qr' || symbology === 'gs1-qr';
    const isDataMatrix = symbology === 'datamatrix' || symbology === 'gs1-datamatrix';

    const newObj: BarcodeLabelObject = {
      id: `barcode-${Date.now()}`,
      name: `${symbology.toUpperCase()} Barcode`,
      type: is2D ? 'qrcode' : isDataMatrix ? 'datamatrix' : 'barcode',
      x: 15,
      y: 20,
      width: is2D || isDataMatrix ? 25 : 60,
      height: is2D || isDataMatrix ? 25 : 22,
      rotation: 0,
      zIndex: document.objects.length + 1,
      visible: true,
      locked: false,
      opacity: 1,
      value: val,
      barcodeStyle: {
        symbology,
        humanReadable: true,
        humanReadableFont: 'monospace',
        humanReadableSize: 10,
        humanReadablePosition: 'bottom',
        moduleWidth: 0.33,
        quietZone: true,
        quietZoneSize: 2,
        color: '#000000',
        backgroundColor: 'transparent',
        errorCorrectionLevel: 'M',
        ...style,
      },
    };

    pushHistory({ ...document, objects: [...document.objects, newObj] });
    setSelectedObjectId(newObj.id);
    setActiveTool('select');
    showToast(`Added ${symbology.toUpperCase()} barcode`);
  };

  const handleAddShape = (type: 'rect' | 'ellipse' | 'line') => {
    const newObj: ShapeLabelObject = {
      id: `shape-${Date.now()}`,
      name: `${type.toUpperCase()} Shape`,
      type,
      x: 10,
      y: 10,
      width: type === 'line' ? 60 : 40,
      height: type === 'line' ? 2 : 25,
      rotation: 0,
      zIndex: document.objects.length + 1,
      visible: true,
      locked: false,
      opacity: 1,
      shapeStyle: {
        fillColor: type === 'line' ? '#000000' : 'transparent',
        strokeColor: '#000000',
        strokeWidth: 0.5,
        borderRadius: 0,
        strokeDash: 'solid',
      },
    };
    pushHistory({ ...document, objects: [...document.objects, newObj] });
    setSelectedObjectId(newObj.id);
    setActiveTool('select');
  };

  const handleAddObject = (type: any, extraProps?: any) => {
    if (type === 'text' || type === 'rich-text') {
      handleAddText(extraProps?.text || 'SAMPLE TEXT');
    } else if (type === 'barcode') {
      handleAddBarcode(extraProps?.symbology || 'code128', extraProps?.value || '1234567890', extraProps?.style);
    } else if (type === 'qrcode') {
      handleAddBarcode('qr', extraProps?.value || 'https://gs1.org/gtin/00614141999996');
    } else if (type === 'datamatrix') {
      handleAddBarcode('datamatrix', extraProps?.value || '[)>*06*12S00614141*10LOT99*21SN1002');
    } else if (type === 'rect' || type === 'ellipse' || type === 'line') {
      handleAddShape(type);
    }
  };

  const handleAddMultilingualText = (text: string, fontFamily: string, direction: 'ltr' | 'rtl') => {
    const newObj: TextLabelObject = {
      id: `text-multi-${Date.now()}`,
      name: `Multilingual (${fontFamily.split(' ')[0]})`,
      type: 'text',
      x: 10,
      y: 15,
      width: 65,
      height: 12,
      rotation: 0,
      zIndex: document.objects.length + 1,
      visible: true,
      locked: false,
      opacity: 1,
      text,
      style: {
        fontFamily,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000',
        alignment: direction === 'rtl' ? 'right' : 'left',
        direction,
        wrap: true,
      },
    };
    pushHistory({ ...document, objects: [...document.objects, newObj] });
    setSelectedObjectId(newObj.id);
    showToast('Inserted Unicode script element');
  };

  // Alignment Helpers
  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedObject) return;
    const labelW = document.dimensions.width;
    const labelH = document.dimensions.height;

    let updated: Partial<LabelObject> = {};
    if (type === 'left') updated = { x: document.dimensions.marginLeft || 2 };
    if (type === 'center') updated = { x: (labelW - selectedObject.width) / 2 };
    if (type === 'right') updated = { x: labelW - selectedObject.width - (document.dimensions.marginRight || 2) };
    if (type === 'top') updated = { y: document.dimensions.marginTop || 2 };
    if (type === 'middle') updated = { y: (labelH - selectedObject.height) / 2 };
    if (type === 'bottom') updated = { y: labelH - selectedObject.height - (document.dimensions.marginBottom || 2) };

    handleUpdateObject(updated);
  };

  // Z-Order Manipulation
  const handleZOrder = (direction: 'forward' | 'backward' | 'front' | 'back') => {
    if (!selectedObject) return;
    const currentZ = selectedObject.zIndex;
    let newZ = currentZ;
    if (direction === 'forward') newZ = currentZ + 1;
    if (direction === 'backward') newZ = Math.max(1, currentZ - 1);
    if (direction === 'front') newZ = document.objects.length + 1;
    if (direction === 'back') newZ = 1;

    handleUpdateObject({ zIndex: newZ });
  };

  // Document Save / Load
  const handleSaveDocument = () => {
    const json = JSON.stringify(document, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.name.replace(/\s+/g, '_')}.btw.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsModified(false);
    showToast('Label template exported to .btw.json');
  };

  const handleOpenDocument = () => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.dimensions && Array.isArray(parsed.objects)) {
            pushHistory(parsed);
            setSelectedObjectId(null);
            showToast(`Loaded "${parsed.name}"`);
          }
        } catch (err) {
          alert('Invalid template JSON file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Switch between industrial templates
  const handleSelectTemplate = (template: LabelDocument) => {
    pushHistory(template);
    setSelectedObjectId(null);
    showToast(`Loaded Template: ${template.name}`);
  };

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveDocument();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPrintModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateObject();
      } else if (e.key === 'Escape') {
        setSelectedObjectId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSaveDocument, handleDuplicateObject]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#14161b] text-white overflow-hidden font-sans select-none">
      {/* 1. WINDOWS TITLEBAR */}
      <TitleBar
        documentName={document.name}
        isModified={isModified}
        onSave={handleSaveDocument}
        onOpen={handleOpenDocument}
        onPrint={() => setIsPrintModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
      />

      {/* 2. RIBBON WORKSTATION INTERFACE */}
      <Ribbon
        activeTab={activeRibbonTab}
        setActiveTab={setActiveRibbonTab}
        document={document}
        selectedObject={selectedObject}
        onUpdateObject={handleUpdateObject}
        onDeleteSelected={() => handleDeleteObject()}
        onDuplicateSelected={handleDuplicateObject}
        onBringForward={() => handleZOrder('forward')}
        onSendBackward={() => handleZOrder('backward')}
        onAddObject={handleAddObject}
        onAddText={() => handleAddText()}
        onOpenBarcodeWizard={(sym) => setIsBarcodeWizardOpen(true)}
        onOpenPrintDialog={() => setIsPrintModalOpen(true)}
        onOpenPrintPreview={() => setIsPrintModalOpen(true)}
        onOpenDatabaseManager={() => setIsDatabaseModalOpen(true)}
        onOpenFontManager={() => setIsFontModalOpen(true)}
        onOpenWorkflowDesigner={() => setIsWorkflowModalOpen(true)}
        onOpenWorkflowManager={() => setIsWorkflowModalOpen(true)}
        onOpenPrintModal={() => setIsPrintModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        showRulers={showRulers}
        setShowRulers={setShowRulers}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        showGuides={showGuides}
        setShowGuides={setShowGuides}
        snapToGuides={snapToGuides}
        setSnapToGuides={setSnapToGuides}
        zoom={zoom}
        setZoom={setZoom}
        unit={document.dimensions.unit || 'mm'}
        setUnit={(u) => {
          setDocument(prev => ({ ...prev, dimensions: { ...prev.dimensions, unit: u } }));
        }}
        recordIndex={activeRecordIndex}
        totalRecords={activeDataSource?.records.length || 0}
        onPrevRecord={() => setActiveRecordIndex(prev => Math.max(0, prev - 1))}
        onNextRecord={() => setActiveRecordIndex(prev => Math.min((activeDataSource?.records.length || 1) - 1, prev + 1))}
        onSave={handleSaveDocument}
        onOpen={handleOpenDocument}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        onDelete={() => handleDeleteObject()}
        onDuplicate={handleDuplicateObject}
        onAlign={handleAlign}
        onZOrder={handleZOrder}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* 3. MAIN WORKSPACE (Large Editor Section + Collapsible Panels) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbox (Collapsible to maximize editor area) */}
        {isToolboxOpen && (
          <LeftToolbox
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            currentTool={activeTool}
            setCurrentTool={setActiveTool}
            onAddObject={handleAddObject}
            onAddText={() => handleAddText()}
            onAddBarcode={(sym, val, style) => handleAddBarcode(sym, val || '1234567890', style)}
            onAddQRCode={() => handleAddBarcode('qr', 'https://gs1.org/gtin/00614141999996')}
            onAddDataMatrix={() => handleAddBarcode('datamatrix', '[)>*06*12S00614141*10LOT99*21SN1002')}
            onAddShape={handleAddShape}
            onOpenBarcodeWizard={() => setIsBarcodeWizardOpen(true)}
            onOpenFontManager={() => setIsFontModalOpen(true)}
          />
        )}

        {/* Left Toolbox Toggle Tab */}
        <button
          onClick={() => setIsToolboxOpen(!isToolboxOpen)}
          className="absolute top-1/2 -translate-y-1/2 z-40 bg-[#1e222b] hover:bg-blue-600 text-gray-400 hover:text-white border border-[#363b4b] rounded-r px-0.5 py-2 shadow-md transition-colors"
          style={{ left: isToolboxOpen ? '192px' : '0px' }}
          title={isToolboxOpen ? 'Collapse Toolbox (Enlarge Editor Section)' : 'Expand Toolbox'}
        >
          {isToolboxOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* Central Canvas Viewport: Enlarged Editor with Full Physical Rulers & Controls */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#111317]">
          <DesignerCanvas
            document={document}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            onUpdateObject={handleUpdateObject}
            showGrid={showGrid}
            setShowGrid={setShowGrid}
            snapToGrid={snapToGrid}
            setSnapToGrid={setSnapToGrid}
            zoom={zoom}
            setZoom={setZoom}
            showRulers={showRulers}
            setShowRulers={setShowRulers}
            unit={document.dimensions.unit || 'mm'}
            onUnitChange={(u) => {
              setDocument(prev => ({ ...prev, dimensions: { ...prev.dimensions, unit: u } }));
            }}
            showGuides={showGuides}
            setShowGuides={setShowGuides}
            lockGuides={lockGuides}
            setLockGuides={setLockGuides}
            snapToGuides={snapToGuides}
            setSnapToGuides={setSnapToGuides}
            guides={guides}
            onAddGuide={handleAddGuide}
            onRemoveGuide={handleRemoveGuide}
            onClearGuides={handleClearGuides}
            activeRecord={activeRecord}
            counter={counter}
            onCursorMove={(x, y) => setCursorPos({ x, y })}
            onDeleteSelected={() => handleDeleteObject()}
            isMaximized={isFocusMode}
            onToggleMaximize={handleToggleFocusMode}
          />
        </div>

        {/* Right Properties Panel Toggle Tab */}
        <button
          onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
          className="absolute top-1/2 -translate-y-1/2 z-40 bg-[#1e222b] hover:bg-blue-600 text-gray-400 hover:text-white border border-[#363b4b] rounded-l px-0.5 py-2 shadow-md transition-colors"
          style={{ right: isPropertiesOpen ? '288px' : '0px' }}
          title={isPropertiesOpen ? 'Collapse Properties (Enlarge Editor Section)' : 'Expand Properties'}
        >
          {isPropertiesOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Right Properties Panel (Collapsible to maximize editor area) */}
        {isPropertiesOpen && (
          <PropertiesPanel
            selectedObject={selectedObject}
            onUpdateObject={handleUpdateObject}
            activeDataSource={activeDataSource}
            counter={counter}
            onOpenBarcodeWizard={() => setIsBarcodeWizardOpen(true)}
          />
        )}
      </div>

      {/* 4. BOTTOM DOCK (Layers, Preflight Diagnostics, Live Data Table) */}
      <BottomDock
        objects={document.objects}
        selectedObjectId={selectedObjectId}
        onSelectObject={setSelectedObjectId}
        onUpdateObject={handleUpdateObjectById}
        onDeleteObject={handleDeleteObject}
        diagnostics={diagnostics}
        dataSource={activeDataSource}
        activeRecordIndex={activeRecordIndex}
        onSelectRecordIndex={setActiveRecordIndex}
      />

      {/* 5. INDUSTRIAL STATUS BAR */}
      <StatusBar
        dimensions={document.dimensions}
        zoom={zoom}
        setZoom={setZoom}
        cursorX={cursorPos.x}
        cursorY={cursorPos.y}
        activePrinter={activePrinter}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        selectedObjectName={selectedObject?.name}
        isModified={isModified}
      />

      {/* ================= MODALS ================= */}
      <BarcodeWizardModal
        isOpen={isBarcodeWizardOpen}
        onClose={() => setIsBarcodeWizardOpen(false)}
        onInsertBarcode={(sym, val, style) => handleAddBarcode(sym, val, style)}
      />

      <PrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        document={document}
        printers={printers}
        activePrinterId={activePrinterId}
        onSelectPrinter={setActivePrinterId}
        dataSource={activeDataSource}
        counter={counter}
        onJobDispatched={(job) => {
          showToast(`Job ${job.id} dispatched to ${job.printerName}`);
          // Auto increment serialization counter if serialized
          setCounter(prev => ({ ...prev, currentValue: prev.currentValue + job.copies }));
        }}
      />

      <DatabaseManagerModal
        isOpen={isDatabaseModalOpen}
        onClose={() => setIsDatabaseModalOpen(false)}
        dataSources={dataSources}
        activeDataSourceId={activeDataSourceId}
        onSelectDataSource={(id) => {
          setActiveDataSourceId(id);
          setActiveRecordIndex(0);
          showToast('Active database source connected');
        }}
        onAddCustomDataSource={(newDS) => {
          setDataSources(prev => [...prev, newDS]);
        }}
        counter={counter}
        onUpdateCounter={(c) => {
          setCounter(c);
          showToast('Serialization counter updated');
        }}
      />

      <FontManagerModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
        onInsertMultilingualText={handleAddMultilingualText}
      />

      <WorkflowDesignerModal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-10 right-6 z-50 bg-[#1e2330] border border-blue-500/60 text-white text-xs px-3.5 py-2 rounded shadow-2xl flex items-center space-x-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
