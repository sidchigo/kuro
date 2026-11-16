import { pipeline } from '@huggingface/transformers';

export interface WorkerCandidate {
  id: number;
  title: string;
  overview?: string;
  original_language?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  keywords?: { keywords?: { id: number; name: string }[] };
  vote_average?: number;
  vote_count?: number;
}

export interface VibeAnchor {
  anchorId: string;
  theme: string;
  label: string;
  text: string;
}

export const HORROR_VIBE_ANCHORS: VibeAnchor[] = [
  {
    anchorId: 'folk_occult',
    theme: 'Folk ritual & occult dread',
    label: 'folk ritual & occult dread',
    text: 'folk ritual, pagan curse, shamanism, rural dread, and ancient sacrifice',
  },
  {
    anchorId: 'slow_burn',
    theme: 'Atmospheric slow-burn',
    label: 'atmospheric slow-burn tension',
    text: 'slow-burn atmospheric psychological tension and deliberate escalating dread',
  },
  {
    anchorId: 'possession_exorcism',
    theme: 'Demonic possession & ritual terror',
    label: 'demonic possession & religious terror',
    text: 'demonic possession, exorcism, evil spirit, and religious terror',
  },
  {
    anchorId: 'claustrophobic_survival',
    theme: 'Claustrophobic survival',
    label: 'claustrophobic survival',
    text: 'claustrophobic survival, trap, inescapable confinement, and relentless pursuit',
  },
  {
    anchorId: 'visceral_body_horror',
    theme: 'Visceral body horror',
    label: 'visceral body horror',
    text: 'visceral body horror, physical transformation, parasite, and biological mutation',
  },
  {
    anchorId: 'found_footage',
    theme: 'Found footage & analog horror',
    label: 'found footage & analog dread',
    text: 'found footage, mockumentary realism, lost video tapes, and analog horror',
  },
  {
    anchorId: 'grief_haunting',
    theme: 'Grief-driven haunting',
    label: 'grief-driven supernatural haunting',
    text: 'grief-driven supernatural haunting, familial bereavement, and generational ghost trauma',
  },
  {
    anchorId: 'cosmic_dread',
    theme: 'Cosmic dread & existential unknown',
    label: 'cosmic dread & existential unknown',
    text: 'cosmic dread, ancient incomprehensible entities, and existential unknown terror',
  },
  {
    anchorId: 'taboo_investigation',
    theme: 'Taboo mystery & spiral',
    label: 'taboo mystery & investigative spiral',
    text: 'taboo mystery, forbidden knowledge, urban legend, and investigative spiral into madness',
  },
  {
    anchorId: 'psychological_paranoia',
    theme: 'Psychological collapse',
    label: 'psychological paranoia & delirium',
    text: 'psychological paranoia, mental collapse, hallucinations, and unhinged reality',
  },
  {
    anchorId: 'slasher_stalker',
    theme: 'Slasher stalker & survival',
    label: 'masked stalker & brutal slasher violence',
    text: 'slasher stalking, masked killer, survival chase, and brutal gore',
  },
  {
    anchorId: 'monstrous_creature',
    theme: 'Creature feature & beast',
    label: 'monstrous creature & ancient evil',
    text: 'monstrous predator, cryptid creature feature, cave beast, and prehistoric terror',
  },
  {
    anchorId: 'witchcraft_coven',
    theme: 'Witchcraft & dark coven',
    label: 'witchcraft & sinister coven',
    text: 'witchcraft, sinister coven pacts, black magic rituals, and ancient sorcery',
  },
  {
    anchorId: 'isolation_quarantine',
    theme: 'Isolated quarantine dread',
    label: 'remote isolation & desolate dread',
    text: 'remote cabin isolation, frozen wilderness quarantine, and solitary confinement dread',
  },
];

const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const ORIGIN_LANG_MAP: Record<string, string> = {
  th: 'Thai',
  id: 'Indonesian',
  ko: 'Korean',
  ja: 'Japanese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  sv: 'Swedish',
  no: 'Norwegian',
  tl: 'Filipino',
  en: 'Atmospheric',
  zh: 'Chinese',
  pt: 'Portuguese',
  ru: 'Russian',
  pl: 'Polish',
};

