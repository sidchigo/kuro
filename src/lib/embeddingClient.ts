import type { TMDBRawMovie } from './types';

export interface RankResult {
  rankedIds: number[];
  scores: Record<number, number>;
  explanations?: Record<number, string>;
  topThemes?: Record<number, string[]>;
}

export type ModelProgressCallback = (progress: any) => void;

interface PendingRequest {
  resolve: (value: RankResult) => void;
  reject: (reason?: any) => void;
  timer: ReturnType<typeof setTimeout>;
}

let workerInstance: Worker | null = null;
let warmupPromise: Promise<void> | null = null;
let isReady = false;

const pendingRequests = new Map<string, PendingRequest>();
const progressSubscribers = new Set<ModelProgressCallback>();

export function isEmbeddingWorkerSupported(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined';
}

export function subscribeModelProgress(callback: ModelProgressCallback): () => void {
  progressSubscribers.add(callback);
  return () => progressSubscribers.delete(callback);
}

function getWorker(): Worker | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('../workers/embedding.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerInstance.onmessage = (e: MessageEvent) => {
        const { type, requestId, rankedIds, scores, error, progress } = e.data || {};

        if (type === 'MODEL_PROGRESS') {
          for (const cb of progressSubscribers) {
            try {
              cb(progress);
            } catch {
              // ignore subscriber error
            }
          }
          return;
        }

        if (type === 'READY') {
          isReady = true;
          return;
        }

        if (type === 'RANK_RESULT' && requestId) {
          const req = pendingRequests.get(requestId);
          if (req) {
            clearTimeout(req.timer);
            pendingRequests.delete(requestId);
            req.resolve({
              rankedIds,
              scores,
              explanations: e.data.explanations,
              topThemes: e.data.topThemes,
            });
          }
          return;
        }

        if (type === 'ERROR') {
          if (requestId) {
            const req = pendingRequests.get(requestId);
            if (req) {
              clearTimeout(req.timer);
              pendingRequests.delete(requestId);
              req.reject(new Error(error || 'Worker operation failed'));
            }
          } else {
            console.error('[EmbeddingClient] Worker global error:', error);
          }
          return;
        }
      };

      workerInstance.onerror = (err) => {
        console.error('[EmbeddingClient] Worker error event:', err);
      };
    } catch (err) {
      console.error('[EmbeddingClient] Failed to instantiate Web Worker:', err);
      return null;
    }
  }

  return workerInstance;
}

/**
 * Triggers background warmup of EmbeddingGemma model inside the worker.
 * Returns a promise that resolves once the worker is ready.
 */
export function warmupEmbeddingWorker(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (isReady) return Promise.resolve();
  if (warmupPromise) return warmupPromise;

  const worker = getWorker();
  if (!worker) return Promise.resolve();

  warmupPromise = new Promise<void>((resolve) => {
    const checkInterval = setInterval(() => {
      if (isReady) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 60000);

    // Tell worker to warm up
    worker.postMessage({ type: 'WARMUP' });
  });

  return warmupPromise;
}

/**
 * Idle pre-warmer: Schedules warmupEmbeddingWorker() using requestIdleCallback
 * (with setTimeout fallback), avoiding contention with first paint or initial TMDB requests.
 */
export function scheduleIdleWarmup(): void {
  if (typeof window === 'undefined') return;

  const runWarmup = () => {
    warmupEmbeddingWorker().catch((err) => {
      console.warn('[EmbeddingClient] Idle warmup encountered an error:', err);
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runWarmup, { timeout: 800 });
  } else {
    setTimeout(runWarmup, 500);
  }
}

/**
 * Sends candidates to Web Worker for IndexedDB lookup, delta EmbeddingGemma inference,
 * 256-d Matryoshka truncation, and dot-product similarity ranking.
 */
export async function rankMoviesWithWorker(
  queryText: string,
  candidates: TMDBRawMovie[],
  timeoutMs = 45000
): Promise<RankResult> {
  const worker = getWorker();
  if (!worker) {
    throw new Error('Web Worker is not available in current environment');
  }

  // If warmup is in flight, await it
  if (warmupPromise) {
    await warmupPromise;
  }

  return new Promise<RankResult>((resolve, reject) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const timer = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error(`Worker ranking timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    pendingRequests.set(requestId, { resolve, reject, timer });

    worker.postMessage({
      type: 'RANK_CANDIDATES',
      requestId,
      queryText,
      candidates,
    });
  });
}
