"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron9 = require("electron");
var import_path6 = __toESM(require("path"), 1);

// electron/config/paths.ts
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_electron = require("electron");
var PathManager = class {
  userDataDir = "";
  init() {
    try {
      this.userDataDir = import_electron.app.getPath("userData");
    } catch {
      const base = process.env.APPDATA || (process.platform === "darwin" ? import_path.default.join(process.env.HOME || "", "Library", "Application Support") : import_path.default.join(process.env.HOME || "", ".config"));
      this.userDataDir = import_path.default.join(base, "LabelForge");
    }
    this.ensureDir(this.getSettingsDir());
    this.ensureDir(this.getLogsDir());
    this.ensureDir(this.getRecentDir());
    this.ensureDir(this.getTemplatesDir());
    this.ensureDir(this.getCacheDir());
  }
  ensureDir(dir) {
    if (!import_fs.default.existsSync(dir)) {
      try {
        import_fs.default.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.error(`Failed to create directory: ${dir}`, err);
      }
    }
  }
  getUserDataDir() {
    return this.userDataDir;
  }
  getSettingsDir() {
    return import_path.default.join(this.userDataDir, "settings");
  }
  getSettingsFilePath() {
    return import_path.default.join(this.getSettingsDir(), "app-settings.json");
  }
  getLogsDir() {
    return import_path.default.join(this.userDataDir, "logs");
  }
  getAppLogFilePath() {
    return import_path.default.join(this.getLogsDir(), "labelforge.log");
  }
  getRecentDir() {
    return import_path.default.join(this.userDataDir, "recent");
  }
  getRecentFilePath() {
    return import_path.default.join(this.getRecentDir(), "recent-projects.json");
  }
  getTemplatesDir() {
    return import_path.default.join(this.userDataDir, "templates");
  }
  getCacheDir() {
    return import_path.default.join(this.userDataDir, "cache");
  }
  getPreloadPath() {
    return import_path.default.join(__dirname, "preload.cjs");
  }
  getAppHtmlPath() {
    return import_path.default.join(import_electron.app.getAppPath(), "dist", "index.html");
  }
};
var paths = new PathManager();

// electron/config/appConfig.ts
var appConfig = {
  appId: "com.devspire.labelforge",
  productName: "LabelForge",
  version: "3.0.0",
  window: {
    defaultWidth: 1440,
    defaultHeight: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#181a1f"
  },
  devServerUrl: "http://localhost:3000",
  maxRecentProjects: 20
};

// electron/utils/logger.ts
var import_fs2 = __toESM(require("fs"), 1);
var Logger = class {
  logFilePath = "";
  init() {
    this.logFilePath = paths.getAppLogFilePath();
  }
  sanitize(message) {
    return message.replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_API_KEY]").replace(/bearer\s+[A-Za-z0-9-_.]+/gi, "Bearer [REDACTED_TOKEN]").replace(/password\s*[:=]\s*["'][^"']+["']/gi, 'password="[REDACTED]"');
  }
  write(level, context, message, data) {
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const sanitizedMsg = this.sanitize(message);
    const dataStr = data ? " " + JSON.stringify(data) : "";
    const formatted = `[${timestamp}] [${level}] [${context}] ${sanitizedMsg}${dataStr}
`;
    if (level === "ERROR") {
      console.error(formatted.trim());
    } else if (level === "WARN") {
      console.warn(formatted.trim());
    } else {
      console.log(formatted.trim());
    }
    if (this.logFilePath) {
      try {
        import_fs2.default.appendFileSync(this.logFilePath, formatted, { encoding: "utf-8" });
      } catch (err) {
        console.error("Failed to append log to file", err);
      }
    }
  }
  debug(context, message, data) {
    this.write("DEBUG", context, message, data);
  }
  info(context, message, data) {
    this.write("INFO", context, message, data);
  }
  warn(context, message, data) {
    this.write("WARN", context, message, data);
  }
  error(context, message, data) {
    this.write("ERROR", context, message, data);
  }
};
var logger = new Logger();

// electron/ipc/app/appHandlers.ts
var import_electron2 = require("electron");
function registerAppHandlers() {
  import_electron2.ipcMain.handle("app:get-info", async () => {
    return {
      version: appConfig.version,
      name: appConfig.productName,
      platform: process.platform,
      isPackaged: import_electron2.app.isPackaged,
      appDataPath: paths.getUserDataDir()
    };
  });
  import_electron2.ipcMain.handle("app:quit", async () => {
    import_electron2.app.quit();
  });
}