const DB_NAME = 'kuro_vector_cache';
const STORE_NAME = 'movie_embeddings';
const ANCHORS_STORE_NAME = 'vibe_anchors';
const CACHE_VERSION_TAG = 'gemma300m_256d_v1';
const MAX_CACHE_ENTRIES = 2000;

function buildCacheKey(tmdbId: number): string {
  return `${tmdbId}_${CACHE_VERSION_TAG}`;
}

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in worker'));
    }
    const req = indexedDB.open(DB_NAME, 2);
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
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

async function getManyFromIDB(tmdbIds: number[]): Promise<Map<number, Float32Array>> {
  const map = new Map<number, Float32Array>();
  if (!tmdbIds || tmdbIds.length === 0) return map;
  try {
    const db = await getDB();
    return await new Promise<Map<number, Float32Array>>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      let completed = 0;
      const total = tmdbIds.length;

      for (const id of tmdbIds) {
        const key = buildCacheKey(id);
        const req = store.get(key);
        req.onsuccess = () => {
          const entry = req.result;
          if (entry && entry.vector) {
            const vec = entry.vector instanceof Float32Array ? entry.vector : new Float32Array(entry.vector);
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
    console.warn('[EmbeddingWorker] IndexedDB read failed:', err);
    return map;
  }
}

async function setManyToIDB(entries: Array<{ tmdbId: number; vector: Float32Array }>): Promise<void> {
  if (!entries || entries.length === 0) return;
  const now = Date.now();
  try {
    const db = await getDB();
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

    cleanupLRU(db).catch(() => {});
  } catch (err) {
    console.warn('[EmbeddingWorker] IndexedDB write failed:', err);
  }
}

async function cleanupLRU(db: IDBDatabase): Promise<void> {
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
    console.warn('[EmbeddingWorker] LRU cleanup failed:', err);
  }
}

function l2Normalize(v: number[] | Float32Array): Float32Array {
  const norm = Math.hypot(...v) || 1e-12;
  const normalized = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    normalized[i] = v[i] / norm;
  }
  return normalized;
}

function dotProduct(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

function formatMovieDocument(m: WorkerCandidate): string {
  let genresStr = '';
  if (m.genres && m.genres.length > 0) {
    genresStr = m.genres.map((g) => g.name).join(', ');
  } else if (m.genre_ids && m.genre_ids.length > 0) {
    genresStr = m.genre_ids
      .map((id) => TMDB_GENRE_MAP[id])
      .filter(Boolean)
      .join(', ');
  }
  if (!genresStr) {
    genresStr = 'Horror';
  }

  const origin = m.original_language ? m.original_language.toUpperCase() : 'UNKNOWN';

  let keywordsStr = '';
  if (m.keywords?.keywords && m.keywords.keywords.length > 0) {
    keywordsStr = m.keywords.keywords.map((k) => k.name).join(', ');
  }
  if (!keywordsStr) {
    keywordsStr = 'horror, psychological dread, supernatural';
  }

  const overview = (m.overview || '').trim() || 'No overview available.';

  return `title: ${m.title} | text: Genres: ${genresStr} | Origin: ${origin} | Keywords: ${keywordsStr} | Overview: ${overview}`;
}

let pipelinePromise: Promise<any> | null = null;

function getWorkerPipeline(): Promise<any> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const progressCallback = (progress: any) => {
      self.postMessage({ type: 'MODEL_PROGRESS', progress });
    };

    try {
      // Initialize with dtype: 'q8' (never fp16 for WebAssembly/WebGPU compatibility)
      return await pipeline('feature-extraction', 'onnx-community/embeddinggemma-300m-ONNX', {
        dtype: 'q8',
        device: 'auto',
        progress_callback: progressCallback,
      });
    } catch (err) {
      console.warn('[EmbeddingWorker] device: auto failed, falling back to wasm:', err);
      return await pipeline('feature-extraction', 'onnx-community/embeddinggemma-300m-ONNX', {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: progressCallback,
      });
    }
  })().catch((err) => {
    pipelinePromise = null;
    throw err;
  });

  return pipelinePromise;
}

let cachedAnchorsMap: Map<string, { anchor: VibeAnchor; vector: Float32Array }> | null = null;

/**
 * Ensures all 14 curated Horror Vibe Anchors are embedded as "title: none | text: ..."
 * and cached in IndexedDB.
 */
