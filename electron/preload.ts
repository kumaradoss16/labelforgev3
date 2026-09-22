/**
 * LabelForge Desktop - Secure Electron Preload Bridge
 * Strict context isolation with no direct Node API exposure
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose controlled, namespaced API to window.electronAPI
const electronAPI = {
  isElectron: true,

  app: {
    getInfo: () => ipcRenderer.invoke('app:get-info'),
    quit: () => ipcRenderer.invoke('app:quit')
  },

  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    close: () => ipcRenderer.invoke('window:close'),
    onMaximizeChanged: (callback: (isMaximized: boolean) => void) => {
      const subscription = (_event: any, isMax: boolean) => callback(isMax);
      ipcRenderer.on('window:maximize-changed', subscription);
      return () => {
        ipcRenderer.removeListener('window:maximize-changed', subscription);
      };
    }
  },

  dialog: {
    openFile: (options: any) => ipcRenderer.invoke('dialog:open-file', options),
    saveFile: (options: any) => ipcRenderer.invoke('dialog:save-file', options),
    selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
    showMessageBox: (options: any) => ipcRenderer.invoke('dialog:message-box', options)
  },

  project: {
    create: () => ipcRenderer.invoke('project:create'),
    open: (filePath?: string) => ipcRenderer.invoke('project:open', filePath),
    save: (projectData: any, filePath?: string) => ipcRenderer.invoke('project:save', projectData, filePath),
    saveAs: (projectData: any) => ipcRenderer.invoke('project:save-as', projectData),
    recent: () => ipcRenderer.invoke('project:recent'),
    clearRecent: () => ipcRenderer.invoke('project:clear-recent')
  },

  printer: {
    list: () => ipcRenderer.invoke('printer:list'),
    getDefault: () => ipcRenderer.invoke('printer:default'),
    print: (request: any) => ipcRenderer.invoke('printer:print', request),
    testPrint: (printerName: string, protocol?: string) => ipcRenderer.invoke('printer:test', printerName, protocol)
  },

  filesystem: {
    read: (path: string) => ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content),
    exists: (path: string) => ipcRenderer.invoke('file:exists', path)
  },

  system: {
    getInfo: () => ipcRenderer.invoke('system:get-info')
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (settings: any) => ipcRenderer.invoke('settings:set', settings)
  },

  onMenuAction: (callback: (action: string) => void) => {
    const subscription = (_event: any, action: string) => callback(action);
    ipcRenderer.on('menu:action', subscription);
    return () => {
      ipcRenderer.removeListener('menu:action', subscription);
    };
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
// Backward compatibility and desktop runtime alias
contextBridge.exposeInMainWorld('labelForge', electronAPI);