// electron/ipc/dialog/dialogHandlers.ts
var import_electron3 = require("electron");
var import_fs3 = __toESM(require("fs"), 1);
function registerDialogHandlers() {
  import_electron3.ipcMain.handle("dialog:open-file", async (_event, options = {}) => {
    const win = import_electron3.BrowserWindow.getFocusedWindow() || import_electron3.BrowserWindow.getAllWindows()[0];
    const defaultFilters = [
      { name: "LabelForge Project (*.lforge)", extensions: ["lforge"] },
      { name: "JSON Document (*.json)", extensions: ["json"] },
      { name: "All Files (*.*)", extensions: ["*"] }
    ];
    try {
      const result = await import_electron3.dialog.showOpenDialog(win, {
        title: options.title || "Open LabelForge Project",
        defaultPath: options.defaultPath,
        filters: options.filters || defaultFilters,
        properties: ["openFile"]
      });
      if (result.canceled || !result.filePaths.length) {
        return { canceled: true };
      }
      const filePath = result.filePaths[0];
      const fileContent = await import_fs3.default.promises.readFile(filePath, "utf-8");
      return {
        canceled: false,
        filePath,
        fileContent
      };
    } catch (err) {
      logger.error("DialogHandlers", `openFile failed: ${err.message}`);
      return { canceled: true, error: err.message };
    }
  });
  import_electron3.ipcMain.handle("dialog:save-file", async (_event, options = {}) => {
    const win = import_electron3.BrowserWindow.getFocusedWindow() || import_electron3.BrowserWindow.getAllWindows()[0];
    const defaultFilters = [
      { name: "LabelForge Project (*.lforge)", extensions: ["lforge"] },
      { name: "JSON Document (*.json)", extensions: ["json"] }
    ];
    try {
      const result = await import_electron3.dialog.showSaveDialog(win, {
        title: options.title || "Save LabelForge Project As",
        defaultPath: options.defaultPath || "UntitledLabel.lforge",
        filters: options.filters || defaultFilters
      });
      if (result.canceled || !result.filePath) {
        return { canceled: true };
      }
      return {
        canceled: false,
        filePath: result.filePath
      };
    } catch (err) {
      logger.error("DialogHandlers", `saveFile failed: ${err.message}`);
      return { canceled: true, error: err.message };
    }
  });
  import_electron3.ipcMain.handle("dialog:select-folder", async () => {
    const win = import_electron3.BrowserWindow.getFocusedWindow() || import_electron3.BrowserWindow.getAllWindows()[0];
    try {
      const result = await import_electron3.dialog.showOpenDialog(win, {
        title: "Select Destination Folder",
        properties: ["openDirectory", "createDirectory"]
      });
      if (result.canceled || !result.filePaths.length) {
        return { canceled: true };
      }
      return {
        canceled: false,
        folderPath: result.filePaths[0]
      };
    } catch (err) {
      logger.error("DialogHandlers", `selectFolder failed: ${err.message}`);
      return { canceled: true, error: err.message };
    }
  });
  import_electron3.ipcMain.handle("dialog:message-box", async (_event, options = {}) => {
    const win = import_electron3.BrowserWindow.getFocusedWindow() || import_electron3.BrowserWindow.getAllWindows()[0];
    try {
      const result = await import_electron3.dialog.showMessageBox(win, {
        type: options.type || "info",
        title: options.title || "LabelForge Studio",
        message: options.message || "",
        buttons: options.buttons || ["OK"]
      });
      return { response: result.response };
    } catch (err) {
      logger.error("DialogHandlers", `showMessageBox failed: ${err.message}`);
      return { response: 0 };
    }
  });
}

// electron/ipc/projects/projectHandlers.ts
var import_electron4 = require("electron");

// electron/services/filesystem/projectStorage.ts
var import_path4 = __toESM(require("path"), 1);

// electron/services/filesystem/fileManager.ts
var import_fs4 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);

// electron/utils/errors.ts
var ApplicationError = class _ApplicationError extends Error {
  code;
  details;
  constructor(code, message, details) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, _ApplicationError.prototype);
  }
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
};
var FileError = class extends ApplicationError {
  constructor(message, details) {
    super("ERR_FILESYSTEM", message, details);
    this.name = "FileError";
  }
};
var ProjectError = class extends ApplicationError {
  constructor(message, details) {
    super("ERR_PROJECT_CORRUPT", message, details);
    this.name = "ProjectError";
  }
};
var ValidationError = class extends ApplicationError {
  constructor(message, details) {
    super("ERR_VALIDATION_FAILED", message, details);
    this.name = "ValidationError";
  }
};

// electron/services/filesystem/fileManager.ts
var FileManager = class {
  async readFile(filePath) {
    try {
      if (!import_fs4.default.existsSync(filePath)) {
        throw new FileError(`File does not exist: ${filePath}`);
      }
      return await import_fs4.default.promises.readFile(filePath, "utf-8");
    } catch (err) {
      logger.error("FileManager", `Failed to read file ${filePath}: ${err.message}`);
      throw new FileError(`Failed to read file: ${err.message}`, { path: filePath });
    }
  }
  async writeFile(filePath, content) {
    try {
      const dir = import_path2.default.dirname(filePath);
      if (!import_fs4.default.existsSync(dir)) {
        await import_fs4.default.promises.mkdir(dir, { recursive: true });
      }
      const tempPath = `${filePath}.${Date.now()}.tmp`;
      await import_fs4.default.promises.writeFile(tempPath, content, "utf-8");
      await import_fs4.default.promises.rename(tempPath, filePath);
      logger.info("FileManager", `Successfully wrote file ${filePath} (${content.length} bytes)`);
    } catch (err) {
      logger.error("FileManager", `Failed to write file ${filePath}: ${err.message}`);
      throw new FileError(`Failed to write file: ${err.message}`, { path: filePath });
    }
  }
  fileExists(filePath) {
    return import_fs4.default.existsSync(filePath);
  }
};
var fileManager = new FileManager();

