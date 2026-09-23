import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDemoMode, setDemoModeOverride } from '../services/environmentConfig';

describe('Phase 4: Production/Demo Environment Split', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    const localStorageMock = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };

    vi.stubGlobal('window', {
      location: { reload: vi.fn() }
    });
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to production mode (isDemoMode = false) when VITE_DEMO_MODE is absent', () => {
    expect(isDemoMode()).toBe(false);
  });

  it('allows enabling demo mode via setDemoModeOverride', () => {
    setDemoModeOverride(true);
    expect(store['labelforge_demo_mode']).toBe('true');
    expect(isDemoMode()).toBe(true);

    setDemoModeOverride(false);
    expect(store['labelforge_demo_mode']).toBe('false');
    expect(isDemoMode()).toBe(false);
  });
});
