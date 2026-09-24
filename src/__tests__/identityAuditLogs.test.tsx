// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { IdentityProvider, useIdentity } from '../context/IdentityContext';

describe('Phase 5: Real Identity Context & Audit Logging', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ip: '192.168.1.100' })
    }));
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
      container = null;
    }
    vi.unstubAllGlobals();
  });

  it('provides default viewer identity initially', async () => {
    let capturedIdentity: any = null;

    const TestComponent = () => {
      const { identity } = useIdentity();
      capturedIdentity = identity;
      return <div>{identity.userName}</div>;
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <IdentityProvider>
          <TestComponent />
        </IdentityProvider>
      );
    });

    expect(capturedIdentity).not.toBeNull();
    expect(capturedIdentity.role).toBe('VIEWER');
    expect(capturedIdentity.userId).toBe('usr-guest-04');
    expect(capturedIdentity.userName).toBe('Guest Operator');
  });

  it('updates profile and user attributes when role changes', async () => {
    let capturedIdentity: any = null;
    let triggerUpdateRole: any = null;

    const TestComponent = () => {
      const { identity, updateRole } = useIdentity();
      capturedIdentity = identity;
      triggerUpdateRole = updateRole;
      return <div>{identity.userName}</div>;
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <IdentityProvider>
          <TestComponent />
        </IdentityProvider>
      );
    });

    await act(async () => {
      triggerUpdateRole('OPERATOR');
    });

    expect(capturedIdentity.role).toBe('OPERATOR');
    expect(capturedIdentity.userId).toBe('usr-op-03');
    expect(capturedIdentity.userName).toBe('Warehouse Operator');
    expect(capturedIdentity.email).toBe('operator@labelforge.internal');
  });

  it('uses local safe IP address instead of external ipify on load', async () => {
    let capturedIdentity: any = null;

    const TestComponent = () => {
      const { identity } = useIdentity();
      capturedIdentity = identity;
      return <div>{identity.ipAddress}</div>;
    };

    await act(async () => {
      const root = createRoot(container!);
      root.render(
        <IdentityProvider>
          <TestComponent />
        </IdentityProvider>
      );
    });

    await vi.waitFor(() => {
      expect(capturedIdentity.ipAddress).toBe('127.0.0.1');
    });
  });
});
