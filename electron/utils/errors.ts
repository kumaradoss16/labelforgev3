/**
 * LabelForge Desktop - Centralized Error System
 */

export class ApplicationError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }

  public toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details
    };
  }
}

export class FileError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('ERR_FILESYSTEM', message, details);
    this.name = 'FileError';
  }
}

export class ProjectError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('ERR_PROJECT_CORRUPT', message, details);
    this.name = 'ProjectError';
  }
}

export class PrinterError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('ERR_PRINTER_FAILURE', message, details);
    this.name = 'PrinterError';
  }
}

export class IpcError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('ERR_IPC_SECURITY', message, details);
    this.name = 'IpcError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('ERR_VALIDATION_FAILED', message, details);
    this.name = 'ValidationError';
  }
}