// electron/services/filesystem/recentFiles.ts
var import_fs5 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var RecentProjectsService = class {
  getStoragePath() {
    return paths.getRecentFilePath();
  }
  getRecent() {
    const file = this.getStoragePath();
    if (!import_fs5.default.existsSync(file)) {
      return [];
    }
    try {
      const raw = import_fs5.default.readFileSync(file, "utf-8");
      const list = JSON.parse(raw);
      const existing = list.filter((item) => {
        try {
          return import_fs5.default.existsSync(item.filePath);
        } catch {
          return false;
        }
      });
      return existing.slice(0, appConfig.maxRecentProjects);
    } catch (err) {
      logger.error("RecentProjectsService", "Failed to read recent projects", err);
      return [];
    }
  }
  addRecent(filePath, labelName) {
    try {
      const current = this.getRecent();
      const normalized = import_path3.default.normalize(filePath);
      const fileName = import_path3.default.basename(normalized);
      const filtered = current.filter((item) => import_path3.default.normalize(item.filePath) !== normalized);
      const updated = [
        {
          filePath: normalized,
          fileName,
          lastOpened: (/* @__PURE__ */ new Date()).toISOString(),
          labelName: labelName || fileName.replace(/\.lforge$/i, "")
        },
        ...filtered
      ].slice(0, appConfig.maxRecentProjects);
      import_fs5.default.writeFileSync(this.getStoragePath(), JSON.stringify(updated, null, 2), "utf-8");
      logger.info("RecentProjectsService", `Added recent file: ${normalized}`);
    } catch (err) {
      logger.error("RecentProjectsService", `Failed to update recent files: ${filePath}`, err);
    }
  }
  clearRecent() {
    try {
      import_fs5.default.writeFileSync(this.getStoragePath(), JSON.stringify([]), "utf-8");
      logger.info("RecentProjectsService", "Cleared recent projects list");
    } catch (err) {
      logger.error("RecentProjectsService", "Failed to clear recent projects", err);
    }
  }
};
var recentProjects = new RecentProjectsService();

// electron/services/filesystem/projectStorage.ts
var ProjectStorageService = class {
  async loadProject(filePath) {
    logger.info("ProjectStorageService", `Loading project from ${filePath}`);
    const content = await fileManager.readFile(filePath);
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new ProjectError(`Project file is not valid JSON: ${err.message}`, { path: filePath });
    }
    if (!parsed.manifest || parsed.manifest.format !== "LabelForge Package") {
      if (parsed.dimensions && Array.isArray(parsed.objects)) {
        logger.warn("ProjectStorageService", "Converting legacy raw label document to .lforge package");
        const legacyDoc = parsed;
        const pkg = {
          manifest: {
            format: "LabelForge Package",
            extension: ".lforge",
            schemaVersion: "2.0.0",
            templateId: legacyDoc.id || `legacy-${Date.now()}`,
            name: legacyDoc.name || import_path4.default.basename(filePath, ".lforge"),
            checksum: "legacy-import",
            createdAt: legacyDoc.created || (/* @__PURE__ */ new Date()).toISOString(),
            modifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
            author: legacyDoc.author || "User",
            producerVersion: "LabelForge Desktop 3.0.0"
          },
          document: legacyDoc
        };
        recentProjects.addRecent(filePath, pkg.manifest.name);
        return pkg;
      }
      throw new ProjectError("File is missing valid LabelForge manifest or document structure", { path: filePath });
    }
    if (!parsed.document || !parsed.document.dimensions || !Array.isArray(parsed.document.objects)) {
      throw new ProjectError("LabelForge document definition is incomplete or corrupted", { path: filePath });
    }
    recentProjects.addRecent(filePath, parsed.manifest.name || parsed.document.name);
    return parsed;
  }
  async saveProject(filePath, pkg) {
    logger.info("ProjectStorageService", `Saving project to ${filePath}`);
    if (!pkg || !pkg.document) {
      throw new ProjectError("Cannot save empty project payload", { path: filePath });
    }
    const updatedPkg = {
      ...pkg,
      manifest: {
        ...pkg.manifest,
        format: "LabelForge Package",
        extension: ".lforge",
        schemaVersion: "2.0.0",
        modifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
        producerVersion: "LabelForge Desktop 3.0.0"
      }
    };
    const jsonString = JSON.stringify(updatedPkg, null, 2);
    await fileManager.writeFile(filePath, jsonString);
    recentProjects.addRecent(filePath, updatedPkg.manifest.name || updatedPkg.document.name);
    logger.info("ProjectStorageService", `Project successfully saved to ${filePath}`);
  }
};
var projectStorage = new ProjectStorageService();