async function getOrComputeAnchors(pipe: any): Promise<Map<string, { anchor: VibeAnchor; vector: Float32Array }>> {
  if (cachedAnchorsMap && cachedAnchorsMap.size === HORROR_VIBE_ANCHORS.length) {
    return cachedAnchorsMap;
  }

  const map = new Map<string, { anchor: VibeAnchor; vector: Float32Array }>();
  let db: IDBDatabase | null = null;
  try {
    db = await getDB();
  } catch (err) {
    console.warn('[EmbeddingWorker] Failed to open IndexedDB for vibe anchors:', err);
  }

  // 1. Try reading pre-embedded anchors from IndexedDB
  if (db && db.objectStoreNames.contains(ANCHORS_STORE_NAME)) {
    try {
      const loaded = await new Promise<Array<{ anchorId: string; vector: Float32Array }>>((resolve) => {
        const tx = db!.transaction(ANCHORS_STORE_NAME, 'readonly');
        const store = tx.objectStore(ANCHORS_STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });

      if (loaded.length === HORROR_VIBE_ANCHORS.length) {
        for (const item of loaded) {
          const anchor = HORROR_VIBE_ANCHORS.find((a) => a.anchorId === item.anchorId);
          if (anchor && item.vector) {
            const vec = item.vector instanceof Float32Array ? item.vector : new Float32Array(item.vector);
            map.set(item.anchorId, { anchor, vector: vec });
          }
        }
        if (map.size === HORROR_VIBE_ANCHORS.length) {
          cachedAnchorsMap = map;
          return map;
        }
      }
    } catch {
      // Fall through to compute
    }
  }

  // 2. Pre-embed anchors once as "title: none | text: ..."
  const anchorTexts = HORROR_VIBE_ANCHORS.map((a) => `title: none | text: ${a.text}`);
  const out = await pipe(anchorTexts, { pooling: 'mean' });
  const data = out.data as Float32Array;

  const toPersist: Array<{ anchorId: string; vector: Float32Array }> = [];

  for (let i = 0; i < HORROR_VIBE_ANCHORS.length; i++) {
    const anchor = HORROR_VIBE_ANCHORS[i];
    const start = i * 768;
    const slice256 = Array.from(data.subarray(start, start + 256));
    const normalized = l2Normalize(slice256);
    map.set(anchor.anchorId, { anchor, vector: normalized });
    toPersist.push({ anchorId: anchor.anchorId, vector: normalized });
  }

  cachedAnchorsMap = map;

  // Persist to IndexedDB
  if (db && db.objectStoreNames.contains(ANCHORS_STORE_NAME)) {
    try {
      const tx = db.transaction(ANCHORS_STORE_NAME, 'readwrite');
      const store = tx.objectStore(ANCHORS_STORE_NAME);
      for (const item of toPersist) {
        store.put(item);
      }
    } catch (err) {
      console.warn('[EmbeddingWorker] Failed to persist vibe anchors:', err);
    }
  }

  return map;
}

/**
 * Deterministic explanation synthesis combining top 1-2 vibe anchor affinities
 * with TMDB origin country / language into:
 * "91% match • Thai folk ritual & occult dread • Atmospheric slow-burn"
 */
function generateDeterministicExplanation(
  movie: WorkerCandidate,
  movieVec: Float32Array,
  queryVec: Float32Array,
  similarity: number,
  anchorsMap: Map<string, { anchor: VibeAnchor; vector: Float32Array }>
): { explanation: string; topThemes: string[] } {
  const scoredAnchors: Array<{ anchor: VibeAnchor; score: number }> = [];

  for (const { anchor, vector: anchorVec } of anchorsMap.values()) {
    const movieAffinity = dotProduct(movieVec, anchorVec);
    const queryAffinity = dotProduct(queryVec, anchorVec);
    const resonance = movieAffinity * 0.65 + queryAffinity * 0.35;
    scoredAnchors.push({ anchor, score: resonance });
  }

  scoredAnchors.sort((a, b) => b.score - a.score);

  const top1 = scoredAnchors[0]?.anchor;
  const top2 = scoredAnchors[1]?.anchor;

  const langCode = (movie.original_language || '').toLowerCase();
  const originName = ORIGIN_LANG_MAP[langCode];
  const originPrefix = originName && langCode !== 'en' ? `${originName} ` : '';

  const pct = Math.round(similarity * 100);

  let explanation = '';
  if (top1 && top2 && top2.anchorId !== top1.anchorId) {
    explanation = `${pct}% match • ${originPrefix}${top1.label} • ${top2.theme}`;
  } else if (top1) {
    explanation = `${pct}% match • ${originPrefix}${top1.label}`;
  } else {
    explanation = `${pct}% match • Atmospheric dread`;
  }

  const topThemes = [top1?.theme, top2?.theme].filter(Boolean) as string[];

  return { explanation, topThemes };
}

self.onmessage = async (e: MessageEvent) => {
  const { type, requestId, queryText, candidates } = e.data || {};

  if (type === 'WARMUP') {
    try {
      const pipe = await getWorkerPipeline();
      // Pre-warm vibe anchors as well
      await getOrComputeAnchors(pipe);
      self.postMessage({ type: 'READY' });
    } catch (err: any) {
      self.postMessage({ type: 'ERROR', error: err?.message || 'Model initialization failed' });
    }
    return;
  }

  if (type === 'RANK_CANDIDATES') {
    try {
      const pipe = await getWorkerPipeline();
      const anchorsMap = await getOrComputeAnchors(pipe);

      // 1. Prefix and embed user query
      const queryPrefixed = `task: search result | query: ${(queryText || '').trim() || 'atmospheric psychological dread'}`;
      const qOut = await pipe(queryPrefixed, { pooling: 'mean' });
      const qData = qOut.data as Float32Array;
      const qVec = l2Normalize(Array.from(qData.subarray(0, 256)));

      // 2. Query IndexedDB for cached candidate vectors
      const candidateList: WorkerCandidate[] = candidates || [];
      const candidateIds = candidateList.map((c) => c.id);
      const cachedMap = await getManyFromIDB(candidateIds);

      const missCandidates: WorkerCandidate[] = [];
      const vectorMap = new Map<number, Float32Array>();

      for (const candidate of candidateList) {
        const cached = cachedMap.get(candidate.id);
        if (cached) {
          vectorMap.set(candidate.id, cached);
        } else {
          missCandidates.push(candidate);
        }
      }

      // 3. Compute 768-d mean-pooled embeddings only for cache-miss candidates
      if (missCandidates.length > 0) {
        const missDocTexts = missCandidates.map(formatMovieDocument);
        const newVectorsToCache: Array<{ tmdbId: number; vector: Float32Array }> = [];

        // Batch in chunks of 16 to keep memory bounded
        for (let i = 0; i < missDocTexts.length; i += 16) {
          const chunk = missDocTexts.slice(i, i + 16);
          const out = await pipe(chunk, { pooling: 'mean' });
          const data = out.data as Float32Array;

          for (let j = 0; j < chunk.length; j++) {
            const movie = missCandidates[i + j];
            const start = j * 768;
            const slice256 = Array.from(data.subarray(start, start + 256));
            const normalized = l2Normalize(slice256);
            vectorMap.set(movie.id, normalized);
            newVectorsToCache.push({ tmdbId: movie.id, vector: normalized });
          }
        }

        // Batch write new vectors to IndexedDB
        await setManyToIDB(newVectorsToCache);
      }

      // 4. Score all candidates via dot-product cosine similarity
      const scores: Record<number, number> = {};
      const explanations: Record<number, string> = {};
      const topThemesMap: Record<number, string[]> = {};

      const scored = candidateList.map((c) => {
        const vec = vectorMap.get(c.id)!;
        const score = dotProduct(qVec, vec);
        const rounded = Math.round(score * 100) / 100;
        scores[c.id] = rounded;

        const { explanation, topThemes } = generateDeterministicExplanation(
          c,
          vec,
          qVec,
          score,
          anchorsMap
        );
        explanations[c.id] = explanation;
        topThemesMap[c.id] = topThemes;

        return { id: c.id, score: rounded };
      });

      scored.sort((a, b) => b.score - a.score);
      const rankedIds = scored.map((s) => s.id);

      self.postMessage({
        type: 'RANK_RESULT',
        requestId,
        rankedIds,
        scores,
        explanations,
        topThemes: topThemesMap,
      });
    } catch (err: any) {
      console.error('[EmbeddingWorker] Ranking error:', err);
      self.postMessage({
        type: 'ERROR',
        requestId,
        error: err?.message || 'Candidate ranking failed',
      });
    }
    return;
  }
};
