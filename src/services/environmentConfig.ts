/**
 * Environment & Demo Mode Configuration Service
 */

export function isDemoMode(): boolean {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    const localOverride = localStorage.getItem('labelforge_demo_mode');
    if (localOverride !== null) {
      return localOverride === 'true';
    }
  }
  const envValue = (import.meta as any).env?.VITE_DEMO_MODE;
  if (envValue === 'true' || envValue === '1') {
    return true;
  }
  return false;
}

export function setDemoModeOverride(enabled: boolean): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem('labelforge_demo_mode', enabled ? 'true' : 'false');
    if (typeof window.location?.reload === 'function') {
      window.location.reload();
    }
  }
}
