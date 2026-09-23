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

  const setIdentity = (newIdentity: UserIdentity) => {
    setIdentityState(newIdentity);
  };

  const updateRole = (role: UserRole) => {
    setIdentityState(prev => {
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
      return {
        ...prev,
        role,
        userName: nameMap[role] || prev.userName,
        userId: idMap[role] || prev.userId,
        email: emailMap[role] || prev.email,
      };
    });
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
