import { randomUUID } from 'node:crypto';

export type UserRole = 'SYSTEM_ADMIN' | 'PRINT_MANAGER' | 'OPERATOR' | 'VIEWER';

export interface SessionPrincipal {
    userId: string;
    userName: string;
    role: UserRole;
    sessionId: string;
    authenticatedAt: number;
}

export class AuthError extends Error {
    constructor(public code: string) {
        super(code);
    }
}

export class SessionManager {
    private session: SessionPrincipal | null = null;

    // This should be replaced by a real authentication mechanism later.
    // For now, this is a placeholder that simulates a session setup.
    initializeSession(userId: string, userName: string, role: UserRole) {
        this.session = {
            userId,
            userName,
            role,
            sessionId: randomUUID(),
            authenticatedAt: Date.now(),
        };
    }

    requireAuthenticated(): SessionPrincipal {
        if (!this.session) {
            throw new AuthError("AUTH_REQUIRED");
        }
        return this.session;
    }
}

export const sessionManager = new SessionManager();
