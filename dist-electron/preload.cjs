"use strict";

// electron/preload.ts
var import_electron = require("electron");
var electronAPI = {
  isElectron: true,
  app: {
    getInfo: () => import_electron.ipcRenderer.invoke("app:get-info"),
    quit: () => import_electron.ipcRenderer.invoke("app:quit")
  },
  window: {
    minimize: () => import_electron.ipcRenderer.invoke("window:minimize"),
    toggleMaximize: () => import_electron.ipcRenderer.invoke("window:toggle-maximize"),
    isMaximized: () => import_electron.ipcRenderer.invoke("window:is-maximized"),
    close: () => import_electron.ipcRenderer.invoke("window:close"),
    onMaximizeChanged: (callback) => {
      const subscription = (_event, isMax) => callback(isMax);
      import_electron.ipcRenderer.on("window:maximize-changed", subscription);
      return () => {
        import_electron.ipcRenderer.removeListener("window:maximize-changed", subscription);
      };
    }
  },
  dialog: {
    openFile: (options) => import_electron.ipcRenderer.invoke("dialog:open-file", options),
    saveFile: (options) => import_electron.ipcRenderer.invoke("dialog:save-file", options),
    selectFolder: () => import_electron.ipcRenderer.invoke("dialog:select-folder"),
    showMessageBox: (options) => import_electron.ipcRenderer.invoke("dialog:message-box", options)
  },
  project: {
    create: () => import_electron.ipcRenderer.invoke("project:create"),
    open: (filePath) => import_electron.ipcRenderer.invoke("project:open", filePath),
    save: (projectData, filePath) => import_electron.ipcRenderer.invoke("project:save", projectData, filePath),
    saveAs: (projectData) => import_electron.ipcRenderer.invoke("project:save-as", projectData),
    recent: () => import_electron.ipcRenderer.invoke("project:recent"),
    clearRecent: () => import_electron.ipcRenderer.invoke("project:clear-recent")
  },
  printer: {
    list: () => import_electron.ipcRenderer.invoke("printer:list"),
    getDefault: () => import_electron.ipcRenderer.invoke("printer:default"),
    print: (request) => import_electron.ipcRenderer.invoke("printer:print", request),
    testPrint: (printerName, protocol) => import_electron.ipcRenderer.invoke("printer:test", printerName, protocol)
  },
  system: {
    getInfo: () => import_electron.ipcRenderer.invoke("system:get-info")
  },
  settings: {
    get: () => import_electron.ipcRenderer.invoke("settings:get"),
    set: (settings) => import_electron.ipcRenderer.invoke("settings:set", settings)
  },
  onMenuAction: (callback) => {
    const subscription = (_event, action) => callback(action);
    import_electron.ipcRenderer.on("menu:action", subscription);
    return () => {
      import_electron.ipcRenderer.removeListener("menu:action", subscription);
    };
  }
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
import_electron.contextBridge.exposeInMainWorld("labelForge", electronAPI);
//# sourceMappingURL=preload.cjs.map
