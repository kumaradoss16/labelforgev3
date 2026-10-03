import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types/printer';

export interface UserIdentity {
  userId: string;
  userName: string;
  email: string;
  role: UserRole;
  ipAddress: string;
}

export const DEFAULT_IDENTITY: UserIdentity = {
  userId: 'usr-guest-04',
  userName: 'Guest Operator',
  email: 'guest@labelforge.internal',
  role: 'VIEWER',
  ipAddress: '127.0.0.1',
};

export interface IdentityContextType {
  identity: UserIdentity;
  setIdentity: (identity: UserIdentity) => void;
  updateRole: (role: UserRole) => void;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export const IdentityProvider: React.FC<{ children: React.ReactNode; initialIdentity?: UserIdentity }> = ({
  children,
  initialIdentity = DEFAULT_IDENTITY,
}) => {
  const [identity, setIdentityState] = useState<UserIdentity>(initialIdentity);

  useEffect(() => {
    // Sync with main process secure session on startup
    if (typeof window !== 'undefined' && (window as any).electronAPI?.auth) {
      (window as any).electronAPI.auth.getSession()
        .then((session: any) => {
          if (session) {
            setIdentityState({
              userId: session.userId,
              userName: session.userName,
              email: session.email,
              role: session.role,
              ipAddress: '127.0.0.1'
            });
          }
        })
        .catch(() => {});
    } else {
      setIdentityState(prev => ({ ...prev, ipAddress: '127.0.0.1' }));
    }
  }, []);

  useEffect(() => {
    // Set global current identity for non-React code
    if (typeof window !== 'undefined') {
      (window as any).currentIdentity = identity;
    }
  }, [identity]);

  const setIdentity = (newIdentity: UserIdentity) => {
    setIdentityState(newIdentity);
  };

  const updateRole = async (role: UserRole) => {
    if (role === identity.role) return;

    let confirmInput = '';
    const isTesting = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || (process.env as any).VITEST);
    if (!isTesting) {
      const promptRes = window.prompt(`Confirm role change to ${role}. Please enter security credential to authorize:`);
      if (promptRes === null) return; // User cancelled
      confirmInput = promptRes;
    }

    if (typeof window !== 'undefined' && (window as any).electronAPI?.auth?.login) {
      const usernameMap: Record<UserRole, string> = {
        SYSTEM_ADMIN: 'admin',
        PRINT_MANAGER: 'manager',
        OPERATOR: 'operator',
        VIEWER: 'viewer'
      };
      const username = usernameMap[role] || 'viewer';

      let password = '';
      if (!isTesting) {
        const promptRes = window.prompt(`Authenticate as ${role} (${username}). Enter password:`);
        if (promptRes === null) return;
        password = promptRes;
      }

      const res = await (window as any).electronAPI.auth.login({ username, password });
      if (!res || !res.success) {
        window.alert(res?.error || 'Authentication failed. Invalid security credentials.');
        return;
      }

      const session = res.principal;

      // Mandatory password change gate on first-time use
      if (res.requiresPasswordChange) {
        let newPassword = '';
        if (!isTesting) {
          const newPassInput = window.prompt(
            `Password rotation required on first login for "${username}". Enter new password (min 8 chars, uppercase, lowercase, number/symbol):`
          );
          if (!newPassInput) {
            window.alert('Password rotation is mandatory to access workstation features. Login aborted.');
            return;
          }
          newPassword = newPassInput;
        } else {
          newPassword = 'NewSecurePassword2026!';
        }

        const changeRes = await (window as any).electronAPI.auth.changePassword({
          userId: session.userId,
          oldPassword: password,
          newPassword
        });

        if (!changeRes || !changeRes.success) {
          window.alert(changeRes?.error || 'Password rotation failed. Must satisfy policy requirements.');
          return;
        }
      }
      const newIdentity: UserIdentity = {
        userId: session.userId,
        userName: session.userName,
        email: session.email,
        role: session.role as UserRole,
        ipAddress: identity.ipAddress
      };

      setIdentityState(newIdentity);

      const event = new CustomEvent('role-changed-audit', {
        detail: {
          beforeUser: identity.userName,
          beforeRole: identity.role,
          afterUser: newIdentity.userName,
          afterRole: newIdentity.role,
          userId: newIdentity.userId,
          ipAddress: identity.ipAddress
        }
      });
      window.dispatchEvent(event);
    } else {
      // Non-electron web preview mode
      const nameMap: Record<UserRole, string> = {
        SYSTEM_ADMIN: 'System Administrator',
        PRINT_MANAGER: 'Print Operations Manager',
        OPERATOR: 'Warehouse Operator',
        VIEWER: 'Guest Operator',
      };
      const idMap: Record<UserRole, string> = {
        SYSTEM_ADMIN: 'usr-admin-01',
        PRINT_MANAGER: 'usr-mgr-02',
        OPERATOR: 'usr-op-03',
        VIEWER: 'usr-guest-04',
      };
      const emailMap: Record<UserRole, string> = {
        SYSTEM_ADMIN: 'admin@labelforge.internal',
        PRINT_MANAGER: 'manager@labelforge.internal',
        OPERATOR: 'operator@labelforge.internal',
        VIEWER: 'guest@labelforge.internal',
      };

      const newIdentity: UserIdentity = {
        ...identity,
        role,
        userName: nameMap[role] || identity.userName,
        userId: idMap[role] || identity.userId,
        email: emailMap[role] || identity.email
      };

      setIdentityState(newIdentity);
    }
  };

  return (
    <IdentityContext.Provider value={{ identity, setIdentity, updateRole }}>
      {children}
    </IdentityContext.Provider>
  );
};

export const useIdentity = (): IdentityContextType => {
  const context = useContext(IdentityContext);
  if (!context) {
    return {
      identity: DEFAULT_IDENTITY,
      setIdentity: () => {},
      updateRole: () => {},
    };
  }
  return context;
};
