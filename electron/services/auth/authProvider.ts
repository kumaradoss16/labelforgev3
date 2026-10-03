/**
 * LabelForge Desktop - Authentication Provider & Identity Contracts
 * Strict authentication boundary: Renderer cannot self-assign identities or roles.
 */

import crypto from 'node:crypto';
import { UserRole } from '../../../src/types/printer';
import { AuthenticationFailedError } from '../../security/errors';
import { logger } from '../../utils/logger';

export interface AuthenticatedIdentity {
  userId: string;
  userName: string;
  role: UserRole;
  authenticationMethod: 'WINDOWS' | 'DOMAIN' | 'OIDC' | 'LOCAL';
  metadata?: Record<string, string>;
  forcePasswordChange?: boolean;
}

export interface AuthenticationCredentials {
  username: string;
  password?: string;
  domain?: string;
}

export interface AuthenticationProvider {
  authenticate(credentials: AuthenticationCredentials): Promise<AuthenticatedIdentity>;
  getUserById(userId: string): Promise<AuthenticatedIdentity | null>;
  getUserByUsername?(username: string): Promise<AuthenticatedIdentity | null>;
  verify?(userId: string, credential: string): Promise<boolean>;
  changePassword?(userId: string, oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }>;
}

interface StoredCredential {
  userId: string;
  userName: string;
  role: UserRole;
  salt: string;
  hash: string;
  lockedUntil?: number;
  failedAttempts: number;
  forcePasswordChange: boolean;
}

/**
 * Validates password strength policy
 */
export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 256) {
    return { valid: false, error: 'Password must not exceed 256 characters.' };
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigitOrSpecial = /[\d\W_]/.test(password);
  if (!hasUpper || !hasLower || !hasDigitOrSpecial) {
    return { valid: false, error: 'Password must include uppercase, lowercase, and a number or symbol.' };
  }
  return { valid: true };
}

/**
 * Generates PBKDF2 hash for password storage
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
}

/**
 * Timing-safe password verification
 */
export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const actualHash = hashPassword(password, salt);
  const bufActual = Buffer.from(actualHash, 'hex');
  const bufExpected = Buffer.from(expectedHash, 'hex');
  if (bufActual.length !== bufExpected.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufActual, bufExpected);
}

/**
 * Production Local Authentication Provider with hashed credentials and lockout defense
 */
export class LocalAuthenticationProvider implements AuthenticationProvider {
  private users: Map<string, StoredCredential> = new Map();
  private initialPasswordsForTesting: Map<string, string> = new Map();

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers(): void {
    const seedConfig: Array<{ key: string; userId: string; userName: string; role: UserRole }> = [
      { key: 'admin', userId: 'usr-admin-01', userName: 'System Administrator', role: 'SYSTEM_ADMIN' },
      { key: 'manager', userId: 'usr-mgr-02', userName: 'Print Operations Manager', role: 'PRINT_MANAGER' },
      { key: 'operator', userId: 'usr-op-03', userName: 'Warehouse Operator', role: 'OPERATOR' },
      { key: 'viewer', userId: 'usr-viewer-04', userName: 'Guest Viewer', role: 'VIEWER' }
    ];

    for (const cfg of seedConfig) {
      const initialPassword = crypto.randomBytes(12).toString('base64url'); // ~16 char random secret
      const salt = crypto.randomBytes(16).toString('hex');
      this.users.set(cfg.key, {
        userId: cfg.userId,
        userName: cfg.userName,
        role: cfg.role,
        salt,
        hash: hashPassword(initialPassword, salt),
        failedAttempts: 0,
        forcePasswordChange: true
      });

      this.initialPasswordsForTesting.set(cfg.key, initialPassword);

      // Surfaced once, at startup, so the deploying administrator can retrieve it.
      // This must NOT be written to the audit log or any persisted file — console only.
      logger.warn('AuthProvider', `[FIRST-RUN SETUP] Generated initial password for account "${cfg.key}" (${cfg.role}): ${initialPassword}`);
      logger.warn('AuthProvider', `[FIRST-RUN SETUP] This password will not be shown again. Change it immediately after first login.`);
    }
  }

