/**
 * LabelForge Desktop - Main Electron Process
 * Enterprise Windows Desktop Application Host
 */

import { app, BrowserWindow, Menu, MenuItemConstructorOptions, shell } from 'electron';
import path from 'path';
import { paths } from './config/paths';
import { appConfig } from './config/appConfig';
import { logger } from './utils/logger';
import { registerAllIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createMainWindow(): BrowserWindow {
  logger.info('Main', 'Creating desktop MainWindow...');

  const preloadScript = path.join(__dirname, 'preload.cjs');
  const isFrameless = !process.env.DEV_WINDOW_FRAME;

  mainWindow = new BrowserWindow({
    width: appConfig.window.defaultWidth,
    height: appConfig.window.defaultHeight,
    minWidth: appConfig.window.minWidth,
    minHeight: appConfig.window.minHeight,
    backgroundColor: appConfig.window.backgroundColor,
    title: 'LabelForge Studio Enterprise',
    frame: !isFrameless,
    titleBarStyle: isFrameless ? 'hidden' : 'default',
    autoHideMenuBar: isFrameless,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: preloadScript
    }
  });

  // Broadcast maximize state changes to renderer custom controls
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximize-changed', true);
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximize-changed', false);
    }
  });

  // Gracefully display window once DOM is parsed and styled
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      logger.info('Main', 'MainWindow displayed to operator');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent unauthorized external navigation in renderer
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Attach application menu (or keep hidden in frameless mode)
  if (!isFrameless) {
    buildNativeMenu(mainWindow);
  } else {
    Menu.setApplicationMenu(null);
  }

  // Load appropriate target (Dev Server URL or packaged dist/index.html)
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || appConfig.devServerUrl;
  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    logger.info('Main', `Loading development server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch((err) => {
      logger.warn('Main', `Failed loading dev server url (${err.message}). Falling back to local dist...`);
      loadDistFile(mainWindow!);
    });
  } else {
    loadDistFile(mainWindow);
  }

  return mainWindow;
}

function loadDistFile(win: BrowserWindow) {
  const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
  logger.info('Main', `Loading packaged index.html: ${indexPath}`);
  win.loadFile(indexPath).catch((err) => {
    logger.error('Main', `Failed to load packaged index.html: ${err.message}`);
  });
}

function buildNativeMenu(win: BrowserWindow) {
  const sendAction = (action: string) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('menu:action', action);
    }
  };

  const template: MenuItemConstructorOptions[] = [
    {
      label: '&File',
      submenu: [
        {
          label: '&New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendAction('file:new')
        },
        {
          label: '&Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendAction('file:open')
        },
        { type: 'separator' },
        {
          label: '&Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendAction('file:save')
        },
        {
          label: 'Save &As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendAction('file:save-as')
        },
        { type: 'separator' },
        {
          label: '&Print Job...',
          accelerator: 'CmdOrCtrl+P',
          click: () => sendAction('print:open-dialog')
        },
        { type: 'separator' },
        {
          label: 'E&xit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: '&Edit',
      submenu: [
        {
          label: '&Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => sendAction('edit:undo')
        },
        {
          label: '&Redo',
          accelerator: 'CmdOrCtrl+Y',
          click: () => sendAction('edit:redo')
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: '&View',
      submenu: [
        {
          label: 'Zoom &In',
          accelerator: 'CmdOrCtrl+=',
          click: () => sendAction('view:zoom-in')
        },
        {
          label: 'Zoom &Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => sendAction('view:zoom-out')
        },
        {
          label: '&Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => sendAction('view:zoom-reset')
        },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle Developer &Tools',
          accelerator: 'F12',
          click: () => win.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: '&Project',
      submenu: [
        {
          label: '&Preflight Validation',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => sendAction('project:preflight')
        },
        {
          label: '&Database Manager',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => sendAction('project:database')
        },
        {
          label: '&Template Manager',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => sendAction('project:templates')
        }
      ]
    },
    {
      label: 'P&rinter',
      submenu: [
        {
          label: '&Print Label...',
          accelerator: 'CmdOrCtrl+P',
          click: () => sendAction('print:open-dialog')
        },
        {
          label: '&BarTender Print Server...',
          accelerator: 'CmdOrCtrl+Shift+B',
          click: () => sendAction('printer:bartender')
        }
      ]
    },
    {
      label: '&Help',
      submenu: [
        {
          label: '&Keyboard Shortcuts',
          accelerator: 'F1',
          click: () => sendAction('help:shortcuts')
        },
        { type: 'separator' },
        {
          label: '&About LabelForge Studio',
          click: () => sendAction('help:about')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App lifecycle
app.whenReady().then(() => {
  paths.init();
  logger.init();
  logger.info('Main', `LabelForge Studio ${appConfig.version} starting on ${process.platform}...`);

  registerAllIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  logger.info('Main', 'All windows closed, shutting down desktop process');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
