/**
 * LabelForge Desktop - Main Process Centralized Security Context
 * Restricts role, identity, and authorization decisions to the Main Process.
 */

export interface AuthenticatedPrincipal {
  userId: string;
  userName: string;
  email: string;
  role: string;
  authenticatedAt: number;
  sessionId: string;
}

// Default state is safe/unprivileged (VIEWER)
let currentPrincipal: AuthenticatedPrincipal = {
  userId: 'usr-guest-04',
  userName: 'Guest Operator',
  email: 'guest@labelforge.internal',
  role: 'VIEWER',
  authenticatedAt: Date.now(),
  sessionId: 'sess-init'
};

export function getSessionPrincipal(): AuthenticatedPrincipal {
  return currentPrincipal;
}

export function setSessionPrincipal(principal: AuthenticatedPrincipal): void {
  currentPrincipal = principal;
}

export function resetSessionPrincipal(): void {
  currentPrincipal = {
    userId: 'usr-guest-04',
    userName: 'Guest Operator',
    email: 'guest@labelforge.internal',
    role: 'VIEWER',
    authenticatedAt: Date.now(),
    sessionId: 'sess-init'
  };
}

export function checkMainProcessPermission(action: string): boolean {
  const principal = getSessionPrincipal();
  const role = principal.role.toUpperCase();

  const ROLE_PERMISSIONS: Record<string, string[]> = {
    SYSTEM_ADMIN: [
      'printer:print',
      'printer:test',
      'project:save',
      'project:save-as'
    ],
    PRINT_MANAGER: [
      'printer:print',
      'printer:test',
      'project:save',
      'project:save-as'
    ],
    OPERATOR: [
      'printer:print',
      'printer:test'
    ],
    VIEWER: []
  };

  const allowedActions = ROLE_PERMISSIONS[role] || [];
  return allowedActions.includes(action);
}
