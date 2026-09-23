/**
 * LabelForge Desktop Bridge
 * Provides isomorphic interface between React UI and Native Electron IPC
 * with safe graceful fallbacks for web preview environments
 */

import { LabelDocument } from '../types/label';
import { createLForgePackage, LForgePackage } from './lforgePackage';
import { NativePrinterInfo, DesktopPrintRequest, DesktopPrintResult, RecentProjectItem, AppSettings } from '../types/electron';

export function isDesktopApp(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
}

export async function desktopGetAppInfo() {
  if (isDesktopApp()) {
    return await window.electronAPI!.app.getInfo();
  }
  return {
    version: '3.0.0 (Web Preview)',
    name: 'LabelForge Studio Web',
    platform: 'web',
    isPackaged: false,
    appDataPath: 'browser-storage'
  };
}

export async function desktopOpenProject(): Promise<{ success: boolean; document?: LabelDocument; filePath?: string; error?: string }> {
  if (isDesktopApp()) {
    const res = await window.electronAPI!.project.open();
    if (res.success && res.package?.document) {
      return {
        success: true,
        document: res.package.document,
        filePath: res.filePath
      };
    }
    return { success: false, error: res.error || 'Failed to open project' };
  }

  // Web fallback: Trigger standard file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.lforge,.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) {
        resolve({ success: false, error: 'No file selected' });
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const doc = parsed.document || parsed;
        resolve({ success: true, document: doc, filePath: file.name });
      } catch (err: any) {
        resolve({ success: false, error: err.message });
      }
    };
    input.click();
  });
}

export async function desktopSaveProject(doc: LabelDocument, currentFilePath?: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const pkg: LForgePackage = createLForgePackage(doc);

  if (isDesktopApp()) {
    return await window.electronAPI!.project.save(pkg, currentFilePath);
  }

  // Web fallback: Browser file download
  try {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(pkg, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${doc.name || 'Untitled'}.lforge`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    return { success: true, filePath: `${doc.name || 'Untitled'}.lforge` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function desktopSaveProjectAs(doc: LabelDocument): Promise<{ success: boolean; filePath?: string; error?: string }> {
  const pkg: LForgePackage = createLForgePackage(doc);

  if (isDesktopApp()) {
    return await window.electronAPI!.project.saveAs(pkg);
  }

  return desktopSaveProject(doc);
}

export async function desktopGetRecentProjects(): Promise<RecentProjectItem[]> {
  if (isDesktopApp()) {
    return await window.electronAPI!.project.recent();
  }
  return [];
}

export async function desktopGetPrinters(): Promise<NativePrinterInfo[]> {
  if (isDesktopApp()) {
    return await window.electronAPI!.printer.list();
  }
  return [];
}

export async function desktopPrintLabel(request: DesktopPrintRequest): Promise<DesktopPrintResult> {
  if (isDesktopApp()) {
    const identity = request.identity || (typeof window !== 'undefined' ? (window as any).currentIdentity : undefined);
    return await window.electronAPI!.printer.print({ ...request, identity });
  }

  // Web fallback: Browser window.print()
  window.print();
  return { success: true, jobId: `web-${Date.now()}` };
}

export async function desktopTestPrint(printerName: string, protocol?: 'zpl' | 'tspl' | 'spooler'): Promise<DesktopPrintResult> {
  if (isDesktopApp()) {
    const identity = typeof window !== 'undefined' ? (window as any).currentIdentity : undefined;
    return await window.electronAPI!.printer.testPrint(printerName, protocol, identity);
  }
  return { success: false, error: { code: 'NOT_DESKTOP', message: 'Direct thermal hardware test print requires desktop execution' } };
}

export async function desktopGetSettings(): Promise<AppSettings> {
  if (isDesktopApp()) {
    return await window.electronAPI!.settings.get();
  }
  return {};
}

export async function desktopSaveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  if (isDesktopApp()) {
    return await window.electronAPI!.settings.set(settings);
  }
  return settings;
}

export function subscribeToDesktopMenu(callback: (action: string) => void): () => void {
  if (isDesktopApp() && window.electronAPI?.onMenuAction) {
    return window.electronAPI.onMenuAction(callback);
  }
  return () => {};
}

export async function desktopWindowMinimize(): Promise<void> {
  if (isDesktopApp() && window.electronAPI?.window?.minimize) {
    await window.electronAPI.window.minimize();
  }
}

export async function desktopWindowToggleMaximize(): Promise<boolean> {
  if (isDesktopApp() && window.electronAPI?.window?.toggleMaximize) {
    return await window.electronAPI.window.toggleMaximize();
  }
  return false;
}

export async function desktopWindowIsMaximized(): Promise<boolean> {
  if (isDesktopApp() && window.electronAPI?.window?.isMaximized) {
    return await window.electronAPI.window.isMaximized();
  }
  return false;
}

export async function desktopWindowClose(): Promise<void> {
  if (isDesktopApp() && window.electronAPI?.window?.close) {
    await window.electronAPI.window.close();
  } else {
    window.close();
  }
}

export function onDesktopWindowMaximizeChanged(callback: (isMaximized: boolean) => void): () => void {
  if (isDesktopApp() && window.electronAPI?.window?.onMaximizeChanged) {
    return window.electronAPI.window.onMaximizeChanged(callback);
  }
  return () => {};
}