// electron/utils/validation.ts
var import_path5 = __toESM(require("path"), 1);
function validateFilePath(filePath, allowedExtensions = [".lforge", ".json", ".txt"]) {
  if (!filePath || typeof filePath !== "string") {
    throw new ValidationError("File path must be a non-empty string");
  }
  if (filePath.indexOf("\0") !== -1) {
    throw new ValidationError("File path contains invalid null byte characters");
  }
  const normalized = import_path5.default.normalize(filePath);
  const ext = import_path5.default.extname(normalized).toLowerCase();
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
    throw new ValidationError(`Unsupported file extension '${ext}'. Allowed: ${allowedExtensions.join(", ")}`);
  }
  return normalized;
}
function validatePrintRequest(request) {
  if (!request || typeof request !== "object") {
    throw new ValidationError("Invalid print request payload");
  }
  if (!request.printerName || typeof request.printerName !== "string") {
    throw new ValidationError("Print request missing target printerName");
  }
  if (request.copies !== void 0 && (typeof request.copies !== "number" || request.copies < 1 || request.copies > 9999)) {
    throw new ValidationError("Invalid copy count (must be between 1 and 9999)");
  }
}

// electron/ipc/projects/projectHandlers.ts
function registerProjectHandlers() {
  import_electron4.ipcMain.handle("project:create", async () => {
    logger.info("ProjectHandlers", "New project requested");
    return { success: true };
  });
  import_electron4.ipcMain.handle("project:open", async (_event, filePath) => {
    try {
      let targetPath = filePath;
      if (!targetPath) {
        const win = import_electron4.BrowserWindow.getFocusedWindow() || import_electron4.BrowserWindow.getAllWindows()[0];
        const res = await import_electron4.dialog.showOpenDialog(win, {
          title: "Open LabelForge Project",
          filters: [
            { name: "LabelForge Projects (*.lforge)", extensions: ["lforge"] },
            { name: "JSON Projects (*.json)", extensions: ["json"] },
            { name: "All Files (*.*)", extensions: ["*"] }
          ],
          properties: ["openFile"]
        });
        if (res.canceled || !res.filePaths.length) {
          return { success: false, error: "Canceled by user" };
        }
        targetPath = res.filePaths[0];
      }
      const validPath = validateFilePath(targetPath, [".lforge", ".json"]);
      const pkg = await projectStorage.loadProject(validPath);
      return {
        success: true,
        package: pkg,
        filePath: validPath
      };
    } catch (err) {
      logger.error("ProjectHandlers", `Failed to open project: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  });
  import_electron4.ipcMain.handle("project:save", async (_event, projectData, filePath) => {
    try {
      let targetPath = filePath;
      if (!targetPath) {
        const win = import_electron4.BrowserWindow.getFocusedWindow() || import_electron4.BrowserWindow.getAllWindows()[0];
        const res = await import_electron4.dialog.showSaveDialog(win, {
          title: "Save LabelForge Project",
          defaultPath: `${projectData?.manifest?.name || "Untitled"}.lforge`,
          filters: [{ name: "LabelForge Project (*.lforge)", extensions: ["lforge"] }]
        });
        if (res.canceled || !res.filePath) {
          return { success: false, error: "Canceled by user" };
        }
        targetPath = res.filePath;
      }
      const validPath = validateFilePath(targetPath, [".lforge", ".json"]);
      await projectStorage.saveProject(validPath, projectData);
      return {
        success: true,
        filePath: validPath
      };
    } catch (err) {
      logger.error("ProjectHandlers", `Failed to save project: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  });
  import_electron4.ipcMain.handle("project:save-as", async (_event, projectData) => {
    try {
      const win = import_electron4.BrowserWindow.getFocusedWindow() || import_electron4.BrowserWindow.getAllWindows()[0];
      const res = await import_electron4.dialog.showSaveDialog(win, {
        title: "Save LabelForge Project As",
        defaultPath: `${projectData?.manifest?.name || "Untitled"}.lforge`,
        filters: [{ name: "LabelForge Project (*.lforge)", extensions: ["lforge"] }]
      });
      if (res.canceled || !res.filePath) {
        return { success: false, error: "Canceled by user" };
      }
      const validPath = validateFilePath(res.filePath, [".lforge", ".json"]);
      await projectStorage.saveProject(validPath, projectData);
      return {
        success: true,
        filePath: validPath
      };
    } catch (err) {
      logger.error("ProjectHandlers", `Failed to save-as project: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  });
  import_electron4.ipcMain.handle("project:recent", async () => {
    return recentProjects.getRecent();
  });
  import_electron4.ipcMain.handle("project:clear-recent", async () => {
    recentProjects.clearRecent();
    return { success: true };
  });
}

// electron/ipc/printer/printerHandlers.ts
var import_electron6 = require("electron");

// electron/services/printer/windowsPrinter.ts
var import_electron5 = require("electron");
var WindowsPrinterAdapter = class {
  async discover() {
    logger.info("WindowsPrinterAdapter", "Querying Windows Spooler printers...");
    try {
      const win = import_electron5.BrowserWindow.getFocusedWindow() || import_electron5.BrowserWindow.getAllWindows()[0];
      if (!win) {
        logger.warn("WindowsPrinterAdapter", "No active BrowserWindow available for printer query");
        return [];
      }
      const printers = await win.webContents.getPrintersAsync();
      return printers.map((p) => {
        const raw = p;
        return {
          id: `win-${p.name}`,
          name: p.name,
          displayName: p.displayName || p.name,
          type: "windows",
          isDefault: Boolean(raw.isDefault),
          status: typeof raw.status === "number" ? raw.status : 0,
          description: p.description || "Windows OS Installed Printer",
          protocolsSupported: ["raster", "pdf"]
        };
      });
    } catch (err) {
      logger.error("WindowsPrinterAdapter", `Failed to query Windows printers: ${err.message}`);
      return [];
    }
  }
  async print(request) {
    logger.info("WindowsPrinterAdapter", `Dispatching spooler job to ${request.printerName}`, { copies: request.copies });
    try {
      const win = import_electron5.BrowserWindow.getFocusedWindow() || import_electron5.BrowserWindow.getAllWindows()[0];
      if (!win) {
        return {
          success: false,
          error: {
            code: "ERR_NO_WINDOW",
            message: "No active window available to dispatch print job"
          }
        };
      }
      return new Promise((resolve) => {
        win.webContents.print(
          {
            silent: false,
            printBackground: true,
            deviceName: request.printerName,
            copies: request.copies || 1,
            margins: { marginType: "none" }
          },
          (success, failureReason) => {
            if (!success) {
              logger.error("WindowsPrinterAdapter", `Print failed: ${failureReason}`);
              resolve({
                success: false,
                error: {
                  code: "ERR_SPOOLER_FAILURE",
                  message: failureReason || "Windows print spooler rejected job"
                }
              });
            } else {
              logger.info("WindowsPrinterAdapter", "Spooler job dispatched successfully");
              resolve({
                success: true,
                jobId: `spool-${Date.now()}`
              });
            }
          }
        );
      });
    } catch (err) {
      logger.error("WindowsPrinterAdapter", `Exception during printing: ${err.message}`);
      return {
        success: false,
        error: {
          code: "ERR_SPOOLER_EXCEPTION",
          message: err.message
        }
      };
    }
  }
  async testPrint(printerName) {
    logger.info("WindowsPrinterAdapter", `Executing test print on ${printerName}`);
    return this.print({
      printerName,
      printerType: "windows",
      copies: 1,
      jobName: "LabelForge Hardware Test Page"
    });
  }
};
var windowsPrinter = new WindowsPrinterAdapter();

// electron/services/printer/networkPrinter.ts
var import_net = __toESM(require("net"), 1);
var NetworkPrinterAdapter = class {
  async discover() {
    return [];
  }
  async print(request) {
    const host = request.networkHost;
    const port = request.networkPort || 9100;
    const payload = request.rawPayload;
    if (!host) {
      return {
        success: false,
        error: {
          code: "ERR_NO_HOST",
          message: "Network printer host IP or hostname was not specified"
        }
      };
    }
    if (!payload) {
      return {
        success: false,
        error: {
          code: "ERR_NO_PAYLOAD",
          message: "Raw printer payload (ZPL/TSPL) is empty"
        }
      };
    }
    logger.info("NetworkPrinterAdapter", `Connecting to raw thermal socket ${host}:${port}...`);
    return new Promise((resolve) => {
      const socket = new import_net.default.Socket();
      let bytesWritten = 0;
      let hasFinished = false;
      socket.setTimeout(8e3);
      socket.connect(port, host, () => {
        logger.info("NetworkPrinterAdapter", `Connected to ${host}:${port}. Streaming payload...`);
        const buffer = Buffer.from(payload, "utf-8");
        bytesWritten = buffer.length;
        socket.write(buffer, () => {
          logger.info("NetworkPrinterAdapter", `Successfully sent ${bytesWritten} bytes to ${host}:${port}`);
          socket.end();
        });
      });
      socket.on("close", () => {
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: true,
            jobId: `net-${Date.now()}`,
            bytesWritten
          });
        }
      });
      socket.on("timeout", () => {
        logger.error("NetworkPrinterAdapter", `Socket timed out connecting to ${host}:${port}`);
        socket.destroy();
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: false,
            error: {
              code: "ERR_SOCKET_TIMEOUT",
              message: `Connection timed out to network printer at ${host}:${port}`
            }
          });
        }
      });
      socket.on("error", (err) => {
        logger.error("NetworkPrinterAdapter", `Socket error communicating with ${host}:${port}: ${err.message}`);
        socket.destroy();
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: false,
            error: {
              code: "ERR_SOCKET_ERROR",
              message: `Network communication error: ${err.message}`
            }
          });
        }
      });
    });
  }
  async testPrint(host, protocol = "zpl") {
    const rawPayload = protocol === "tspl" ? 'SIZE 4,2\nGAP 0.12,0\nCLS\nTEXT 50,50,"3",0,1,1,"LabelForge TSPL Network Test"\nPRINT 1\n' : "^XA\n^FO50,50^ADN,36,20^FDLabelForge ZPL Network Test^FS\n^XZ\n";
    return this.print({
      printerName: `Network Thermal (${host})`,
      printerType: "network",
      networkHost: host,
      networkPort: 9100,
      rawPayload
    });
  }
};
var networkPrinter = new NetworkPrinterAdapter();

// electron/services/printer/zplPrinter.ts
var ZplPrinterAdapter = class {
  async discover() {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter((p) => /zebra|zdesigner|zpl/i.test(p.name));
  }
  async print(request) {
    logger.info("ZplPrinterAdapter", `Processing ZPL print request for ${request.printerName}`);
    if (request.networkHost) {
      return networkPrinter.print(request);
    }
    return windowsPrinter.print(request);
  }
  async testPrint(printerName) {
    const testZpl = "^XA\n^LH0,0\n^FO50,50^A0N,40,30^FDLabelForge Enterprise ZPL^FS\n^FO50,110^BCN,70,Y,N,N\n^FDTEST-ZPL-12345^FS\n^XZ\n";
    return this.print({
      printerName,
      printerType: "zpl",
      copies: 1,
      rawPayload: testZpl
    });
  }
};
var zplPrinter = new ZplPrinterAdapter();

// electron/services/printer/tsplPrinter.ts
var TsplPrinterAdapter = class {
  async discover() {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter((p) => /tsc|citizen|godex|tspl/i.test(p.name));
  }
  async print(request) {
    logger.info("TsplPrinterAdapter", `Processing TSPL print request for ${request.printerName}`);
    if (request.networkHost) {
      return networkPrinter.print(request);
    }
    return windowsPrinter.print(request);
  }
  async testPrint(printerName) {
    const testTspl = 'SIZE 4,2\nGAP 0.12,0\nCLS\nTEXT 40,40,"3",0,1,1,"LabelForge Enterprise TSPL"\nBARCODE 40,100,"128",60,1,0,2,2,"TSPL-67890"\nPRINT 1\n';
    return this.print({
      printerName,
      printerType: "tspl",
      copies: 1,
      rawPayload: testTspl
    });
  }
};
var tsplPrinter = new TsplPrinterAdapter();

// electron/services/printer/bartenderPrinter.ts
var BarTenderPrinterAdapter = class {
  async discover() {
    return [
      {
        id: "bartender-srv-01",
        name: "BarTender Print Server",
        displayName: "BarTender Enterprise Automation Server",
        type: "bartender",
        isDefault: false,
        status: 1,
        description: "BarTender REST Web Print Service (Port 5159)",
        protocolsSupported: ["pdf", "raster"]
      }
    ];
  }
  async print(request) {
    const host = request.networkHost || "localhost";
    const port = request.networkPort || 5159;
    const url = `http://${host}:${port}/BarTender/API/v1/Print`;
    logger.info("BarTenderPrinterAdapter", `Dispatching BarTender print job to ${url}`);
    const payload = {
      template: request.bartenderTemplate || "StandardLabel.btw",
      printer: request.printerName,
      copies: request.copies || 1,
      values: request.bartenderPayload || {}
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(1e4)
      });
      if (!response.ok) {
        const errorText = await response.text();
        logger.error("BarTenderPrinterAdapter", `BarTender API returned error: ${response.status} ${errorText}`);
        return {
          success: false,
          error: {
            code: `ERR_BARTENDER_${response.status}`,
            message: `BarTender Print Server error: ${errorText}`
          }
        };
      }
      const result = await response.json();
      logger.info("BarTenderPrinterAdapter", "BarTender print job successfully queued", result);
      return {
        success: true,
        jobId: result.jobId || `bt-${Date.now()}`
      };
    } catch (err) {
      logger.error("BarTenderPrinterAdapter", `Failed to connect to BarTender server: ${err.message}`);
      return {
        success: false,
        error: {
          code: "ERR_BARTENDER_CONNECTION",
          message: `Unable to connect to BarTender server at ${url}: ${err.message}`
        }
      };
    }
  }
  async testPrint(printerName) {
    return this.print({
      printerName,
      printerType: "bartender",
      copies: 1,
      bartenderTemplate: "TestHardware.btw"
    });
  }
};
var bartenderPrinter = new BarTenderPrinterAdapter();

// electron/ipc/printer/printerHandlers.ts
function registerPrinterHandlers() {
  import_electron6.ipcMain.handle("printer:list", async () => {
    logger.info("PrinterHandlers", "Querying printers list");
    try {
      const winPrinters = await windowsPrinter.discover();
      const btPrinters = await bartenderPrinter.discover();
      return [...winPrinters, ...btPrinters];
    } catch (err) {
      logger.error("PrinterHandlers", `Failed to list printers: ${err.message}`);
      return [];
    }
  });
  import_electron6.ipcMain.handle("printer:default", async () => {
    const all = await windowsPrinter.discover();
    return all.find((p) => p.isDefault) || all[0] || null;
  });
  import_electron6.ipcMain.handle("printer:print", async (_event, request) => {
    logger.info("PrinterHandlers", `Received print request for ${request.printerName} (${request.printerType})`);
    try {
      validatePrintRequest(request);
      switch (request.printerType) {
        case "network":
          return await networkPrinter.print(request);
        case "zpl":
          return await zplPrinter.print(request);
        case "tspl":
          return await tsplPrinter.print(request);
        case "bartender":
          return await bartenderPrinter.print(request);
        case "windows":
        default:
          return await windowsPrinter.print(request);
      }
    } catch (err) {
      logger.error("PrinterHandlers", `Print job failed: ${err.message}`);
      return {
        success: false,
        error: {
          code: "ERR_PRINT_FAILED",
          message: err.message
        }
      };
    }
  });
  import_electron6.ipcMain.handle("printer:test", async (_event, printerName, protocol = "zpl") => {
    logger.info("PrinterHandlers", `Test print triggered for ${printerName} with protocol ${protocol}`);
    try {
      if (protocol === "tspl") {
        return await tsplPrinter.testPrint(printerName);
      } else if (protocol === "bartender") {
        return await bartenderPrinter.testPrint(printerName);
      } else if (protocol === "spooler") {
        return await windowsPrinter.testPrint(printerName);
      } else {
        return await zplPrinter.testPrint(printerName);
      }
    } catch (err) {
      logger.error("PrinterHandlers", `Test print failed: ${err.message}`);
      return {
        success: false,
        error: {
          code: "ERR_TEST_PRINT_FAILED",
          message: err.message
        }
      };
    }
  });
}

// electron/ipc/files/fileHandlers.ts
var import_electron7 = require("electron");
function registerFileHandlers() {
  import_electron7.ipcMain.handle("file:read", async (_event, filePath) => {
    const valid = validateFilePath(filePath, []);
    return await fileManager.readFile(valid);
  });
  import_electron7.ipcMain.handle("file:write", async (_event, filePath, content) => {
    const valid = validateFilePath(filePath, []);
    await fileManager.writeFile(valid, content);
    return { success: true };
  });
  import_electron7.ipcMain.handle("file:exists", async (_event, filePath) => {
    try {
      const valid = validateFilePath(filePath, []);
      return fileManager.fileExists(valid);
    } catch {
      return false;
    }
  });
}

// electron/ipc/system/systemHandlers.ts
var import_electron8 = require("electron");
var import_fs6 = __toESM(require("fs"), 1);

// electron/services/system/systemInfo.ts
var import_os = __toESM(require("os"), 1);
var SystemService = class {
  getInfo() {
    return {
      platform: import_os.default.platform(),
      arch: import_os.default.arch(),
      osRelease: import_os.default.release(),
      hostname: import_os.default.hostname(),
      totalMemoryMB: Math.round(import_os.default.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(import_os.default.freemem() / (1024 * 1024)),
      cpus: import_os.default.cpus().length
    };
  }
};
var systemService = new SystemService();

// electron/ipc/system/systemHandlers.ts
function registerSystemHandlers() {
  import_electron8.ipcMain.handle("system:get-info", async () => {
    return systemService.getInfo();
  });
  import_electron8.ipcMain.handle("settings:get", async () => {
    const file = paths.getSettingsFilePath();
    if (!import_fs6.default.existsSync(file)) {
      return {
        measurementUnit: "mm",
        defaultDpi: 300,
        darkness: 15,
        printSpeed: 4,
        autoSaveIntervalSec: 60,
        autoPreflightCheck: true
      };
    }
    try {
      const content = import_fs6.default.readFileSync(file, "utf-8");
      return JSON.parse(content);
    } catch (err) {
      logger.error("SystemHandlers", "Failed to read settings file", err);
      return {};
    }
  });
  import_electron8.ipcMain.handle("settings:set", async (_event, newSettings) => {
    const file = paths.getSettingsFilePath();
    try {
      let current = {};
      if (import_fs6.default.existsSync(file)) {
        current = JSON.parse(import_fs6.default.readFileSync(file, "utf-8"));
      }
      const updated = { ...current, ...newSettings };
      import_fs6.default.writeFileSync(file, JSON.stringify(updated, null, 2), "utf-8");
      logger.info("SystemHandlers", "Settings saved successfully");
      return updated;
    } catch (err) {
      logger.error("SystemHandlers", "Failed to save settings", err);
      throw err;
    }
  });
}

// electron/ipc/index.ts
function registerAllIpcHandlers() {
  logger.info("IPC", "Registering all IPC channels...");
  registerAppHandlers();
  registerDialogHandlers();
  registerProjectHandlers();
  registerPrinterHandlers();
  registerFileHandlers();
  registerSystemHandlers();
  logger.info("IPC", "All IPC channels registered successfully");
}

// electron/main.ts
var mainWindow = null;
var gotTheLock = import_electron9.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron9.app.quit();
} else {
  import_electron9.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
function createMainWindow() {
  logger.info("Main", "Creating desktop MainWindow...");
  const preloadScript = import_path6.default.join(__dirname, "preload.cjs");
  mainWindow = new import_electron9.BrowserWindow({
    width: appConfig.window.defaultWidth,
    height: appConfig.window.defaultHeight,
    minWidth: appConfig.window.minWidth,
    minHeight: appConfig.window.minHeight,
    backgroundColor: appConfig.window.backgroundColor,
    title: "LabelForge Studio Enterprise",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: preloadScript
    }
  });
  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      logger.info("Main", "MainWindow displayed to operator");
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:") || url.startsWith("http:")) {
      import_electron9.shell.openExternal(url);
    }
    return { action: "deny" };
  });
  buildNativeMenu(mainWindow);
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || appConfig.devServerUrl;
  const isDev = !import_electron9.app.isPackaged && process.env.NODE_ENV !== "production";
  if (isDev) {
    logger.info("Main", `Loading development server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch((err) => {
      logger.warn("Main", `Failed loading dev server url (${err.message}). Falling back to local dist...`);
      loadDistFile(mainWindow);
    });
  } else {
    loadDistFile(mainWindow);
  }
  return mainWindow;
}
function loadDistFile(win) {
  const indexPath = import_path6.default.join(import_electron9.app.getAppPath(), "dist", "index.html");
  logger.info("Main", `Loading packaged index.html: ${indexPath}`);
  win.loadFile(indexPath).catch((err) => {
    logger.error("Main", `Failed to load packaged index.html: ${err.message}`);
  });
}
function buildNativeMenu(win) {
  const sendAction = (action) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send("menu:action", action);
    }
  };
  const template = [
    {
      label: "&File",
      submenu: [
        {
          label: "&New Project",
          accelerator: "CmdOrCtrl+N",
          click: () => sendAction("file:new")
        },
        {
          label: "&Open Project...",
          accelerator: "CmdOrCtrl+O",
          click: () => sendAction("file:open")
        },
        { type: "separator" },
        {
          label: "&Save",
          accelerator: "CmdOrCtrl+S",
          click: () => sendAction("file:save")
        },
        {
          label: "Save &As...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => sendAction("file:save-as")
        },
        { type: "separator" },
        {
          label: "&Print Job...",
          accelerator: "CmdOrCtrl+P",
          click: () => sendAction("print:open-dialog")
        },
        { type: "separator" },
        {
          label: "E&xit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Alt+F4",
          click: () => import_electron9.app.quit()
        }
      ]
    },
    {
      label: "&Edit",
      submenu: [
        {
          label: "&Undo",
          accelerator: "CmdOrCtrl+Z",
          click: () => sendAction("edit:undo")
        },
        {
          label: "&Redo",
          accelerator: "CmdOrCtrl+Y",
          click: () => sendAction("edit:redo")
        },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "&View",
      submenu: [
        {
          label: "Zoom &In",
          accelerator: "CmdOrCtrl+=",
          click: () => sendAction("view:zoom-in")
        },
        {
          label: "Zoom &Out",
          accelerator: "CmdOrCtrl+-",
          click: () => sendAction("view:zoom-out")
        },
        {
          label: "&Reset Zoom",
          accelerator: "CmdOrCtrl+0",
          click: () => sendAction("view:zoom-reset")
        },
        { type: "separator" },
        { role: "togglefullscreen" },
        {
          label: "Toggle Developer &Tools",
          accelerator: "F12",
          click: () => win.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: "&Project",
      submenu: [
        {
          label: "&Preflight Validation",
          accelerator: "CmdOrCtrl+Shift+V",
          click: () => sendAction("project:preflight")
        },
        {
          label: "&Database Manager",
          accelerator: "CmdOrCtrl+Shift+D",
          click: () => sendAction("project:database")
        },
        {
          label: "&Template Manager",
          accelerator: "CmdOrCtrl+Shift+T",
          click: () => sendAction("project:templates")
        }
      ]
    },
    {
      label: "P&rinter",
      submenu: [
        {
          label: "&Print Label...",
          accelerator: "CmdOrCtrl+P",
          click: () => sendAction("print:open-dialog")
        },
        {
          label: "&BarTender Print Server...",
          accelerator: "CmdOrCtrl+Shift+B",
          click: () => sendAction("printer:bartender")
        }
      ]
    },
    {
      label: "&Help",
      submenu: [
        {
          label: "&Keyboard Shortcuts",
          accelerator: "F1",
          click: () => sendAction("help:shortcuts")
        },
        { type: "separator" },
        {
          label: "&About LabelForge Studio",
          click: () => sendAction("help:about")
        }
      ]
    }
  ];
  const menu = import_electron9.Menu.buildFromTemplate(template);
  import_electron9.Menu.setApplicationMenu(menu);
}
import_electron9.app.whenReady().then(() => {
  paths.init();
  logger.init();
  logger.info("Main", `LabelForge Studio ${appConfig.version} starting on ${process.platform}...`);
  registerAllIpcHandlers();
  createMainWindow();
  import_electron9.app.on("activate", () => {
    if (import_electron9.BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});
import_electron9.app.on("window-all-closed", () => {
  logger.info("Main", "All windows closed, shutting down desktop process");
  if (process.platform !== "darwin") {
    import_electron9.app.quit();
  }
});
//# sourceMappingURL=main.cjs.map
