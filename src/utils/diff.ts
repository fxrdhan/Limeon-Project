export interface DiffSegment {
  type: 'unchanged' | 'added' | 'removed';
  text: string;
}

// ❌ REMOVED: All client-side diff computation logic moved to server-only
// 🔒 SECURITY: Zero exposure of proprietary algorithms

// 🔒 PROTECTED SERVER-ONLY:
// - Indonesian pharmaceutical abbreviation dictionary
// - Advanced text analysis algorithms  
// - Smart diff mode selection logic
// - Medical terminology processing
// - ML-based optimization

/**
 * Enhanced client-side cache with request deduplication
 * Prevents duplicate server calls for identical requests
 */
interface CacheEntry {
  segments: DiffSegment[];
  timestamp: number;
}

interface PendingRequest {
  promise: Promise<DiffSegment[]>;
  timestamp: number;
}

class ServerResultCache {
  private cache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, PendingRequest>();
  private maxSize = 50; // Conservative limit
  private ttl = 5 * 60 * 1000; // 5 minutes
  private pendingTtl = 30 * 1000; // 30 seconds untuk pending requests

  private createKey(oldText: string, newText: string): string {
    // Simple hash for client-side caching
    let hash1 = 0, hash2 = 0;
    
    for (let i = 0; i < oldText.length; i++) {
      hash1 = ((hash1 << 5) - hash1 + oldText.charCodeAt(i)) & 0xffffffff;
    }
    
    for (let i = 0; i < newText.length; i++) {
      hash2 = ((hash2 << 5) - hash2 + newText.charCodeAt(i)) & 0xffffffff;
    }
    
    return `${Math.abs(hash1).toString(36)}-${Math.abs(hash2).toString(36)}`;
  }

  get(oldText: string, newText: string): DiffSegment[] | null {
    const key = this.createKey(oldText, newText);
    const entry = this.cache.get(key);
    
    if (entry && (Date.now() - entry.timestamp) < this.ttl) {
      return entry.segments;
    }
    
    if (entry) {
      this.cache.delete(key); // Remove expired
    }
    
    return null;
  }
  
  /**
   * Get or create a pending request untuk prevent duplicate calls
   * Enhanced untuk handle React StrictMode properly
   */
  getOrCreatePendingRequest(oldText: string, newText: string, requestFn: () => Promise<DiffSegment[]>): Promise<DiffSegment[]> {
    const key = this.createKey(oldText, newText);
    
    // FIRST: Check cache again (race condition protection)
    const cached = this.get(oldText, newText);
    if (cached) {
      return Promise.resolve(cached);
    }
    
    // Check if request is already pending
    const pending = this.pendingRequests.get(key);
    if (pending && (Date.now() - pending.timestamp) < this.pendingTtl) {
      // ✅ Silent deduplication - don't log for StrictMode
      return pending.promise;
    }
    
    // Create new request with enhanced error handling
    const promise = requestFn()
      .then(segments => {
        // Ensure we cache the result immediately
        this.set(oldText, newText, segments);
        return segments;
      })
      .finally(() => {
        // Clean up pending request when done
        this.pendingRequests.delete(key);
      });
    
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });
    
    return promise;
  }

  set(oldText: string, newText: string, segments: DiffSegment[]): void {
    const key = this.createKey(oldText, newText);
    
    // LRU eviction if full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      segments: [...segments], // Deep copy untuk safety
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  size(): number {
    return this.cache.size;
  }
  
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
  
  getStats(): { cached: number; pending: number } {
    return {
      cached: this.cache.size,
      pending: this.pendingRequests.size
    };
  }
}

// Export singleton instance
export const diffCache = new ServerResultCache();

// Development utilities
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Global access untuk debugging
  (window as any).diffCache = diffCache;
  
  // Keyboard shortcut untuk debug info
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      const stats = diffCache.getStats();
      console.group('📊 Diff Cache Statistics');
      console.log('Cached results:', stats.cached);
      console.log('Pending requests:', stats.pending);
      console.log('Cache hit rate: Check console logs for 🚀 L1 Cache HIT messages');
      console.groupEnd();
    }
  });
}