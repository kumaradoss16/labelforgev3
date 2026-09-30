/**
 * LabelForge Desktop - Main Process Centralized Security Context
 * Restricts role, identity, and authorization decisions to the Main Process.
 */

import { sessionManager, SessionPrincipal } from '../services/SessionManager';
import { checkPermission } from '../config/permissions';

export function getSessionPrincipal(): SessionPrincipal {
  return sessionManager.requireAuthenticated();
}

// These functions will be removed or updated as we implement real authentication
export function setSessionPrincipal(userId: string, userName: string, role: any): void {
  sessionManager.initializeSession(userId, userName, role);
}

export function resetSessionPrincipal(): void {
  // sessionManager.clearSession(); // Need to add clearSession
}

export function checkMainProcessPermission(action: string): boolean {
  try {
    const principal = getSessionPrincipal();
    return checkPermission(principal.role, action);
  } catch (e) {
    return false;
  }
}
