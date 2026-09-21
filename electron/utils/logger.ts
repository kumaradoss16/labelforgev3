/**
 * LabelForge Desktop - Logging System
 * Logs structured operational events to disk in Windows AppData and console
 */

import fs from 'fs';
import { paths } from '../config/paths';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private logFilePath: string = '';

  public init() {
    this.logFilePath = paths.getAppLogFilePath();
  }

  private sanitize(message: string): string {
    // Strip potential API keys or tokens
    return message
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/bearer\s+[A-Za-z0-9-_.]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/password\s*[:=]\s*["'][^"']+["']/gi, 'password="[REDACTED]"');
  }

  private write(level: LogLevel, context: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const sanitizedMsg = this.sanitize(message);
    const dataStr = data ? ' ' + JSON.stringify(data) : '';
    const formatted = `[${timestamp}] [${level}] [${context}] ${sanitizedMsg}${dataStr}\n`;

    // Console output
    if (level === 'ERROR') {
      console.error(formatted.trim());
    } else if (level === 'WARN') {
      console.warn(formatted.trim());
    } else {
      console.log(formatted.trim());
    }

    // File output
    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, formatted, { encoding: 'utf-8' });
      } catch (err) {
        console.error('Failed to append log to file', err);
      }
    }
  }

  public debug(context: string, message: string, data?: any) {
    this.write('DEBUG', context, message, data);
  }

  public info(context: string, message: string, data?: any) {
    this.write('INFO', context, message, data);
  }

  public warn(context: string, message: string, data?: any) {
    this.write('WARN', context, message, data);
  }

  public error(context: string, message: string, data?: any) {
    this.write('ERROR', context, message, data);
  }
}

export const logger = new Logger();
