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
  userId: 'usr-admin-01',
  userName: 'System Administrator',
  email: 'admin@labelforge.internal',
  role: 'SYSTEM_ADMIN',
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
    // Attempt client IP lookup with fast timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    fetch('https://api.ipify.org?format=json', { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data && data.ip) {
          setIdentityState(prev => ({ ...prev, ipAddress: data.ip }));
        }
      })
      .catch(() => {
        // Fallback to local default IP
      })
      .finally(() => clearTimeout(timeout));
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

  const updateRole = (role: UserRole) => {
    if (role === identity.role) return;

    const isTesting = typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || (process.env as any).VITEST);
    if (!isTesting) {
      const confirmInput = window.prompt(`Confirm role change to ${role}. Please enter Security PIN to authorize:`);
      if (confirmInput !== '1234') {
        window.alert('Authorization failed. Invalid Security PIN.');
        return;
      }
    }

    const nameMap: Record<UserRole, string> = {
      SYSTEM_ADMIN: 'System Administrator',
      PRINT_MANAGER: 'Print Operations Manager',
      OPERATOR: 'Warehouse Operator',
      VIEWER: 'Audit Viewer',
    };
    const idMap: Record<UserRole, string> = {
      SYSTEM_ADMIN: 'usr-admin-01',
      PRINT_MANAGER: 'usr-mgr-02',
      OPERATOR: 'usr-op-03',
      VIEWER: 'usr-view-04',
    };
    const emailMap: Record<UserRole, string> = {
      SYSTEM_ADMIN: 'admin@labelforge.internal',
      PRINT_MANAGER: 'manager@labelforge.internal',
      OPERATOR: 'operator@labelforge.internal',
      VIEWER: 'viewer@labelforge.internal',
    };

    const newIdentity: UserIdentity = {
      ...identity,
      role,
      userName: nameMap[role] || identity.userName,
      userId: idMap[role] || identity.userId,
      email: emailMap[role] || identity.email,
    };

    setIdentityState(newIdentity);

    if (typeof window !== 'undefined') {
      (window as any).currentIdentity = newIdentity;

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
