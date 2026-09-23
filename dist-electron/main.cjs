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
var import_path8 = __toESM(require("path"), 1);

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
  getAppDataDir() {
    return this.getUserDataDir();
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
  import_electron2.ipcMain.handle("window:minimize", async (event) => {
    const win = import_electron2.BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });
  import_electron2.ipcMain.handle("window:toggle-maximize", async (event) => {
    const win = import_electron2.BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    if (win.isMaximized()) {
      win.unmaximize();
      return false;
    } else {
      win.maximize();
      return true;
    }
  });
  import_electron2.ipcMain.handle("window:is-maximized", async (event) => {
    const win = import_electron2.BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return false;
    return win.isMaximized();
  });
  import_electron2.ipcMain.handle("window:close", async (event) => {
    const win = import_electron2.BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.close();
    }
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
var import_fs6 = __toESM(require("fs"), 1);

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

// src/types/lforge.ts
function canonicalizeJson(obj) {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalizeJson(item)).join(",") + "]";
  }
  const sortedKeys = Object.keys(obj).sort();
  const keyValues = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`);
  return "{" + keyValues.join(",") + "}";
}
function computeDocumentChecksum(doc) {
  const canonicalStr = canonicalizeJson(doc);
  return simpleSha256(canonicalStr);
}
function simpleSha256(str) {
  let h0 = 1779033703, h1 = 3144134277, h2 = 1013904242, h3 = 2773480762;
  let h4 = 1359893119, h5 = 2600822924, h6 = 528734635, h7 = 1541459225;
  const K = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ];
  const utf8 = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 128) utf8.push(charcode);
    else if (charcode < 2048) {
      utf8.push(192 | charcode >> 6, 128 | charcode & 63);
    } else if (charcode < 55296 || charcode >= 57344) {
      utf8.push(224 | charcode >> 12, 128 | charcode >> 6 & 63, 128 | charcode & 63);
    } else {
      i++;
      charcode = 65536 + ((charcode & 831) << 10 | str.charCodeAt(i) & 831);
      utf8.push(240 | charcode >> 18, 128 | charcode >> 12 & 63, 128 | charcode >> 6 & 63, 128 | charcode & 63);
    }
  }
  const bitLen = utf8.length * 8;
  utf8.push(128);
  while (utf8.length % 64 !== 56) utf8.push(0);
  const highBits = Math.floor(bitLen / 4294967296);
  const lowBits = bitLen % 4294967296;
  for (let i = 24; i >= 0; i -= 8) utf8.push(highBits >> i & 255);
  for (let i = 24; i >= 0; i -= 8) utf8.push(lowBits >> i & 255);
  const w = new Array(64);
  for (let i = 0; i < utf8.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = utf8[i + j * 4] << 24 | utf8[i + j * 4 + 1] << 16 | utf8[i + j * 4 + 2] << 8 | utf8[i + j * 4 + 3];
    }
    for (let j = 16; j < 64; j++) {
      const s0 = (w[j - 15] >>> 7 | w[j - 15] << 25) ^ (w[j - 15] >>> 18 | w[j - 15] << 14) ^ w[j - 15] >>> 3;
      const s1 = (w[j - 2] >>> 17 | w[j - 2] << 15) ^ (w[j - 2] >>> 19 | w[j - 2] << 13) ^ w[j - 2] >>> 10;
      w[j] = w[j - 16] + s0 + w[j - 7] + s1 | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
      const ch = e & f ^ ~e & g;
      const temp1 = h + S1 + ch + K[j] + w[j] | 0;
      const S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
      const maj = a & b ^ a & c ^ b & c;
      const temp2 = S0 + maj | 0;
      h = g;
      g = f;
      f = e;
      e = d + temp1 | 0;
      d = c;
      c = b;
      b = a;
      a = temp1 + temp2 | 0;
    }
    h0 = h0 + a | 0;
    h1 = h1 + b | 0;
    h2 = h2 + c | 0;
    h3 = h3 + d | 0;
    h4 = h4 + e | 0;
    h5 = h5 + f | 0;
    h6 = h6 + g | 0;
    h7 = h7 + h | 0;
  }
  const toHex = (n) => (n >>> 0).toString(16).padStart(8, "0");
  return "sha256-" + toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

// src/services/lforgeMigration.ts
function migrateLForgePackage(pkg) {
  if (!pkg) {
    throw new Error("Cannot migrate empty package");
  }
  if (pkg.dimensions && Array.isArray(pkg.objects) && !pkg.manifest) {
    const legacyDoc = pkg;
    return {
      format: "lforge",
      schemaVersion: 2,
      manifest: {
        format: "LabelForge Package",
        extension: ".lforge",
        schemaVersion: 2,
        producerVersion: "LabelForge Studio 3.0.0 Migration",
        templateId: legacyDoc.id || `lft-${Date.now()}`,
        name: legacyDoc.name || "Migrated Label",
        createdAt: legacyDoc.created || (/* @__PURE__ */ new Date()).toISOString(),
        modifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
        author: legacyDoc.author || "Design Engineer",
        checksum: "checksum-pending",
        requiredFonts: ["Inter", "Arial"],
        requiredSymbologies: ["Code128"],
        security: {
          encrypted: false,
          sanitized: true,
          allowExternalDataBinding: true
        }
      },
      document: {
        ...legacyDoc,
        schemaVersion: "2.0.0"
      }
    };
  }
  let document = pkg.document;
  if (!document || !document.dimensions || !Array.isArray(document.objects)) {
    throw new Error("Invalid or corrupted document schema in package");
  }
  const migratedObjects = document.objects.map((obj) => {
    return {
      ...obj,
      rotation: typeof obj.rotation === "number" ? obj.rotation : 0,
      visible: obj.visible !== false,
      locked: Boolean(obj.locked)
    };
  });
  document = {
    ...document,
    objects: migratedObjects,
    schemaVersion: "2.0.0"
  };
  const manifest = {
    format: "LabelForge Package",
    extension: ".lforge",
    schemaVersion: 2,
    producerVersion: "LabelForge Studio 3.0.0",
    templateId: pkg.manifest?.templateId || document.id || `lft-${Date.now()}`,
    name: pkg.manifest?.name || document.name || "Untitled Label",
    createdAt: pkg.manifest?.createdAt || document.created || (/* @__PURE__ */ new Date()).toISOString(),
    modifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
    author: pkg.manifest?.author || document.author || "Design Engineer",
    checksum: pkg.manifest?.checksum || "checksum-pending",
    requiredFonts: Array.isArray(pkg.manifest?.requiredFonts) ? pkg.manifest.requiredFonts : ["Inter"],
    requiredSymbologies: Array.isArray(pkg.manifest?.requiredSymbologies) ? pkg.manifest.requiredSymbologies : [],
    targetPrinters: pkg.manifest?.targetPrinters || ["Zebra ZPL", "TSC TSPL"],
    security: {
      encrypted: Boolean(pkg.manifest?.security?.encrypted),
      sanitized: true,
      allowExternalDataBinding: Boolean(pkg.manifest?.security?.allowExternalDataBinding ?? true)
    }
  };
  return {
    format: "lforge",
    schemaVersion: 2,
    manifest,
    document,
    assets: pkg.assets || {},
    previews: pkg.previews || {}
  };
}

// electron/services/filesystem/projectStorage.ts
var ProjectStorageService = class {
  /**
   * Loads and validates a .lforge project file with SHA-256 checksum verification
   */
  async loadProject(filePath) {
    logger.info("ProjectStorageService", `Loading project from ${filePath}`);
    const content = await fileManager.readFile(filePath);
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new ProjectError(`Project file is not valid JSON: ${err.message}`, { path: filePath });
    }
    let pkg;
    try {
      pkg = migrateLForgePackage(parsed);
    } catch (err) {
      throw new ProjectError(`Project schema migration failed: ${err.message}`, { path: filePath });
    }
    if (parsed.manifest && parsed.manifest.checksum && parsed.manifest.checksum !== "checksum-pending" && parsed.manifest.checksum !== "legacy-import") {
      const computedChecksum = computeDocumentChecksum(pkg.document);
      if (parsed.manifest.checksum !== computedChecksum) {
        logger.error("ProjectStorageService", `Checksum mismatch for ${filePath}. Claimed: ${parsed.manifest.checksum}, Computed: ${computedChecksum}`);
        throw new ProjectError("CHECKSUM_MISMATCH: The project file checksum does not match its payload. It may have been modified or corrupted.", {
          path: filePath,
          claimed: parsed.manifest.checksum,
          computed: computedChecksum
        });
      }
    }
    pkg.manifest.checksum = computeDocumentChecksum(pkg.document);
    recentProjects.addRecent(filePath, pkg.manifest.name || pkg.document.name || import_path4.default.basename(filePath));
    return pkg;
  }
  /**
   * Performs Atomic Save (.tmp -> .lforge, backup .bak) with SHA-256 checksum calculation
   */
  async saveProject(filePath, pkg) {
    logger.info("ProjectStorageService", `Executing atomic project save to ${filePath}`);
    if (!pkg || !pkg.document) {
      throw new ProjectError("Cannot save empty project payload", { path: filePath });
    }
    const checksum = computeDocumentChecksum(pkg.document);
    const finalizedPkg = {
      format: "lforge",
      schemaVersion: 2,
      manifest: {
        format: "LabelForge Package",
        extension: ".lforge",
        schemaVersion: 2,
        producerVersion: "LabelForge Studio 3.0.0 Enterprise",
        templateId: pkg.manifest?.templateId || pkg.document.id || `lft-${Date.now()}`,
        name: pkg.manifest?.name || pkg.document.name || import_path4.default.basename(filePath, ".lforge"),
        createdAt: pkg.manifest?.createdAt || pkg.document.created || (/* @__PURE__ */ new Date()).toISOString(),
        modifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
        author: pkg.manifest?.author || pkg.document.author || "LabelForge Engineer",
        checksum,
        requiredFonts: pkg.manifest?.requiredFonts || ["Inter"],
        requiredSymbologies: pkg.manifest?.requiredSymbologies || [],
        targetPrinters: pkg.manifest?.targetPrinters || ["Zebra ZPL", "TSC TSPL"],
        security: pkg.manifest?.security || {
          encrypted: false,
          sanitized: true,
          allowExternalDataBinding: true
        }
      },
      document: {
        ...pkg.document,
        modified: (/* @__PURE__ */ new Date()).toISOString()
      },
      assets: pkg.assets || {},
      previews: pkg.previews || {}
    };
    const jsonString = JSON.stringify(finalizedPkg, null, 2);
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.bak`;
    try {
      await fileManager.writeFile(tempPath, jsonString);
      const tempContent = await fileManager.readFile(tempPath);
      const tempParsed = JSON.parse(tempContent);
      if (!tempParsed.manifest || tempParsed.manifest.checksum !== checksum) {
        throw new Error("Integrity verification failed on temporary file write");
      }
      if (import_fs6.default.existsSync(filePath)) {
        try {
          import_fs6.default.copyFileSync(filePath, backupPath);
        } catch (backupErr) {
          logger.warn("ProjectStorageService", `Could not create backup file: ${backupErr.message}`);
        }
      }
      import_fs6.default.renameSync(tempPath, filePath);
      recentProjects.addRecent(filePath, finalizedPkg.manifest.name);
      logger.info("ProjectStorageService", `Project saved & verified successfully at ${filePath}`);
    } catch (err) {
      if (import_fs6.default.existsSync(tempPath)) {
        try {
          import_fs6.default.unlinkSync(tempPath);
        } catch {
        }
      }
      logger.error("ProjectStorageService", `Atomic save failed: ${err.message}`);
      throw new ProjectError(`Failed to save project file: ${err.message}`, { path: filePath });
    }
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

// electron/services/printer/windowsRawSpooler.ts
var import_fs7 = __toESM(require("fs"), 1);
var import_path6 = __toESM(require("path"), 1);
var import_child_process = require("child_process");
var import_util = require("util");
var execFileAsync = (0, import_util.promisify)(import_child_process.execFile);
var WindowsRawSpoolerService = class {
  spoolDir;
  constructor() {
    this.spoolDir = import_path6.default.join(paths.getAppDataDir(), "spool");
    if (!import_fs7.default.existsSync(this.spoolDir)) {
      try {
        import_fs7.default.mkdirSync(this.spoolDir, { recursive: true });
      } catch (err) {
        logger.warn("WindowsRawSpoolerService", `Could not create spool directory: ${err.message}`);
      }
    }
  }
  /**
   * Dispatches raw command payload directly to Windows Print Spooler with RAW datatype
   */
  async printRaw(printerName, payload, jobName = "LabelForge RAW Thermal Job") {
    if (!printerName || typeof printerName !== "string") {
      return {
        success: false,
        printerName: printerName || "Unknown",
        bytesWritten: 0,
        errorCode: "ERR_INVALID_PRINTER",
        errorMessage: "Printer name must be a valid non-empty string"
      };
    }
    const bufferPayload = Buffer.isBuffer(payload) ? payload : Buffer.from(payload || "", "utf-8");
    if (bufferPayload.length === 0) {
      return {
        success: false,
        printerName,
        bytesWritten: 0,
        errorCode: "ERR_EMPTY_PAYLOAD",
        errorMessage: "RAW printer payload is empty"
      };
    }
    const jobId = `raw-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
    const tempPrnFile = import_path6.default.join(this.spoolDir, `${jobId}.prn`);
    logger.info("WindowsRawSpoolerService", `Dispatching ${bufferPayload.length} RAW bytes to printer "${printerName}" [Job ID: ${jobId}]`);
    try {
      import_fs7.default.writeFileSync(tempPrnFile, bufferPayload);
    } catch (err) {
      logger.error("WindowsRawSpoolerService", `Failed to write spool file: ${err.message}`);
      return {
        success: false,
        printerName,
        bytesWritten: 0,
        errorCode: "ERR_SPOOL_FILE_WRITE",
        errorMessage: `Failed to write raw spool file: ${err.message}`
      };
    }
    if (process.platform === "win32") {
      try {
        const psScript = `
$ErrorActionPreference = 'Stop'
$printer = ${JSON.stringify(printerName)}
$filePath = ${JSON.stringify(tempPrnFile)}
$docTitle = ${JSON.stringify(jobName)}

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendFileToPrinter(string szPrinterName, string fileName, string docName) {
        byte[] bytes = File.ReadAllBytes(fileName);
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = docName;
        di.pDataType = "RAW";
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    int dwWritten = 0;
                    bool success = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                    EndDocPrinter(hPrinter);
                    ClosePrinter(hPrinter);
                    return success;
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return false;
    }
}
"@

Add-Type -TypeDefinition $code
$res = [RawPrinterHelper]::SendFileToPrinter($printer, $filePath, $docTitle)
if ($res) {
    Write-Output "SUCCESS"
} else {
    Write-Error "RAW_PRINT_FAILED"
}
`;
        const psFile = import_path6.default.join(this.spoolDir, `${jobId}.ps1`);
        import_fs7.default.writeFileSync(psFile, psScript, "utf-8");
        try {
          const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psFile], {
            timeout: 1e4
          });
          this.safeUnlink(psFile);
          this.safeUnlink(tempPrnFile);
          if (stdout.includes("SUCCESS")) {
            logger.info("WindowsRawSpoolerService", `Raw spool job ${jobId} successfully sent to ${printerName}`);
            return {
              success: true,
              jobId,
              printerName,
              bytesWritten: bufferPayload.length
            };
          } else {
            throw new Error(`Spooler rejected job`);
          }
        } catch (execErr) {
          this.safeUnlink(tempPrnFile);
          logger.error("WindowsRawSpoolerService", `PowerShell raw print failed: ${execErr.message}`);
          return {
            success: false,
            printerName,
            bytesWritten: 0,
            errorCode: "ERR_RAW_SPOOLER_FAILED",
            errorMessage: `Windows RAW spooler error: ${execErr.stderr || execErr.message}`
          };
        }
      } catch (err) {
        this.safeUnlink(tempPrnFile);
        return {
          success: false,
          printerName,
          bytesWritten: 0,
          errorCode: "ERR_WIN32_SPOOLER",
          errorMessage: err.message
        };
      }
    } else {
      logger.info("WindowsRawSpoolerService", `[Non-Windows OS] Simulated sending ${bufferPayload.length} bytes to ${printerName}`);
      this.safeUnlink(tempPrnFile);
      return {
        success: true,
        jobId,
        printerName,
        bytesWritten: bufferPayload.length
      };
    }
  }
  safeUnlink(filePath) {
    if (import_fs7.default.existsSync(filePath)) {
      try {
        import_fs7.default.unlinkSync(filePath);
      } catch {
      }
    }
  }
};
var windowsRawSpooler = new WindowsRawSpoolerService();

// electron/services/printer/windowsPrinter.ts
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
          protocolsSupported: ["raw", "raster", "pdf"]
        };
      });
    } catch (err) {
      logger.error("WindowsPrinterAdapter", `Failed to query Windows printers: ${err.message}`);
      return [];
    }
  }
  async print(request) {
    logger.info("WindowsPrinterAdapter", `Processing Windows print request for "${request.printerName}" (${request.printerType})`);
    if (request.rawPayload && typeof request.rawPayload === "string" && request.rawPayload.trim().length > 0) {
      logger.info("WindowsPrinterAdapter", `Dispatching RAW thermal payload to Windows spooler queue for ${request.printerName}...`);
      const rawRes = await windowsRawSpooler.printRaw(request.printerName, request.rawPayload, request.jobName || "LabelForge RAW Job");
      if (rawRes.success) {
        return {
          success: true,
          jobId: rawRes.jobId,
          bytesWritten: rawRes.bytesWritten
        };
      } else {
        return {
          success: false,
          error: {
            code: rawRes.errorCode || "ERR_RAW_PRINT_FAILED",
            message: rawRes.errorMessage || "RAW print spooling failed"
          }
        };
      }
    }
    logger.info("WindowsPrinterAdapter", `Dispatching GDI/raster job to Chromium spooler for ${request.printerName}`);
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
              logger.error("WindowsPrinterAdapter", `GDI Print failed: ${failureReason}`);
              resolve({
                success: false,
                error: {
                  code: "ERR_SPOOLER_FAILURE",
                  message: failureReason || "Windows print spooler rejected GDI job"
                }
              });
            } else {
              logger.info("WindowsPrinterAdapter", "GDI Spooler job dispatched successfully");
              resolve({
                success: true,
                jobId: `spool-${Date.now()}`
              });
            }
          }
        );
      });
    } catch (err) {
      logger.error("WindowsPrinterAdapter", `Exception during GDI printing: ${err.message}`);
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
    const testZpl = "^XA\n^LH0,0\n^FO50,50^A0N,40,30^FDLabelForge Enterprise Hardware Test^FS\n^FO50,110^BCN,70,Y,N,N\n^FDTEST-RAW-12345^FS\n^XZ\n";
    return this.print({
      printerName,
      printerType: "windows",
      copies: 1,
      jobName: "LabelForge Hardware Test Page",
      rawPayload: testZpl
    });
  }
};
var windowsPrinter = new WindowsPrinterAdapter();

// electron/services/printer/networkPrinter.ts
var import_net = __toESM(require("net"), 1);
var IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
var HOSTNAME_REGEX = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
function validateNetworkDestination(host, port) {
  if (!host || typeof host !== "string" || host.trim() === "") {
    return { valid: false, error: "Network printer host IP or hostname is required" };
  }
  const cleanHost = host.trim();
  if (/[;&|`<>\$\\]/.test(cleanHost) || cleanHost.includes("..")) {
    return { valid: false, error: "Invalid characters detected in printer hostname or IP address" };
  }
  if (/^[\d\.]+$/.test(cleanHost)) {
    if (!IPV4_REGEX.test(cleanHost)) {
      return { valid: false, error: `Invalid IP address or hostname format: "${cleanHost}"` };
    }
  } else {
    if (!HOSTNAME_REGEX.test(cleanHost)) {
      return { valid: false, error: `Invalid IP address or hostname format: "${cleanHost}"` };
    }
  }
  const numericPort = port !== void 0 ? Number(port) : 9100;
  if (isNaN(numericPort) || !Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
    return { valid: false, error: `Invalid TCP port number ${port}. Port must be between 1 and 65535.` };
  }
  return { valid: true };
}
var NetworkPrinterAdapter = class {
  async discover() {
    return [];
  }
  async print(request) {
    const host = request.networkHost;
    const port = request.networkPort || 9100;
    const payload = request.rawPayload;
    const destVal = validateNetworkDestination(host, port);
    if (!destVal.valid) {
      return {
        success: false,
        error: {
          code: "ERR_INVALID_NETWORK_DEST",
          message: destVal.error || "Invalid network destination"
        }
      };
    }
    if (!payload || typeof payload === "string" && payload.trim() === "") {
      return {
        success: false,
        error: {
          code: "ERR_NO_PAYLOAD",
          message: "Raw printer payload (ZPL/TSPL/EPL) is empty"
        }
      };
    }
    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf-8");
    if (buffer.length > 20 * 1024 * 1024) {
      return {
        success: false,
        error: {
          code: "ERR_PAYLOAD_TOO_LARGE",
          message: `Printer payload size (${(buffer.length / 1024 / 1024).toFixed(1)}MB) exceeds maximum 20MB socket limit.`
        }
      };
    }
    logger.info("NetworkPrinterAdapter", `Connecting to RAW socket at ${host}:${port} (${buffer.length} bytes)...`);
    return new Promise((resolve) => {
      const socket = new import_net.default.Socket();
      let bytesWritten = 0;
      let hasFinished = false;
      const timeoutMs = request.timeoutMs || 8e3;
      socket.setTimeout(timeoutMs);
      socket.connect(port, host, () => {
        logger.info("NetworkPrinterAdapter", `Connected to ${host}:${port}. Streaming payload...`);
        socket.write(buffer, () => {
          bytesWritten = buffer.length;
          logger.info("NetworkPrinterAdapter", `Transmitted ${bytesWritten} bytes to ${host}:${port}`);
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
        logger.error("NetworkPrinterAdapter", `Connection timed out connecting to ${host}:${port}`);
        socket.destroy();
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: false,
            error: {
              code: "ERR_SOCKET_TIMEOUT",
              message: `Connection timed out to network printer at ${host}:${port} (Timeout: ${timeoutMs}ms)`
            }
          });
        }
      });
      socket.on("error", (err) => {
        logger.error("NetworkPrinterAdapter", `Socket error for ${host}:${port}: ${err.message}`);
        socket.destroy();
        if (!hasFinished) {
          hasFinished = true;
          resolve({
            success: false,
            error: {
              code: "ERR_SOCKET_ERROR",
              message: `Network communication error to ${host}:${port}: ${err.message}`
            }
          });
        }
      });
    });
  }
  async testPrint(host, protocol = "zpl") {
    const proto = (protocol || "zpl").toLowerCase();
    let rawPayload = "^XA\n^FO50,50^ADN,36,20^FDLabelForge ZPL Network Test^FS\n^XZ\n";
    if (proto === "tspl") {
      rawPayload = 'SIZE 4,2\nGAP 0.12,0\nCLS\nTEXT 50,50,"3",0,1,1,"LabelForge TSPL Network Test"\nPRINT 1\n';
    } else if (proto === "epl") {
      rawPayload = '\nN\nA50,50,0,3,1,1,N,"LabelForge EPL Network Test"\nP1\n';
    }
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

// electron/services/printer/eplPrinter.ts
var EplPrinterAdapter = class {
  async discover() {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter((p) => /epl|eltron|2844|zebra/i.test(p.name));
  }
  async print(request) {
    logger.info("EplPrinterAdapter", `Dispatching EPL job to ${request.printerName}`);
    if (request.networkHost) {
      return await networkPrinter.print(request);
    }
    return await windowsPrinter.print(request);
  }
  async testPrint(printerName) {
    const testEpl = 'N\nq400\nQ200,24\nA50,50,0,4,1,1,N,"LABELFORGE EPL TEST OK"\nP1,1\n';
    const isIpHost = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(printerName);
    return await this.print({
      printerName,
      printerType: isIpHost ? "network" : "epl",
      networkHost: isIpHost ? printerName : void 0,
      rawPayload: testEpl,
      copies: 1
    });
  }
};
var eplPrinter = new EplPrinterAdapter();

// electron/services/printer/cpclPrinter.ts
var CpclPrinterAdapter = class {
  async discover() {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter((p) => /cpcl|mobile|qln|zq/i.test(p.name));
  }
  async print(request) {
    logger.info("CpclPrinterAdapter", `Dispatching CPCL job to ${request.printerName}`);
    if (request.networkHost) {
      return await networkPrinter.print(request);
    }
    return await windowsPrinter.print(request);
  }
  async testPrint(printerName) {
    const testCpcl = "! 0 200 200 210 1\nTEXT 7 0 20 20 LABELFORGE CPCL TEST OK\nFORM\nPRINT\n";
    const isIpHost = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(printerName);
    return await this.print({
      printerName,
      printerType: isIpHost ? "network" : "cpcl",
      networkHost: isIpHost ? printerName : void 0,
      rawPayload: testCpcl,
      copies: 1
    });
  }
};
var cpclPrinter = new CpclPrinterAdapter();

// electron/services/printer/sbplPrinter.ts
var SbplPrinterAdapter = class {
  async discover() {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter((p) => /sato|sbpl|cl4nx|pw4/i.test(p.name));
  }
  async print(request) {
    logger.info("SbplPrinterAdapter", `Dispatching SBPL job to ${request.printerName}`);
    if (request.networkHost) {
      return await networkPrinter.print(request);
    }
    return await windowsPrinter.print(request);
  }
  async testPrint(printerName) {
    const ESC = "\x1B";
    const testSbpl = `${ESC}A${ESC}A1${ESC}H0050${ESC}V0050${ESC}L0202${ESC}MLABELFORGE SATO SBPL TEST OK${ESC}Q1${ESC}Z`;
    const isIpHost = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(printerName);
    return await this.print({
      printerName,
      printerType: isIpHost ? "network" : "sbpl",
      networkHost: isIpHost ? printerName : void 0,
      rawPayload: testSbpl,
      copies: 1
    });
  }
};
var sbplPrinter = new SbplPrinterAdapter();

// electron/services/printer/dplPrinter.ts
var DplPrinterAdapter = class {
  async discover() {
    const winPrinters = await windowsPrinter.discover();
    return winPrinters.filter((p) => /datamax|dpl|honeywell|oneil/i.test(p.name));
  }
  async print(request) {
    logger.info("DplPrinterAdapter", `Dispatching DPL job to ${request.printerName}`);
    if (request.networkHost) {
      return await networkPrinter.print(request);
    }
    return await windowsPrinter.print(request);
  }
  async testPrint(printerName) {
    const SOH = "";
    const STX = "";
    const testDpl = `${SOH}D${STX}LD11121100000500050LABELFORGE DPL TEST OK\r
Q0001\r
E\r
`;
    const isIpHost = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(printerName);
    return await this.print({
      printerName,
      printerType: isIpHost ? "network" : "dpl",
      networkHost: isIpHost ? printerName : void 0,
      rawPayload: testDpl,
      copies: 1
    });
  }
};
var dplPrinter = new DplPrinterAdapter();

// electron/services/printer/bartenderPrinter.ts
var activeBarTenderConfig = {
  enabled: true,
  baseUrl: "http://127.0.0.1:5159",
  timeoutMs: 8e3
};
var BarTenderPrinterAdapter = class {
  /**
   * Queries real BarTender REST service endpoint to verify availability
   * Does NOT report fake static printers if server is unreachable
   */
  async discover() {
    if (!activeBarTenderConfig.enabled) {
      return [];
    }
    const healthUrl = `${activeBarTenderConfig.baseUrl.replace(/\/+$/, "")}/BarTender/API/v1/Health`;
    try {
      const headers = { "Accept": "application/json" };
      if (activeBarTenderConfig.authToken) {
        headers["Authorization"] = `Bearer ${activeBarTenderConfig.authToken}`;
      }
      const res = await fetch(healthUrl, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(3e3)
      });
      if (res.ok) {
        logger.info("BarTenderPrinterAdapter", `Verified active BarTender REST server at ${healthUrl}`);
        return [
          {
            id: "bartender-rest-server",
            name: "BarTender Enterprise Automation Server",
            displayName: "BarTender REST Print Service (Online)",
            type: "bartender",
            isDefault: false,
            status: 1,
            // Ready
            description: `Verified BarTender REST Server at ${activeBarTenderConfig.baseUrl}`,
            protocolsSupported: ["pdf", "raster"]
          }
        ];
      }
    } catch (err) {
      logger.info("BarTenderPrinterAdapter", `BarTender server offline/unreachable at ${healthUrl}: ${err.message}`);
    }
    return [];
  }
  async print(request) {
    const baseUrl = activeBarTenderConfig.baseUrl.replace(/\/+$/, "");
    const url = `${baseUrl}/BarTender/API/v1/Print`;
    logger.info("BarTenderPrinterAdapter", `Dispatching BarTender print job to ${url}`);
    const payload = {
      template: request.bartenderTemplate || "StandardLabel.btw",
      printer: request.printerName,
      copies: request.copies || 1,
      values: request.bartenderPayload || {}
    };
    try {
      const headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
      };
      if (activeBarTenderConfig.authToken) {
        headers["Authorization"] = `Bearer ${activeBarTenderConfig.authToken}`;
      }
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(activeBarTenderConfig.timeoutMs || 1e4)
      });
      if (!response.ok) {
        const errorText = await response.text();
        logger.error("BarTenderPrinterAdapter", `BarTender API error: ${response.status} ${errorText}`);
        return {
          success: false,
          error: {
            code: `ERR_BARTENDER_${response.status}`,
            message: `BarTender Print Server returned HTTP ${response.status}: ${errorText}`
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
      logger.error("BarTenderPrinterAdapter", `Failed to connect to BarTender server at ${url}: ${err.message}`);
      return {
        success: false,
        error: {
          code: "ERR_BARTENDER_CONNECTION",
          message: `Unable to reach BarTender server at ${url}: ${err.message}`
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

// electron/services/system/auditService.ts
var import_fs8 = __toESM(require("fs"), 1);
var import_path7 = __toESM(require("path"), 1);
var AuditService = class {
  auditFilePath = "";
  constructor() {
    this.auditFilePath = import_path7.default.join(paths.getAppDataDir(), "audit.jsonl");
  }
  recordEvent(record) {
    const fullRecord = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...record
    };
    logger.info("AuditService", `[AUDIT] ${fullRecord.action} (${fullRecord.result}) by ${fullRecord.user}`);
    try {
      const line = JSON.stringify(fullRecord) + "\n";
      import_fs8.default.appendFileSync(this.auditFilePath, line, "utf-8");
    } catch (err) {
      logger.error("AuditService", `Failed to write audit event to disk: ${err.message}`);
    }
    return fullRecord;
  }
  getRecentRecords(limit = 100) {
    if (!import_fs8.default.existsSync(this.auditFilePath)) return [];
    try {
      const content = import_fs8.default.readFileSync(this.auditFilePath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      const records = [];
      for (let i = lines.length - 1; i >= 0 && records.length < limit; i--) {
        try {
          records.push(JSON.parse(lines[i]));
        } catch {
        }
      }
      return records;
    } catch {
      return [];
    }
  }
};
var auditService = new AuditService();

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
    logger.info("PrinterHandlers", `Received print request for printer "${request.printerName}" (type: ${request.printerType})`);
    try {
      validatePrintRequest(request);
      if (request.networkHost) {
        const netVal = validateNetworkDestination(request.networkHost, request.networkPort);
        if (!netVal.valid) {
          auditService.recordEvent({
            action: "PRINT_JOB_REQUESTED",
            user: "Operator",
            role: "OPERATOR",
            resource: request.printerName || "Network Printer",
            result: "FAILURE",
            errorMessage: netVal.error
          });
          return {
            success: false,
            error: {
              code: "ERR_INVALID_NETWORK_DEST",
              message: netVal.error || "Invalid network printer destination"
            }
          };
        }
      }
      let result;
      const type = (request.printerType || "windows").toLowerCase();
      switch (type) {
        case "network":
          result = await networkPrinter.print(request);
          break;
        case "zpl":
          result = await zplPrinter.print(request);
          break;
        case "tspl":
          result = await tsplPrinter.print(request);
          break;
        case "epl":
          result = await eplPrinter.print(request);
          break;
        case "cpcl":
          result = await cpclPrinter.print(request);
          break;
        case "sbpl":
          result = await sbplPrinter.print(request);
          break;
        case "dpl":
          result = await dplPrinter.print(request);
          break;
        case "bartender":
          result = await bartenderPrinter.print(request);
          break;
        case "windows":
        default:
          result = await windowsPrinter.print(request);
          break;
      }
      auditService.recordEvent({
        action: "PRINT_JOB_REQUESTED",
        user: "Operator",
        role: "OPERATOR",
        resource: request.printerName,
        result: result.success ? "SUCCESS" : "FAILURE",
        details: {
          printerType: request.printerType,
          copies: request.copies || 1,
          jobId: result.jobId,
          bytesWritten: result.bytesWritten
        },
        errorMessage: result.error?.message
      });
      return result;
    } catch (err) {
      logger.error("PrinterHandlers", `Print job dispatch error: ${err.message}`);
      auditService.recordEvent({
        action: "PRINT_JOB_REQUESTED",
        user: "Operator",
        role: "OPERATOR",
        resource: request.printerName || "Unknown",
        result: "FAILURE",
        errorMessage: err.message
      });
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
      const proto = protocol.toLowerCase();
      let res;
      if (proto === "tspl") {
        res = await tsplPrinter.testPrint(printerName);
      } else if (proto === "epl") {
        res = await eplPrinter.testPrint(printerName);
      } else if (proto === "cpcl") {
        res = await cpclPrinter.testPrint(printerName);
      } else if (proto === "sbpl") {
        res = await sbplPrinter.testPrint(printerName);
      } else if (proto === "dpl") {
        res = await dplPrinter.testPrint(printerName);
      } else if (proto === "bartender") {
        res = await bartenderPrinter.testPrint(printerName);
      } else if (proto === "spooler") {
        res = await windowsPrinter.testPrint(printerName);
      } else {
        res = await zplPrinter.testPrint(printerName);
      }
      auditService.recordEvent({
        action: "TEST_PRINT_DISPATCHED",
        user: "Operator",
        role: "OPERATOR",
        resource: printerName,
        result: res.success ? "SUCCESS" : "FAILURE",
        details: { protocol },
        errorMessage: res.error?.message
      });
      return res;
    } catch (err) {
      logger.error("PrinterHandlers", `Test print failed: ${err.message}`);
      auditService.recordEvent({
        action: "TEST_PRINT_DISPATCHED",
        user: "Operator",
        role: "OPERATOR",
        resource: printerName,
        result: "FAILURE",
        errorMessage: err.message
      });
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
  import_electron7.ipcMain.handle("file:exists", async (_event, filePath) => {
    try {
      if (!filePath || typeof filePath !== "string") return false;
      const valid = validateFilePath(filePath, [".lforge", ".json", ".prn", ".txt"]);
      return fileManager.fileExists(valid);
    } catch {
      return false;
    }
  });
}

// electron/ipc/system/systemHandlers.ts
var import_electron8 = require("electron");
var import_fs9 = __toESM(require("fs"), 1);

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
    if (!import_fs9.default.existsSync(file)) {
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
      const content = import_fs9.default.readFileSync(file, "utf-8");
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
      if (import_fs9.default.existsSync(file)) {
        current = JSON.parse(import_fs9.default.readFileSync(file, "utf-8"));
      }
      const updated = { ...current, ...newSettings };
      import_fs9.default.writeFileSync(file, JSON.stringify(updated, null, 2), "utf-8");
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
  const preloadScript = import_path8.default.join(__dirname, "preload.cjs");
  const isFrameless = !process.env.DEV_WINDOW_FRAME;
  mainWindow = new import_electron9.BrowserWindow({
    width: appConfig.window.defaultWidth,
    height: appConfig.window.defaultHeight,
    minWidth: appConfig.window.minWidth,
    minHeight: appConfig.window.minHeight,
    backgroundColor: appConfig.window.backgroundColor,
    title: "LabelForge Studio Enterprise",
    frame: !isFrameless,
    titleBarStyle: isFrameless ? "hidden" : "default",
    autoHideMenuBar: isFrameless,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: preloadScript
    }
  });
  mainWindow.on("maximize", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("window:maximize-changed", true);
    }
  });
  mainWindow.on("unmaximize", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("window:maximize-changed", false);
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
  if (!isFrameless) {
    buildNativeMenu(mainWindow);
  } else {
    import_electron9.Menu.setApplicationMenu(null);
  }
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
  const indexPath = import_path8.default.join(import_electron9.app.getAppPath(), "dist", "index.html");
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
