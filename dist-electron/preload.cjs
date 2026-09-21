"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  app: {
    getInfo: () => import_electron.ipcRenderer.invoke("app:get-info"),
    quit: () => import_electron.ipcRenderer.invoke("app:quit")
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
  filesystem: {
    read: (path) => import_electron.ipcRenderer.invoke("file:read", path),
    write: (path, content) => import_electron.ipcRenderer.invoke("file:write", path, content),
    exists: (path) => import_electron.ipcRenderer.invoke("file:exists", path)
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
});
//# sourceMappingURL=preload.cjs.map
