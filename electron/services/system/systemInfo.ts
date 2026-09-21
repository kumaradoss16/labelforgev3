/**
 * LabelForge Desktop - System Information Service
 */

import os from 'os';

export interface SystemInfo {
  platform: string;
  arch: string;
  osRelease: string;
  hostname: string;
  totalMemoryMB: number;
  freeMemoryMB: number;
  cpus: number;
}

export class SystemService {
  public getInfo(): SystemInfo {
    return {
      platform: os.platform(),
      arch: os.arch(),
      osRelease: os.release(),
      hostname: os.hostname(),
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      cpus: os.cpus().length
    };
  }
}

export const systemService = new SystemService();
