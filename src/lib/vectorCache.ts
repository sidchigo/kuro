/**
 * Fast, typed persistent vector caching layer for 256-dim Float32Array movie embeddings.
 * - Primary Client-Side Store: IndexedDB (database: kuro_vector_cache, store: movie_embeddings)
 * - Server-Side / Node Fallback: Module-level bounded Map (bounded to 2,000 entries with LRU eviction)
 * - Composite Key: ${tmdbId}_gemma300m_256d_v1
 */

export const CACHE_VERSION_TAG = 'gemma300m_256d_v1';
export const DB_NAME = 'kuro_vector_cache';
export const STORE_NAME = 'movie_embeddings';
export const MAX_CACHE_ENTRIES = 2000;

export interface VectorCacheEntry {
  cacheKey: string;
  tmdbId: number;
  vector: Float32Array;
  updatedAt: number;
}

export function buildCacheKey(tmdbId: number): string {
  return `${tmdbId}_${CACHE_VERSION_TAG}`;
}

// Module-level in-memory cache for serverless/Node or environments without IndexedDB
const memoryStore = new Map<string, VectorCacheEntry>();

function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

let idbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (idbPromise) return idbPromise;

  idbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB not supported in current environment.'));
    }

    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('tmdbId', 'tmdbId', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);

    req.onerror = () => {
      idbPromise = null;
      reject(req.error);
    };
  });

  return idbPromise;
}

/**
 * Batched retrieval of movie embedding vectors for given TMDB IDs.
 * Returns a Map from tmdbId to 256-d Float32Array.
 */
export async function getMany(tmdbIds: number[]): Promise<Map<number, Float32Array>> {
  const result = new Map<number, Float32Array>();
  if (!tmdbIds || tmdbIds.length === 0) return result;

  // 1. Try IndexedDB if in browser environment
  if (isIndexedDBAvailable()) {
    try {
      const db = await getIDB();
      return await new Promise<Map<number, Float32Array>>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const map = new Map<number, Float32Array>();

        let completed = 0;
        const total = tmdbIds.length;

        for (const id of tmdbIds) {
          const key = buildCacheKey(id);
          const req = store.get(key);

          req.onsuccess = () => {
            const entry = req.result as VectorCacheEntry | undefined;
            if (entry && entry.vector) {
              const vec = entry.vector instanceof Float32Array ? entry.vector : new Float32Array(entry.vector);
              map.set(id, vec);
            }
            completed++;
            if (completed === total) {
              resolve(map);
            }
          };

          req.onerror = () => {
            completed++;
            if (completed === total) {
              resolve(map);
            }
          };
        }

        tx.onabort = () => resolve(map);
      });
    } catch (err) {
      console.warn('[VectorCache] IndexedDB read failed, falling back to memory store:', err);
    }
  }

  // 2. Server-side / Memory fallback
  const now = Date.now();
  for (const id of tmdbIds) {
    const key = buildCacheKey(id);
    const entry = memoryStore.get(key);
    if (entry) {
      entry.updatedAt = now; // update for LRU
      result.set(id, entry.vector);
    }
  }

  return result;
}

/**
 * Batched persistence of movie embedding vectors.
 * Directly stores Float32Array without serialization overhead.
 * Enforces LRU eviction if entry count exceeds MAX_CACHE_ENTRIES (2,000).
 */
export async function setMany(
  entries: Array<{ tmdbId: number; vector: Float32Array }>
): Promise<void> {
  if (!entries || entries.length === 0) return;
  const now = Date.now();

  // 1. If IndexedDB available, persist in single readwrite transaction
  if (isIndexedDBAvailable()) {
    try {
      const db = await getIDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (const { tmdbId, vector } of entries) {
          const cacheKey = buildCacheKey(tmdbId);
          store.put({
            cacheKey,
            tmdbId,
            vector,
            updatedAt: now,
          });
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });

      // Async LRU cleanup if entry count exceeds MAX_CACHE_ENTRIES
      cleanupIndexedDBLRU(db).catch(() => {});
      return;
    } catch (err) {
      console.warn('[VectorCache] IndexedDB write failed, falling back to memory store:', err);
    }
  }

  // 2. Server-side / Memory fallback
  for (const { tmdbId, vector } of entries) {
    const key = buildCacheKey(tmdbId);
    memoryStore.set(key, {
      cacheKey: key,
      tmdbId,
      vector,
      updatedAt: now,
    });
  }

  // LRU eviction for in-memory store
  if (memoryStore.size > MAX_CACHE_ENTRIES) {
    const sorted = Array.from(memoryStore.entries()).sort(
      (a, b) => a[1].updatedAt - b[1].updatedAt
    );
    const deleteCount = memoryStore.size - MAX_CACHE_ENTRIES;
    for (let i = 0; i < deleteCount; i++) {
      memoryStore.delete(sorted[i][0]);
    }
  }
}

/**
 * Evicts oldest entries in IndexedDB when total exceeds MAX_CACHE_ENTRIES (2,000).
 */
async function cleanupIndexedDBLRU(db: IDBDatabase): Promise<void> {
  try {
    const count = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (count <= MAX_CACHE_ENTRIES) return;

    const toDeleteCount = count - MAX_CACHE_ENTRIES;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('updatedAt');

    let deleted = 0;
    const cursorReq = index.openCursor(); // iterates oldest first (ascending updatedAt)

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor && deleted < toDeleteCount) {
        cursor.delete();
        deleted++;
        cursor.continue();
      }
    };
  } catch (err) {
    console.warn('[VectorCache] LRU eviction error:', err);
  }
}

/**
 * Helper to get cache metrics / stats (useful for telemetry and testing)
 */
export async function getStats(): Promise<{ size: number; backend: 'indexedDB' | 'memory' }> {
  if (isIndexedDBAvailable()) {
    try {
      const db = await getIDB();
      const size = await new Promise<number>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return { size, backend: 'indexedDB' };
    } catch {
      // fallback
    }
  }
  return { size: memoryStore.size, backend: 'memory' };
}

/**
 * Helper to clear cache (for tests or debug)
 */
export async function clearCache(): Promise<void> {
  memoryStore.clear();
  if (isIndexedDBAvailable()) {
    try {
      const db = await getIDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch {
      // Ignore
    }
  }
}

export const vectorCache = {
  getMany,
  setMany,
  getStats,
  clearCache,
  buildCacheKey,
};

export default vectorCache;
