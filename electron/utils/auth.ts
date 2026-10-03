/**
 * LabelForge Desktop - Main Process Centralized Security Context
 * Restricts role, identity, and authorization decisions to the Main Process.
 */

import { sessionManager, SessionPrincipal } from '../services/SessionManager';
import { checkPermission } from '../config/permissions';
import { UserRole } from '../../src/types/printer';

export function getSessionPrincipal(): SessionPrincipal {
  return sessionManager.requireAuthenticatedPrincipal();
}

export function getOptionalSessionPrincipal(): SessionPrincipal | null {
  return sessionManager.getAuthenticatedPrincipal();
}

export function initializeSession(
  userId: string,
  userName: string,
  role: UserRole,
  forcePasswordChange: boolean = false
): SessionPrincipal {
  return sessionManager.initializeSession(userId, userName, role, forcePasswordChange);
}

export function resetSessionPrincipal(): void {
  sessionManager.destroySession();
}

export function checkMainProcessPermission(action: string): boolean {
  try {
    const principal = getSessionPrincipal();
    return checkPermission(principal.role, action);
  } catch {
    return false;
  }
}
