/**
 * LabelForge Desktop - Environment Configuration
 */

export const isDev = process.env.NODE_ENV !== 'production' && !process.env.APPIMAGE && !process.env.PORTABLE_EXECUTABLE_DIR;
export const isWindows = process.platform === 'win32';
export const isMac = process.platform === 'darwin';
export const isLinux = process.platform === 'linux';
export const appVersion = '3.0.0';
export const appName = 'LabelForge';
