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
import { TemplateManagerModal } from './components/modals/TemplateManagerModal';
import { BarTenderManagerModal } from './components/modals/BarTenderManagerModal';

// Types & Services
import { LabelDocument, LabelObject, TextLabelObject, BarcodeLabelObject, ShapeLabelObject, BarcodeSymbology, BarcodeStyle, GuideLine, TextStyle } from './types/label';
import { PrinterProfile, PrintJob, PrintAuditLog, UserRole, BarTenderTemplateMetadata } from './types/printer';
import { DataSourceDefinition, SerializationCounter } from './types/database';
import {
  SAMPLE_TEMPLATES,
  SAMPLE_PRINTERS,
  SAMPLE_DATA_SOURCES,
  SAMPLE_SERIAL_COUNTER,
  SAMPLE_PRINT_JOBS,
  SAMPLE_AUDIT_LOGS,
  SAMPLE_BARTENDER_TEMPLATES
} from './services/sampleData';
import { runPreflightValidation } from './services/preflightValidator';
import { createLForgePackage, parseAndValidateLForgePackage } from './services/lforgePackage';
import { renderLabelObjectContent } from './services/renderObjectContent';
import {
  isDesktopApp,
  desktopOpenProject,
  desktopSaveProject,
  desktopSaveProjectAs,
  desktopGetRecentProjects,
  subscribeToDesktopMenu
} from './services/desktopBridge';

