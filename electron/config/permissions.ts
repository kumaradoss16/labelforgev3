/**
 * LabelForge Desktop - Role-Based Access Control (RBAC) Permissions Table
 */

export const PRIVILEGED_ACTIONS = {
  PRINT: 'printer:print',
  TEST_PRINT: 'printer:test',
  SAVE_PROJECT: 'project:save',
  SAVE_AS_PROJECT: 'project:save-as',
  MODIFY_SETTINGS: 'settings:set',
  MODIFY_PRINTERS: 'printer:modify'
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SYSTEM_ADMIN: [
    PRIVILEGED_ACTIONS.PRINT,
    PRIVILEGED_ACTIONS.TEST_PRINT,
    PRIVILEGED_ACTIONS.SAVE_PROJECT,
    PRIVILEGED_ACTIONS.SAVE_AS_PROJECT,
    PRIVILEGED_ACTIONS.MODIFY_SETTINGS,
    PRIVILEGED_ACTIONS.MODIFY_PRINTERS
  ],
  PRINT_MANAGER: [
    PRIVILEGED_ACTIONS.PRINT,
    PRIVILEGED_ACTIONS.TEST_PRINT,
    PRIVILEGED_ACTIONS.SAVE_PROJECT,
    PRIVILEGED_ACTIONS.SAVE_AS_PROJECT,
    PRIVILEGED_ACTIONS.MODIFY_PRINTERS
  ],
  OPERATOR: [
    PRIVILEGED_ACTIONS.PRINT,
    PRIVILEGED_ACTIONS.TEST_PRINT
  ],
  VIEWER: [] // Viewer has no write/action permissions
};

export function checkPermission(role: string | undefined, action: string): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role.toUpperCase()] || [];
  return permissions.includes(action);
}
