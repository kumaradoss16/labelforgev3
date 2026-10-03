/**
 * LabelForge Desktop - Centralized Session Manager
 * Enforces authenticated session state in the Electron Main process.
 * Renderer-controlled roles and spoofed identities are strictly rejected.
 */

import crypto from 'node:crypto';
import { UserRole } from '../../src/types/printer';
import { AuthenticatedIdentity } from './auth/authProvider';
import { AuthenticationRequiredError, SessionExpiredError } from '../security/errors';
import { logger } from '../utils/logger';

export interface SessionPrincipal {
  sessionId: string;
  userId: string;
  userName: string;
  role: UserRole;
  authenticationMethod: 'WINDOWS' | 'DOMAIN' | 'OIDC' | 'LOCAL';
  authenticatedAt: number;
  expiresAt: number;
  forcePasswordChange?: boolean;
}

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export class SessionManager {
  private currentSession: SessionPrincipal | null = null;
  private wasRecentlyExpired: boolean = false;

  /**
   * Constructs an authenticated session from an AuthenticatedIdentity verified by an AuthenticationProvider.
   * Renderer-controlled input CANNOT call this directly.
   */
  public createAuthenticatedSession(
    identity: AuthenticatedIdentity,
    ttlMs: number = SESSION_TTL_MS
  ): SessionPrincipal {
    this.wasRecentlyExpired = false;
    const now = Date.now();
    const sessionId = crypto.randomBytes(32).toString('hex');

    this.currentSession = {
      sessionId,
      userId: identity.userId,
      userName: identity.userName,
      role: identity.role,
      authenticationMethod: identity.authenticationMethod,
      authenticatedAt: now,
      expiresAt: now + ttlMs,
      forcePasswordChange: Boolean(identity.forcePasswordChange)
    };

    logger.info('SessionManager', `Authenticated session created for '${identity.userName}' (role: ${identity.role}, id: ${sessionId.slice(0, 8)}...)`);
    return this.currentSession;
  }

  /**
   * Initializes or updates an authenticated session in the Electron Main process.
   * Used by auth:login flow and application initialization.
   */
  public initializeSession(
    userId: string,
    userName: string,
    role: UserRole,
    forcePasswordChange: boolean = false
  ): SessionPrincipal {
    const identity: AuthenticatedIdentity = {
      userId,
      userName,
      role,
      authenticationMethod: 'LOCAL',
      forcePasswordChange
    };
    return this.createAuthenticatedSession(identity);
  }

  /**
   * Clears the forcePasswordChange flag in the active session if it matches userId
   */
  public clearPasswordChangeRequirement(userId: string): void {
    if (
      this.currentSession &&
      (this.currentSession.userId === userId ||
        this.currentSession.userName.toLowerCase() === userId.toLowerCase())
    ) {
      this.currentSession.forcePasswordChange = false;
      logger.info('SessionManager', `Password change requirement cleared for active session "${this.currentSession.userName}".`);
    }
  }

  /**
   * Retrieves the current principal if valid and unexpired; returns null otherwise.
   */
  public getAuthenticatedPrincipal(): SessionPrincipal | null {
    if (!this.currentSession) {
      return null;
    }

    if (Date.now() > this.currentSession.expiresAt) {
      logger.warn('SessionManager', `Session ${this.currentSession.sessionId.slice(0, 8)}... has expired.`);
      this.currentSession = null;
      this.wasRecentlyExpired = true;
      return null;
    }

    return this.currentSession;
  }

  /**
   * Enforces that an active, valid, unexpired session exists.
   * Throws typed domain errors if unauthenticated or expired.
   */
  public requireAuthenticatedPrincipal(): SessionPrincipal {
    if (!this.currentSession) {
      if (this.wasRecentlyExpired) {
        throw new SessionExpiredError();
      }
      throw new AuthenticationRequiredError('Active authenticated session required.');
    }

    if (Date.now() > this.currentSession.expiresAt) {
      this.currentSession = null;
      this.wasRecentlyExpired = true;
      throw new SessionExpiredError();
    }

    return this.currentSession;
  }

  /**
   * Backward-compatible helper for existing callers requiring non-null principal
   */
  public requireAuthenticated(): SessionPrincipal {
    return this.requireAuthenticatedPrincipal();
  }

  /**
   * Explicitly destroys/invalidates the current session (Logout)
   */
  public destroySession(): void {
    if (this.currentSession) {
      logger.info('SessionManager', `Session destroyed for user '${this.currentSession.userName}'`);
      this.currentSession = null;
      this.wasRecentlyExpired = false;
    }
  }

  /**
   * Internal bootstrap mechanism ONLY for non-interactive test harnesses.
   * Strictly isolated from renderer IPC.
   */
  public _bootstrapTestSession(
    userId: string,
    userName: string,
    role: UserRole
  ): SessionPrincipal {
    const identity: AuthenticatedIdentity = {
      userId,
      userName,
      role,
      authenticationMethod: 'LOCAL'
    };
    return this.createAuthenticatedSession(identity);
  }
}

export const sessionManager = new SessionManager();