  /**
   * Test-mode helper to capture generated random passwords without hardcoding secrets
   */
  public getInitialPasswordForTesting(usernameKey: string): string | undefined {
    return this.initialPasswordsForTesting.get(usernameKey.trim().toLowerCase());
  }

  /**
   * Changes user password, verifies old password and policy, hashes with fresh salt, and clears forcePasswordChange
   */
  public async changePassword(
    userIdOrUsername: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!userIdOrUsername || !oldPassword || !newPassword) {
      return { success: false, error: 'User ID, existing password, and new password are required.' };
    }

    const cleanKey = userIdOrUsername.trim().toLowerCase();
    let stored: StoredCredential | undefined = this.users.get(cleanKey);
    if (!stored) {
      for (const u of this.users.values()) {
        if (u.userId.toLowerCase() === cleanKey || u.userName.toLowerCase() === cleanKey) {
          stored = u;
          break;
        }
      }
    }

    if (!stored) {
      logger.warn('AuthProvider', `Password change failed: user "${userIdOrUsername}" not found`);
      return { success: false, error: 'User not found.' };
    }

    // Verify old password
    const isOldValid = verifyPassword(oldPassword, stored.salt, stored.hash);
    if (!isOldValid) {
      logger.warn('AuthProvider', `Password change failed: incorrect old password for user "${stored.userName}"`);
      return { success: false, error: 'Incorrect existing password.' };
    }

