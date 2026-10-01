/**
 * LabelForge Desktop - IPC Sender Frame Validation
 * Enforces origin and protocol boundaries on all incoming IPC messages
 */

import { IpcMainInvokeEvent, app } from 'electron';
import { UntrustedIpcSenderError } from './errors';

export function assertTrustedRenderer(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame;
  if (!frame) {
    throw new UntrustedIpcSenderError('Rejected IPC call: missing sender frame.');
  }

  const rawUrl = frame.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new UntrustedIpcSenderError('Rejected IPC call: missing sender URL.');
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UntrustedIpcSenderError(`Rejected IPC call: malformed sender URL.`);
  }

  const isPackaged = app ? app.isPackaged : process.env.NODE_ENV === 'production';

  if (isPackaged) {
    // In production desktop application, renderer MUST run from file:// or app:// protocol
    if (parsed.protocol !== 'file:' && parsed.protocol !== 'app:' && parsed.protocol !== 'atom:') {
      throw new UntrustedIpcSenderError(`Untrusted sender protocol '${parsed.protocol}' in production.`);
    }
  } else {
    // In development mode, allow standard dev server URLs (e.g. localhost, 127.0.0.1, or app host)
    const allowedDevProtocols = ['http:', 'https:', 'file:'];
    if (!allowedDevProtocols.includes(parsed.protocol)) {
      throw new UntrustedIpcSenderError(`Untrusted sender protocol '${parsed.protocol}' in development.`);
    }

    const host = parsed.hostname.toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.run.app');
    if (!isLocal && parsed.protocol !== 'file:') {
      throw new UntrustedIpcSenderError(`Untrusted dev host '${host}'.`);
    }
  }
}
