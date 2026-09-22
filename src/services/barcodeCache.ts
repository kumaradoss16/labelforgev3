/**
 * LabelForge Centralized Barcode & 2D Code Rendering Cache
 * Bounded LRU memory cache preventing memory leaks during long-running sessions
 * and large variable data batch generation
 */

export interface BarcodeCacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
}

class BarcodeCache {
  private cache = new Map<string, string>();
  private readonly maxSize: number;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(maxSize = 300) {
    this.maxSize = maxSize;
  }

  public get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hits++;
      // Move to back (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    this.misses++;
    return undefined;
  }

  public set(key: string, value: string): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first entry in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.evictions++;
      }
    }
    this.cache.set(key, value);
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  public size(): number {
    return this.cache.size;
  }

  public getStats(): BarcodeCacheStats {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions
    };
  }
}

// Global bounded singleton instance
export const barcodeCache = new BarcodeCache(300);