    // Validate password policy
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return { success: false, error: policy.error || 'Password does not meet complexity requirements.' };
    }

    // Ensure new password is not identical to old password
    if (oldPassword === newPassword) {
      return { success: false, error: 'New password cannot be identical to current password.' };
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    stored.salt = newSalt;
    stored.hash = hashPassword(newPassword, newSalt);
    stored.forcePasswordChange = false;
    stored.failedAttempts = 0;
    stored.lockedUntil = undefined;

    this.initialPasswordsForTesting.delete(cleanKey);
    this.initialPasswordsForTesting.delete(stored.userId.toLowerCase());

    logger.info('AuthProvider', `Password successfully changed for user "${stored.userName}".`);
    return { success: true };
  }

  public async authenticate(credentials: AuthenticationCredentials): Promise<AuthenticatedIdentity> {
    if (!credentials || !credentials.username) {
      throw new AuthenticationFailedError('Username is required.');
    }

    const usernameKey = credentials.username.trim().toLowerCase();
    const stored = this.users.get(usernameKey);

    if (!stored) {
      logger.warn('AuthProvider', `Authentication failed for non-existent user: "${credentials.username}"`);
      throw new AuthenticationFailedError('Invalid credentials.');
    }

    const now = Date.now();
    if (stored.lockedUntil && stored.lockedUntil > now) {
      const waitSeconds = Math.ceil((stored.lockedUntil - now) / 1000);
      logger.warn('AuthProvider', `Authentication blocked by lockout for user: "${usernameKey}"`);
      throw new AuthenticationFailedError(`Account temporarily locked due to repeated failures. Try again in ${waitSeconds}s.`);
    }

    const password = credentials.password || '';
    const isValid = verifyPassword(password, stored.salt, stored.hash);

    if (!isValid) {
      stored.failedAttempts += 1;
      if (stored.failedAttempts >= 5) {
        stored.lockedUntil = now + 60 * 1000; // 60s lockout
        logger.warn('AuthProvider', `Account locked after 5 failed attempts: "${usernameKey}"`);
      }
      logger.warn('AuthProvider', `Invalid password attempt for user: "${usernameKey}"`);
      throw new AuthenticationFailedError('Invalid credentials.');
    }

    // Reset failed counter on successful authentication
    stored.failedAttempts = 0;
    stored.lockedUntil = undefined;

    logger.info('AuthProvider', `User "${stored.userName}" authenticated successfully with role "${stored.role}".`);

    return {
      userId: stored.userId,
      userName: stored.userName,
      role: stored.role,
      authenticationMethod: 'LOCAL',
      forcePasswordChange: Boolean(stored.forcePasswordChange),
      metadata: {
        accountName: usernameKey
      }
    };
  }

  public async getUserById(userId: string): Promise<AuthenticatedIdentity | null> {
    for (const stored of this.users.values()) {
      if (stored.userId === userId || stored.userName.toLowerCase() === userId.toLowerCase()) {
        return {
          userId: stored.userId,
          userName: stored.userName,
          role: stored.role,
          authenticationMethod: 'LOCAL',
          forcePasswordChange: Boolean(stored.forcePasswordChange)
        };
      }
    }
    const clean = userId.trim().toLowerCase();
    const stored = this.users.get(clean);
    if (stored) {
      return {
        userId: stored.userId,
        userName: stored.userName,
        role: stored.role,
        authenticationMethod: 'LOCAL',
        forcePasswordChange: Boolean(stored.forcePasswordChange)
      };
    }
    return null;
  }

  public async getUserByUsername(username: string): Promise<AuthenticatedIdentity | null> {
    const cleanKey = username.trim().toLowerCase();
    const stored = this.users.get(cleanKey);
    if (stored) {
      return {
        userId: stored.userId,
        userName: stored.userName,
        role: stored.role,
        authenticationMethod: 'LOCAL',
        forcePasswordChange: Boolean(stored.forcePasswordChange)
      };
    }
    for (const u of this.users.values()) {
      if (u.userName.toLowerCase() === cleanKey || u.userId.toLowerCase() === cleanKey) {
        return {
          userId: u.userId,
          userName: u.userName,
          role: u.role,
          authenticationMethod: 'LOCAL',
          forcePasswordChange: Boolean(u.forcePasswordChange)
        };
      }
    }
    return null;
  }

  /**
   * Verifies user credential against stored PBKDF2 hash with lockout protection.
   * Real cryptographic verification, not a bypass.
   */
  public async verify(userIdOrName: string, credential: string): Promise<boolean> {
    if (!userIdOrName || !credential) {
      return false;
    }
    const cleanKey = userIdOrName.trim().toLowerCase();
    let stored = this.users.get(cleanKey);
    if (!stored) {
      for (const u of this.users.values()) {
        if (
          u.userId.toLowerCase() === cleanKey ||
          u.userName.toLowerCase() === cleanKey ||
          u.role.toLowerCase() === cleanKey
        ) {
          stored = u;
          break;
        }
      }
    }
    if (!stored) {
      logger.warn('AuthProvider', `Verification failed: user "${userIdOrName}" not found`);
      return false;
    }

    const now = Date.now();
    if (stored.lockedUntil && stored.lockedUntil > now) {
      logger.warn('AuthProvider', `Verification blocked: user "${stored.userName}" is locked out`);
      return false;
    }

    const isValid = verifyPassword(credential, stored.salt, stored.hash);
    if (!isValid) {
      stored.failedAttempts += 1;
      if (stored.failedAttempts >= 5) {
        stored.lockedUntil = now + 60 * 1000;
        logger.warn('AuthProvider', `Account locked after 5 failed attempts: "${stored.userName}"`);
      }
      logger.warn('AuthProvider', `Verification failed: invalid credential for "${stored.userName}"`);
      return false;
    }

    stored.failedAttempts = 0;
    stored.lockedUntil = undefined;
    logger.info('AuthProvider', `User "${stored.userName}" verified successfully.`);
    return true;
  }
}

export const localAuthProvider = new LocalAuthenticationProvider();
