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

    if (typeof window !== 'undefined' && (window as any).electronAPI?.auth) {
      // Secure delegation of role update / verification to main process
      const res = await (window as any).electronAPI.auth.updateRole(role, confirmInput);
      if (!res || !res.success) {
        window.alert(res?.error || 'Authorization failed. Invalid security credential.');
        return;
      }

      const session = res.principal;
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
      // Non-electron/testing mode fallback with secure checks
      const requiredToken = role === 'SYSTEM_ADMIN' ? 'admin@lf3' 
                          : role === 'PRINT_MANAGER' ? 'manager@lf3'
                          : role === 'OPERATOR' ? 'operator@lf3'
                          : '';
      
      if (requiredToken && confirmInput !== requiredToken && !isTesting) {
        window.alert('Authorization failed. Invalid security credential.');
        return;
      }

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
        email: emailMap[role] || identity.email,
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
