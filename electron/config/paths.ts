/**
 * LabelForge Desktop - Path Management
 * Handles standard Windows AppData folder resolution and application assets
 */

import path from 'path';
import fs from 'fs';
import { app } from 'electron';

class PathManager {
  private userDataDir: string = '';

  public init() {
    try {
      this.userDataDir = app.getPath('userData');
    } catch {
      // Fallback if app is not yet ready or in mock mode
      const base = process.env.APPDATA || (process.platform === 'darwin'
        ? path.join(process.env.HOME || '', 'Library', 'Application Support')
        : path.join(process.env.HOME || '', '.config'));
      this.userDataDir = path.join(base, 'LabelForge');
    }

    // Ensure all critical subdirectories exist
    this.ensureDir(this.getSettingsDir());
    this.ensureDir(this.getLogsDir());
    this.ensureDir(this.getRecentDir());
    this.ensureDir(this.getTemplatesDir());
    this.ensureDir(this.getCacheDir());
  }

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.error(`Failed to create directory: ${dir}`, err);
      }
    }
  }

  public getUserDataDir(): string {
    return this.userDataDir;
  }

  public getAppDataDir(): string {
    return this.getUserDataDir();
  }

  public getSettingsDir(): string {
    return path.join(this.userDataDir, 'settings');
  }

  public getSettingsFilePath(): string {
    return path.join(this.getSettingsDir(), 'app-settings.json');
  }

  public getLogsDir(): string {
    return path.join(this.userDataDir, 'logs');
  }

  public getAppLogFilePath(): string {
    return path.join(this.getLogsDir(), 'labelforge.log');
  }

  public getRecentDir(): string {
    return path.join(this.userDataDir, 'recent');
  }

  public getRecentFilePath(): string {
    return path.join(this.getRecentDir(), 'recent-projects.json');
  }

  public getTemplatesDir(): string {
    return path.join(this.userDataDir, 'templates');
  }

  public getCacheDir(): string {
    return path.join(this.userDataDir, 'cache');
  }

  public getPreloadPath(): string {
    return path.join(__dirname, 'preload.cjs');
  }

  public getAppHtmlPath(): string {
    return path.join(app.getAppPath(), 'dist', 'index.html');
  }
}

export const paths = new PathManager();
