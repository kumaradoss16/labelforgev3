/**
 * LabelForge Desktop - Security Typed Domain Errors
 */

export class LabelForgeSecurityError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationRequiredError extends LabelForgeSecurityError {
  constructor(message: string = 'Authentication required. No active session.') {
    super(message, 'AUTH_REQUIRED');
  }
}

export class AuthenticationFailedError extends LabelForgeSecurityError {
  constructor(message: string = 'Authentication failed. Invalid credentials.') {
    super(message, 'AUTH_FAILED');
  }
}

export class SessionExpiredError extends LabelForgeSecurityError {
  constructor(message: string = 'Session has expired. Please re-authenticate.') {
    super(message, 'SESSION_EXPIRED');
  }
}

export class AuthorizationDeniedError extends LabelForgeSecurityError {
  constructor(action: string, role: string) {
    super(`Access denied: Role '${role}' is not authorized to perform '${action}'.`, 'ERR_FORBIDDEN');
  }
}

export class UntrustedIpcSenderError extends LabelForgeSecurityError {
  constructor(message: string = 'Untrusted IPC sender frame.') {
    super(message, 'UNTRUSTED_IPC_SENDER');
  }
}

export class PrintPayloadUnavailableError extends LabelForgeSecurityError {
  constructor(jobId: string) {
    super(`Canonical print payload unavailable for job '${jobId}'. Preview data is never permitted for printing.`, 'PRINT_PAYLOAD_UNAVAILABLE');
  }
}

export class PrintPayloadIntegrityError extends LabelForgeSecurityError {
  constructor(jobId: string, details?: string) {
    super(`Print payload cryptographic integrity verification failed for job '${jobId}'. ${details || ''}`.trim(), 'PRINT_PAYLOAD_INTEGRITY_MISMATCH');
  }
}

export class PrintTransmissionUnknownError extends LabelForgeSecurityError {
  constructor(jobId: string, details?: string) {
    super(`Print transmission status is unknown for job '${jobId}'. Transmission cannot be verified; automatic retry is prevented. ${details || ''}`.trim(), 'PRINT_TRANSMISSION_UNKNOWN');
  }
}

export class AuditIntegrityError extends LabelForgeSecurityError {
  constructor(message: string, public readonly sequenceNumber?: number) {
    super(message, 'AUDIT_INTEGRITY_VIOLATION');
  }
}
