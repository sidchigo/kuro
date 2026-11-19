import { EMBEDDING_CONFIG } from './embeddingConfig';

/**
 * Fast, typed persistent vector caching layer for 256-dim Float32Array embeddings.
 * - Client / Web Worker Store: IndexedDB (movie_embeddings + vibe_anchors stores)
 * - Server / Node Fallback: Module-level bounded Map with LRU eviction
 */

export const CACHE_VERSION_TAG = EMBEDDING_CONFIG.cacheVersionTag;
export const DB_NAME = EMBEDDING_CONFIG.cacheDbName;
export const DB_VERSION = EMBEDDING_CONFIG.cacheDbVersion;
export const STORE_NAME = EMBEDDING_CONFIG.movieStoreName;
export const ANCHORS_STORE_NAME = EMBEDDING_CONFIG.anchorsStoreName;
export const MAX_CACHE_ENTRIES = EMBEDDING_CONFIG.maxCacheEntries;

export interface VectorCacheEntry {
  cacheKey: string;
  tmdbId: number;
  vector: Float32Array;
  updatedAt: number;
}

export interface AnchorCacheEntry {
  anchorId: string;
  vector: Float32Array;
}

export function buildCacheKey(tmdbId: number): string {
  return `${tmdbId}_${CACHE_VERSION_TAG}`;
}

// Module-level in-memory fallback for Node/SSR or environments without IndexedDB
const memoryStore = new Map<string, VectorCacheEntry>();
const memoryAnchorsStore = new Map<string, Float32Array>();

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

let idbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (idbPromise) return idbPromise;

  idbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      return reject(new Error('IndexedDB not supported in current environment.'));
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('tmdbId', 'tmdbId', { unique: false });
      }
      if (!db.objectStoreNames.contains(ANCHORS_STORE_NAME)) {
        db.createObjectStore(ANCHORS_STORE_NAME, { keyPath: 'anchorId' });
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
 */
export async function getMany(tmdbIds: number[]): Promise<Map<number, Float32Array>> {
  const result = new Map<number, Float32Array>();
  if (!tmdbIds || tmdbIds.length === 0) return result;

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
          const req = store.get(buildCacheKey(id));

          req.onsuccess = () => {
            const entry = req.result as VectorCacheEntry | undefined;
            if (entry?.vector) {
              const vec =
                entry.vector instanceof Float32Array
                  ? entry.vector
                  : new Float32Array(entry.vector);
              map.set(id, vec);
            }
            completed++;
            if (completed === total) resolve(map);
          };

          req.onerror = () => {
            completed++;
            if (completed === total) resolve(map);
          };
        }

        tx.onabort = () => resolve(map);
      });
    } catch (err) {
      console.warn('[VectorCache] IndexedDB read failed, falling back to memory store:', err);
    }
  }

  const now = Date.now();
  for (const id of tmdbIds) {
    const entry = memoryStore.get(buildCacheKey(id));
    if (entry) {
      entry.updatedAt = now;
      result.set(id, entry.vector);
    }
  }

  return result;
}

/**
 * Batched persistence of movie embedding vectors with LRU eviction.
 */
export async function setMany(
  entries: Array<{ tmdbId: number; vector: Float32Array }>
): Promise<void> {
  if (!entries || entries.length === 0) return;
  const now = Date.now();

  if (isIndexedDBAvailable()) {
    try {
      const db = await getIDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        for (const { tmdbId, vector } of entries) {
          store.put({
            cacheKey: buildCacheKey(tmdbId),
            tmdbId,
            vector,
            updatedAt: now,
          });
        }

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });

      cleanupIndexedDBLRU(db).catch(() => {});
      return;
    } catch (err) {
      console.warn('[VectorCache] IndexedDB write failed, falling back to memory store:', err);
    }
  }

  for (const { tmdbId, vector } of entries) {
    const key = buildCacheKey(tmdbId);
    memoryStore.set(key, {
      cacheKey: key,
      tmdbId,
      vector,
      updatedAt: now,
    });
  }

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
 * Reads all cached vibe anchor vectors (IndexedDB in browser/worker, memory fallback on server).
 */
export async function getVibeAnchors(): Promise<Map<string, Float32Array>> {
  const result = new Map<string, Float32Array>();

  if (isIndexedDBAvailable()) {
    try {
      const db = await getIDB();
      if (db.objectStoreNames.contains(ANCHORS_STORE_NAME)) {
        const loaded = await new Promise<AnchorCacheEntry[]>((resolve) => {
          const tx = db.transaction(ANCHORS_STORE_NAME, 'readonly');
          const store = tx.objectStore(ANCHORS_STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve((req.result as AnchorCacheEntry[]) || []);
          req.onerror = () => resolve([]);
        });

        for (const item of loaded) {
          if (item?.anchorId && item.vector) {
            const vec =
              item.vector instanceof Float32Array
                ? item.vector
                : new Float32Array(item.vector);
            result.set(item.anchorId, vec);
          }
        }
        return result;
      }
    } catch (err) {
      console.warn('[VectorCache] IndexedDB anchor read failed:', err);
    }
  }

  for (const [id, vec] of memoryAnchorsStore.entries()) {
    result.set(id, vec);
  }
  return result;
}

/**
 * Persists vibe anchor vectors to IndexedDB (or memory fallback).
 */
export async function setVibeAnchors(entries: AnchorCacheEntry[]): Promise<void> {
  if (!entries || entries.length === 0) return;

  if (isIndexedDBAvailable()) {
    try {
      const db = await getIDB();
      if (db.objectStoreNames.contains(ANCHORS_STORE_NAME)) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(ANCHORS_STORE_NAME, 'readwrite');
          const store = tx.objectStore(ANCHORS_STORE_NAME);
          for (const item of entries) {
            store.put(item);
          }
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error);
        });
        return;
      }
    } catch (err) {
      console.warn('[VectorCache] IndexedDB anchor write failed:', err);
    }
  }

  for (const { anchorId, vector } of entries) {
    memoryAnchorsStore.set(anchorId, vector);
  }
}

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
    const cursorReq = index.openCursor();

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

export async function clearCache(): Promise<void> {
  memoryStore.clear();
  memoryAnchorsStore.clear();
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
  getVibeAnchors,
  setVibeAnchors,
  getStats,
  clearCache,
  buildCacheKey,
};

export default vectorCache;