export const App: React.FC = () => {
  // Document state with undo/redo and multi-document tabs
  const [openDocuments, setOpenDocuments] = useState<LabelDocument[]>(() => {
    const validTemplates = (SAMPLE_TEMPLATES || []).filter(Boolean);
    return validTemplates.length > 0 ? validTemplates : [];
  });
  const [document, setDocument] = useState<LabelDocument>(() => {
    return SAMPLE_TEMPLATES?.[0] || {
      id: 'doc-default',
      schemaVersion: '1.0.0',
      name: 'Default Label',
      description: 'Standard label document',
      author: 'Operator',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      dimensions: {
        width: 100,
        height: 150,
        unit: 'mm',
        dpi: 300,
        orientation: 'portrait',
        marginLeft: 2,
        marginTop: 2,
        marginRight: 2,
        marginBottom: 2,
        cornerRadius: 1,
      },
      metadata: { targetPrinter: 'prn-01', site: 'Main Facility', version: 1, status: 'draft' },
      objects: [],
    };
  });
  const [historyPast, setHistoryPast] = useState<LabelDocument[]>([]);
  const [historyFuture, setHistoryFuture] = useState<LabelDocument[]>([]);
  const [isModified, setIsModified] = useState(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | undefined>(undefined);

  // Selection & Tools
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
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

  // Enterprise Role & BarTender Integration State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('PRINT_MANAGER');
  const [printJobs, setPrintJobs] = useState<PrintJob[]>(SAMPLE_PRINT_JOBS);
  const [auditLogs, setAuditLogs] = useState<PrintAuditLog[]>(SAMPLE_AUDIT_LOGS);
  const [barTenderTemplates, setBarTenderTemplates] = useState<BarTenderTemplateMetadata[]>(SAMPLE_BARTENDER_TEMPLATES);
  const [isBarTenderModalOpen, setIsBarTenderModalOpen] = useState(false);

  // Modals state
  const [isBarcodeWizardOpen, setIsBarcodeWizardOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Enterprise Print Job Dispatched Handler
  const handleJobDispatched = (job: PrintJob) => {
    setPrintJobs(prev => [job, ...prev]);
    const auditLog: PrintAuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      userId: 'usr-01',
      userName: currentUserRole === 'SYSTEM_ADMIN' ? 'Administrator' : 'Operator',
      userRole: currentUserRole,
      action: 'SUBMIT_JOB',
      jobId: job.id,
      printerId: job.printerId,
      printerName: job.printerName,
      templateName: job.templateName,
      result: 'SUCCESS',
      details: `Dispatched ${job.labelQuantity || job.copies} labels to ${job.printerName} via ${job.integrationMethod || 'BarTender Print Service'}. Handoff status: ${job.status}`,
    };
    setAuditLogs(prev => [auditLog, ...prev]);
    showToast(`Print Handoff Confirmed: Job ${job.id} dispatched to ${job.printerName}`);
    setCounter(prev => ({ ...prev, currentValue: prev.currentValue + job.copies }));
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
    setOpenDocuments(prev => {
      const exists = prev.some(d => d && d.id === newDoc.id);
      if (exists) {
        return prev.map(d => (d && d.id === newDoc.id ? newDoc : d)).filter(Boolean);
      }
      return [...prev.filter(Boolean), newDoc];
    });
    setIsModified(true);
  };

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryFuture(prev => [document, ...prev]);
    setHistoryPast(prev => prev.slice(0, prev.length - 1));
    setDocument(previous);
    setOpenDocuments(prev => prev.map(d => (d && d.id === previous.id ? previous : d)).filter(Boolean));
  }, [historyPast, document]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryPast(prev => [...prev, document]);
    setHistoryFuture(prev => prev.slice(1));
    setDocument(next);
    setOpenDocuments(prev => prev.map(d => (d && d.id === next.id ? next : d)).filter(Boolean));
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

  // Selection management helpers
  const handleSelectObject = (id: string | null) => {
    setSelectedObjectId(id);
    setSelectedObjectIds(id ? [id] : []);
  };

  const handleSelectObjects = (ids: string[]) => {
    setSelectedObjectIds(ids);
    setSelectedObjectId(ids.length > 0 ? ids[0] : null);
  };

  const handleUpdateMultipleObjects = (updates: Array<{ id: string; changes: Partial<LabelObject> }>) => {
    const updateMap = new Map(updates.map(u => [u.id, u.changes]));
    const newObjects = document.objects.map(obj => {
      if (updateMap.has(obj.id)) {
        return { ...obj, ...updateMap.get(obj.id) } as LabelObject;
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
    if (id) {
      const newObjects = document.objects.filter(o => o.id !== id);
      setSelectedObjectIds(prev => prev.filter(i => i !== id));
      if (selectedObjectId === id) setSelectedObjectId(null);
      pushHistory({ ...document, objects: newObjects });
      showToast('Object deleted');
      return;
    }

    if (selectedObjectIds.length > 0) {
      const count = selectedObjectIds.length;
      const newObjects = document.objects.filter(o => !selectedObjectIds.includes(o.id));
      setSelectedObjectIds([]);
      setSelectedObjectId(null);
      pushHistory({ ...document, objects: newObjects });
      showToast(count > 1 ? `Deleted ${count} objects` : 'Object deleted');
      return;
    }

    if (selectedObjectId) {
      const newObjects = document.objects.filter(o => o.id !== selectedObjectId);
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
      pushHistory({ ...document, objects: newObjects });
      showToast('Object deleted');
    }
  };

  const handleDuplicateObject = () => {
    const targetIds = selectedObjectIds.length > 0 ? selectedObjectIds : (selectedObjectId ? [selectedObjectId] : []);
    const targets = document.objects.filter(o => targetIds.includes(o.id));
    if (targets.length === 0) return;

    const newObjs: LabelObject[] = targets.map((obj, idx) => ({
      ...JSON.parse(JSON.stringify(obj)),
      id: `${obj.type}-${Date.now()}-${idx}`,
      name: `${obj.name} (Copy)`,
      x: obj.x + 3,
      y: obj.y + 3,
      zIndex: document.objects.length + idx + 1,
    }));

    pushHistory({ ...document, objects: [...document.objects, ...newObjs] });
    const newIds = newObjs.map(o => o.id);
    setSelectedObjectIds(newIds);
    setSelectedObjectId(newIds[0]);
    showToast(newObjs.length > 1 ? `Duplicated ${newObjs.length} objects` : 'Object duplicated');
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

  const handleAddMultilingualText = (
    text: string,
    fontFamily: string,
    direction: 'ltr' | 'rtl' = 'ltr',
    extraStyle?: Partial<TextStyle>
  ) => {
    const newObj: TextLabelObject = {
      id: `text-${Date.now()}`,
      name: `Text (${fontFamily.split(' ')[0]})`,
      type: 'text',
      x: 10,
      y: 15,
      width: 70,
      height: 14,
      rotation: 0,
      zIndex: document.objects.length + 1,
      visible: true,
      locked: false,
      opacity: 1,
      text,
      style: {
        fontFamily,
        fontSize: extraStyle?.fontSize || 14,
        fontWeight: extraStyle?.fontWeight || 'bold',
        fontStyle: extraStyle?.fontStyle || 'normal',
        underline: extraStyle?.underline || false,
        color: extraStyle?.color || '#000000',
        alignment: extraStyle?.alignment || (direction === 'rtl' ? 'right' : 'left'),
        direction,
        wrap: true,
      },
    };
    pushHistory({ ...document, objects: [...document.objects, newObj] });
    setSelectedObjectId(newObj.id);
    showToast(`Inserted ${fontFamily} text element`);
  };

  const handleApplyFontToSelected = (fontFamily: string, extraStyle?: Partial<TextStyle>) => {
    if (!selectedObjectId) return;
    const target = document.objects.find(o => o.id === selectedObjectId);
    if (!target || (target.type !== 'text' && target.type !== 'rich-text')) return;
    const textTarget = target as TextLabelObject;
    handleUpdateObject({
      style: {
        ...textTarget.style,
        fontFamily,
        ...(extraStyle || {}),
      },
    });
    showToast(`Applied ${fontFamily} to selected text`);
  };

  // Alignment & Distribution Helpers (supports both single object and multi-selection groups)
  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distribute-h' | 'distribute-v' | 'center-page-h' | 'center-page-v' | 'center-both') => {
    const activeIds = selectedObjectIds.length > 0 ? selectedObjectIds : (selectedObjectId ? [selectedObjectId] : []);
    const selectedObjs = document.objects.filter(o => activeIds.includes(o.id) && !o.locked);
    const labelW = document.dimensions.width;
    const labelH = document.dimensions.height;

    // Multi-object group alignment / distribution
    if (selectedObjs.length > 1) {
      if (type === 'distribute-h') {
        if (selectedObjs.length < 3) {
          showToast('Select at least 3 objects to distribute horizontally');
          return;
        }
        const sorted = [...selectedObjs].sort((a, b) => a.x - b.x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalObjWidth = sorted.slice(1, -1).reduce((sum, o) => sum + o.width, 0);
        const availableSpace = last.x - (first.x + first.width);
        const gap = Math.max(0, (availableSpace - totalObjWidth) / (sorted.length - 1));
        let currentX = first.x + first.width + gap;
        const posMap = new Map<string, number>();
        for (let i = 1; i < sorted.length - 1; i++) {
          posMap.set(sorted[i].id, Math.max(0, currentX));
          currentX += sorted[i].width + gap;
        }
        const newObjects = document.objects.map(obj => {
          if (posMap.has(obj.id)) {
            return { ...obj, x: Number(posMap.get(obj.id)!.toFixed(2)) };
          }
          return obj;
        });
        pushHistory({ ...document, objects: newObjects });
        showToast('Distributed objects horizontally');
        return;
      }

      if (type === 'distribute-v') {
        if (selectedObjs.length < 3) {
          showToast('Select at least 3 objects to distribute vertically');
          return;
        }
        const sorted = [...selectedObjs].sort((a, b) => a.y - b.y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalObjHeight = sorted.slice(1, -1).reduce((sum, o) => sum + o.height, 0);
        const availableSpace = last.y - (first.y + first.height);
        const gap = Math.max(0, (availableSpace - totalObjHeight) / (sorted.length - 1));
        let currentY = first.y + first.height + gap;
        const posMap = new Map<string, number>();
        for (let i = 1; i < sorted.length - 1; i++) {
          posMap.set(sorted[i].id, Math.max(0, currentY));
          currentY += sorted[i].height + gap;
        }
        const newObjects = document.objects.map(obj => {
          if (posMap.has(obj.id)) {
            return { ...obj, y: Number(posMap.get(obj.id)!.toFixed(2)) };
          }
          return obj;
        });
        pushHistory({ ...document, objects: newObjects });
        showToast('Distributed objects vertically');
        return;
      }

      const minX = Math.min(...selectedObjs.map(o => o.x));
      const maxX = Math.max(...selectedObjs.map(o => o.x + o.width));
      const minY = Math.min(...selectedObjs.map(o => o.y));
      const maxY = Math.max(...selectedObjs.map(o => o.y + o.height));
      const groupCenterX = minX + (maxX - minX) / 2;
      const groupCenterY = minY + (maxY - minY) / 2;

      // Group Page Centering
      if (type === 'center-page-h' || type === 'center-both') {
        const groupW = maxX - minX;
        const targetStartX = Math.max(0, (labelW - groupW) / 2);
        const dx = targetStartX - minX;
        const targetStartY = type === 'center-both' ? Math.max(0, (labelH - (maxY - minY)) / 2) : minY;
        const dy = targetStartY - minY;

        const newObjects = document.objects.map(obj => {
          if (!activeIds.includes(obj.id) || obj.locked) return obj;
          return {
            ...obj,
            x: Number((obj.x + dx).toFixed(2)),
            y: type === 'center-both' ? Number((obj.y + dy).toFixed(2)) : obj.y
          };
        });
        pushHistory({ ...document, objects: newObjects });
        showToast(`Centered ${selectedObjs.length} objects on label`);
        return;
      }

      if (type === 'center-page-v') {
        const groupH = maxY - minY;
        const targetStartY = Math.max(0, (labelH - groupH) / 2);
        const dy = targetStartY - minY;
        const newObjects = document.objects.map(obj => {
          if (!activeIds.includes(obj.id) || obj.locked) return obj;
          return { ...obj, y: Number((obj.y + dy).toFixed(2)) };
        });
        pushHistory({ ...document, objects: newObjects });
        showToast(`Centered ${selectedObjs.length} objects vertically on label`);
        return;
      }

      const newObjects = document.objects.map(obj => {
        if (!activeIds.includes(obj.id) || obj.locked) return obj;
        let newX = obj.x;
        let newY = obj.y;

        if (type === 'left') newX = minX;
        else if (type === 'center') newX = groupCenterX - obj.width / 2;
        else if (type === 'right') newX = maxX - obj.width;
        else if (type === 'top') newY = minY;
        else if (type === 'middle') newY = groupCenterY - obj.height / 2;
        else if (type === 'bottom') newY = maxY - obj.height;

        return { ...obj, x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) };
      });
      pushHistory({ ...document, objects: newObjects });
      showToast(`Aligned ${selectedObjs.length} objects (${type})`);
      return;
    }

    // Single object aligned relative to label edges / printable margins
    if (!selectedObject) return;

    let updated: Partial<LabelObject> = {};
    if (type === 'left') updated = { x: document.dimensions.marginLeft || 2 };
    if (type === 'center' || type === 'center-page-h') updated = { x: Number(((labelW - selectedObject.width) / 2).toFixed(2)) };
    if (type === 'right') updated = { x: Number((labelW - selectedObject.width - (document.dimensions.marginRight || 2)).toFixed(2)) };
    if (type === 'top') updated = { y: document.dimensions.marginTop || 2 };
    if (type === 'middle' || type === 'center-page-v') updated = { y: Number(((labelH - selectedObject.height) / 2).toFixed(2)) };
    if (type === 'bottom') updated = { y: Number((labelH - selectedObject.height - (document.dimensions.marginBottom || 2)).toFixed(2)) };
    if (type === 'center-both') {
      updated = {
        x: Number(((labelW - selectedObject.width) / 2).toFixed(2)),
        y: Number(((labelH - selectedObject.height) / 2).toFixed(2))
      };
    }

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

  // Document Save / Load (.lforge Package + .btw.json support)
  const handleSaveDocument = async () => {
    if (isDesktopApp()) {
      const res = await desktopSaveProject(document, currentFilePath);
      if (res.success) {
        if (res.filePath) setCurrentFilePath(res.filePath);
        setIsModified(false);
        showToast(`Template saved to: ${res.filePath}`);
      } else if (res.error && res.error !== 'Canceled by user') {
        showToast(`Save failed: ${res.error}`);
      }
      return;
    }

    const pkg = createLForgePackage(document);
    const json = JSON.stringify(pkg, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.name.replace(/\s+/g, '_')}.lforge`;
    a.click();
    URL.revokeObjectURL(url);
    setIsModified(false);
    showToast(`Template exported to ${document.name.replace(/\s+/g, '_')}.lforge (Checksum: ${pkg.manifest.checksum})`);
  };

  const handleSaveDocumentAs = async () => {
    if (isDesktopApp()) {
      const res = await desktopSaveProjectAs(document);
      if (res.success && res.filePath) {
        setCurrentFilePath(res.filePath);
        setIsModified(false);
        showToast(`Template saved as: ${res.filePath}`);
      }
      return;
    }
    handleSaveDocument();
  };

  const handleOpenDocument = async () => {
    if (isDesktopApp()) {
      const res = await desktopOpenProject();
      if (res.success && res.document) {
        pushHistory(res.document);
        setCurrentFilePath(res.filePath);
        setSelectedObjectId(null);
        showToast(`Successfully opened "${res.document.name}" (${res.filePath})`);
      } else if (res.error && res.error !== 'Canceled by user') {
        showToast(`Open failed: ${res.error}`);
      }
      return;
    }

    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.lforge,.json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const result = parseAndValidateLForgePackage(content);
        if (result.success && result.document) {
          pushHistory(result.document);
          setSelectedObjectId(null);
          showToast(`Successfully loaded "${result.document.name}" (${result.manifest ? 'Package v' + result.manifest.schemaVersion : 'Upgraded JSON'})`);
        } else {
          showToast(`Failed to load package: ${result.error || 'Invalid file format'}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Switch between industrial templates
  const handleSelectTemplate = (template: LabelDocument) => {
    if (!template || !template.id) return;
    if (!openDocuments.some(d => d && d.id === template.id)) {
      setOpenDocuments(prev => [...prev.filter(Boolean), template]);
    }
    pushHistory(template);
    setSelectedObjectId(null);
    showToast(`Loaded Template: ${template.name}`);
  };

  // Document Tab Management
  const handleSelectDocumentTab = (docId: string) => {
    const target = openDocuments.find(d => d && d.id === docId);
    if (target) {
      setDocument(target);
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
      showToast(`Switched to Document: ${target.name}`);
    }
  };

  const handleCloseDocumentTab = (docId: string) => {
    const validDocs = openDocuments.filter((d): d is LabelDocument => Boolean(d && d.id));
    if (validDocs.length <= 1) return;
    const remaining = validDocs.filter(d => d.id !== docId);
    setOpenDocuments(remaining);
    if (document.id === docId && remaining[0]) {
      setDocument(remaining[0]);
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
    }
  };

  const handleNewDocumentTab = () => {
    const validTemplates = (SAMPLE_TEMPLATES || []).filter(Boolean);
    const unOpened = validTemplates.find(t => !openDocuments.some(od => od && od.id === t.id));
    const baseTemplate = unOpened || validTemplates[0] || document;
    const nextDoc: LabelDocument = {
      ...baseTemplate,
      id: `doc-${Date.now()}`,
      name: `Custom_Label_${openDocuments.length + 1}`,
      objects: baseTemplate.objects ? [...baseTemplate.objects] : [],
    };
    setOpenDocuments(prev => [...prev.filter(Boolean), nextDoc]);
    setDocument(nextDoc);
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
    showToast(`Opened New Label Document: ${nextDoc.name}`);
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
        if (e.shiftKey) handleSaveDocumentAs();
        else handleSaveDocument();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenDocument();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewDocumentTab();
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
  }, [handleUndo, handleRedo, handleSaveDocument, handleSaveDocumentAs, handleOpenDocument, handleNewDocumentTab, handleDuplicateObject]);

  // Subscribe to native Electron desktop menu actions
  useEffect(() => {
    const unsubscribe = subscribeToDesktopMenu((action) => {
      switch (action) {
        case 'file:new':
          handleNewDocumentTab();
          break;
        case 'file:open':
          handleOpenDocument();
          break;
        case 'file:save':
          handleSaveDocument();
          break;
        case 'file:save-as':
          handleSaveDocumentAs();
          break;
        case 'print:open-dialog':
          setIsPrintModalOpen(true);
          break;
        case 'edit:undo':
          handleUndo();
          break;
        case 'edit:redo':
          handleRedo();
          break;
        case 'view:zoom-in':
          setZoom(z => Math.min(3.0, Number((z + 0.15).toFixed(2))));
          break;
        case 'view:zoom-out':
          setZoom(z => Math.max(0.25, Number((z - 0.15).toFixed(2))));
          break;
        case 'view:zoom-reset':
          setZoom(1.0);
          break;
        case 'project:preflight': {
          const errCount = diagnostics.filter(d => d.severity === 'error' || d.severity === 'blocker').length;
          const warnCount = diagnostics.filter(d => d.severity === 'warning').length;
          showToast(`Preflight Diagnostics: ${errCount} Errors, ${warnCount} Warnings`);
          break;
        }
        case 'project:database':
          setIsDatabaseModalOpen(true);
          break;
        case 'project:templates':
          setIsTemplateManagerOpen(true);
          break;
        case 'printer:bartender':
          setIsBarTenderModalOpen(true);
          break;
        case 'help:shortcuts':
          setIsShortcutsModalOpen(true);
          break;
        case 'help:about':
          showToast('LabelForge Studio Enterprise v3.0.0 (Windows Native Engine)');
          break;
      }
    });

    return () => unsubscribe();
  }, [handleNewDocumentTab, handleOpenDocument, handleSaveDocument, handleSaveDocumentAs, handleUndo, handleRedo, diagnostics]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#14161b] text-white overflow-hidden font-sans select-none">
      {/* 1. WINDOWS TITLEBAR */}
      <TitleBar
        documentName={document.name}
        isModified={isModified}
        onSave={handleSaveDocument}
        onOpen={handleOpenDocument}
        onPrint={() => setIsPrintModalOpen(true)}
        onOpenPrintPreview={() => setIsPrintModalOpen(true)}
        onOpenDataSources={() => setIsDatabaseModalOpen(true)}
        onOpenFontManager={() => setIsFontModalOpen(true)}
        onOpenTemplateManager={() => setIsTemplateManagerOpen(true)}
        onOpenBarTenderManager={() => setIsBarTenderModalOpen(true)}
        currentUserRole={currentUserRole}
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
        onOpenBarTenderManager={() => setIsBarTenderModalOpen(true)}
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
            selectedObjectIds={selectedObjectIds}
            onSelectObject={handleSelectObject}
            onSelectObjects={handleSelectObjects}
            onUpdateObject={handleUpdateObject}
            onUpdateMultipleObjects={handleUpdateMultipleObjects}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onAlign={handleAlign}
            onDuplicateSelected={handleDuplicateObject}
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
            isModified={isModified}
            openDocuments={openDocuments}
            activeDocumentId={document.id}
            onSelectDocumentTab={handleSelectDocumentTab}
            onCloseDocumentTab={handleCloseDocumentTab}
            onNewDocumentTab={handleNewDocumentTab}
            onSelectTemplate={handleSelectTemplate}
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
            onAlign={handleAlign}
            onZOrder={handleZOrder}
          />
        )}
      </div>

      {/* 4. BOTTOM DOCK (Layers, Preflight Diagnostics, Live Data Table) */}
      <BottomDock
        objects={document.objects}
        selectedObjectId={selectedObjectId}
        selectedObjectIds={selectedObjectIds}
        onSelectObject={handleSelectObject}
        onSelectObjects={handleSelectObjects}
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
        selectedObjectName={
          selectedObjectIds.length > 1
            ? `${selectedObjectIds.length} elements selected`
            : selectedObject?.name
        }
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
        currentUserRole={currentUserRole}
        barTenderTemplate={barTenderTemplates[0]}
        onJobDispatched={handleJobDispatched}
      />

      <BarTenderManagerModal
        isOpen={isBarTenderModalOpen}
        onClose={() => setIsBarTenderModalOpen(false)}
        printers={printers}
        onUpdatePrinters={setPrinters}
        printJobs={printJobs}
        onUpdatePrintJobs={setPrintJobs}
        auditLogs={auditLogs}
        onAddAuditLog={(log) => setAuditLogs(prev => [log, ...prev])}
        barTenderTemplates={barTenderTemplates}
        onUpdateTemplates={setBarTenderTemplates}
        currentUserRole={currentUserRole}
        onChangeUserRole={setCurrentUserRole}
        activeDocument={document}
        onSelectPrinter={(id) => {
          setActivePrinterId(id);
          const prn = printers.find(p => p.id === id);
          if (prn) showToast(`Active dispatch target set to: ${prn.name}`);
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
        selectedObject={selectedObject}
        onInsertMultilingualText={handleAddMultilingualText}
        onApplyFontToObject={handleApplyFontToSelected}
      />

      <WorkflowDesignerModal
        isOpen={isWorkflowModalOpen}
        onClose={() => setIsWorkflowModalOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        currentDocument={document}
        onLoadDocument={(doc) => {
          pushHistory(doc);
          setSelectedObjectId(null);
          setIsTemplateManagerOpen(false);
          showToast(`Loaded Template Package: ${doc.name}`);
        }}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-10 right-6 z-50 bg-[#1e2330] border border-blue-500/60 text-white text-xs px-3.5 py-2 rounded shadow-2xl flex items-center space-x-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Physical 1:1 Vector Print Substrate for Browser & Thermal Spoolers */}
      <div
        id="labelforge-print-portal"
        className="hidden print:block bg-white text-black overflow-hidden relative"
        style={{
          width: `${document.dimensions.width}${document.dimensions.unit}`,
          height: `${document.dimensions.height}${document.dimensions.unit}`,
          margin: 0,
          padding: 0
        }}
      >
        {document.objects.map((obj) => (
          <div
            key={obj.id}
            style={{
              position: 'absolute',
              left: `${obj.x}${document.dimensions.unit}`,
              top: `${obj.y}${document.dimensions.unit}`,
              width: `${obj.width}${document.dimensions.unit}`,
              height: `${obj.height}${document.dimensions.unit}`,
              transform: obj.rotation ? `rotate(${obj.rotation}deg)` : undefined,
              transformOrigin: 'top left'
            }}
          >
            {renderLabelObjectContent(
              obj,
              activeDataSource?.data?.[activeRecordIndex],
              counter
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
