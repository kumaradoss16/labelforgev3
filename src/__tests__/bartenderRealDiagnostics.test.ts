import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pingBarTenderService } from '../services/barTenderPrintService';

describe('Phase 3: Real BarTender Service Diagnostics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles HTTP 200 OK with real roundtrip time', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      new Promise(resolve => {
        setTimeout(() => {
          resolve(new Response(JSON.stringify({ status: 'healthy' }), {
            status: 200,
            statusText: 'OK'
          }));
        }, 30);
      })
    );
    vi.stubGlobal('fetch', mockFetch);

    const result = await pingBarTenderService('http://127.0.0.1:5159/api/actions');

    expect(result.success).toBe(true);
    expect(result.status).toBe(200);
    expect(result.roundtripMs).toBeGreaterThanOrEqual(20);
    expect(result.url).toBe('http://127.0.0.1:5159/api/actions');
  });

  it('handles network failure or connection refused cleanly', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await pingBarTenderService('http://127.0.0.1:5159/api/actions');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('Failed to fetch');
    expect(result.roundtripMs).toBeGreaterThanOrEqual(0);
  });
});
