/**
 * LabelForge Desktop - Typed Electron API Definition
 * Exposes secure IPC communication channels between Renderer and Main Process
 */

import { LForgePackage } from '../services/lforgePackage';

export interface ElectronAppInfo {
  version: string;
  name: string;
  platform: string;
  isPackaged: boolean;
  appDataPath: string;
}

export interface ElectronSystemInfo {
  platform: string;
  arch: string;
  osRelease: string;
  hostname: string;
  totalMemoryMB: number;
  freeMemoryMB: number;
  cpus: number;
}

export interface NativePrinterInfo {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
  options?: Record<string, any>;
}

export interface DesktopPrintRequest {
  printerName: string;
  printerType: 'windows' | 'network' | 'zpl' | 'tspl' | 'bartender';
  copies?: number;
  rawPayload?: string; // ZPL, TSPL, EPL command stream
  networkHost?: string;
  networkPort?: number; // default 9100
  bartenderTemplate?: string;
  bartenderPayload?: Record<string, any>;
  previewDataUrl?: string;
  jobName?: string;
}

export interface DesktopPrintResult {
  success: boolean;
  jobId?: string;
  bytesWritten?: number;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface RecentProjectItem {
  filePath: string;
  fileName: string;
  lastOpened: string;
  labelName?: string;
}

export interface AppSettings {
  defaultPrinterId?: string;
  measurementUnit?: 'mm' | 'in' | 'cm' | 'pt';
  defaultDpi?: number;
  darkness?: number;
  printSpeed?: number;
  autoSaveIntervalSec?: number;
  autoPreflightCheck?: boolean;
  networkPrinters?: Array<{
    id: string;
    name: string;
    host: string;
    port: number;
    protocol: 'zpl' | 'tspl' | 'raw';
  }>;
}

export interface OpenFileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface SaveFileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface ElectronAPI {
  isElectron: boolean;

  app: {
    getInfo(): Promise<ElectronAppInfo>;
    quit(): Promise<void>;
  };

  dialog: {
    openFile(options?: OpenFileDialogOptions): Promise<{ canceled: boolean; filePath?: string; fileContent?: string }>;
    saveFile(options?: SaveFileDialogOptions): Promise<{ canceled: boolean; filePath?: string }>;
    selectFolder(): Promise<{ canceled: boolean; folderPath?: string }>;
    showMessageBox(options: { type?: 'none' | 'info' | 'error' | 'question' | 'warning'; title: string; message: string; buttons?: string[] }): Promise<{ response: number }>;
  };

  project: {
    create(): Promise<{ success: boolean }>;
    open(filePath?: string): Promise<{ success: boolean; package?: LForgePackage; filePath?: string; error?: string }>;
    save(projectData: LForgePackage, filePath?: string): Promise<{ success: boolean; filePath?: string; error?: string }>;
    saveAs(projectData: LForgePackage): Promise<{ success: boolean; filePath?: string; error?: string }>;
    recent(): Promise<RecentProjectItem[]>;
    clearRecent(): Promise<void>;
  };

  printer: {
    list(): Promise<NativePrinterInfo[]>;
    getDefault(): Promise<NativePrinterInfo | null>;
    print(request: DesktopPrintRequest): Promise<DesktopPrintResult>;
    testPrint(printerName: string, protocol?: 'zpl' | 'tspl' | 'spooler'): Promise<DesktopPrintResult>;
  };

  filesystem: {
    read(path: string): Promise<string>;
    write(path: string, content: string): Promise<void>;
    exists(path: string): Promise<boolean>;
  };

  system: {
    getInfo(): Promise<ElectronSystemInfo>;
  };

  settings: {
    get(): Promise<AppSettings>;
    set(settings: Partial<AppSettings>): Promise<AppSettings>;
  };

  onMenuAction(callback: (action: string) => void): () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
