import { pipeline } from '@huggingface/transformers';
import {
  EMBEDDING_CONFIG,
  dotProduct,
  truncateAndNormalize,
  formatUserQuery,
  formatMovieDocument,
  formatAnchorDocument,
  type EmbeddableMovie,
} from '../lib/embeddingConfig';
import {
  HORROR_VIBE_ANCHORS,
  calibrateMatchPercentage,
  generateDeterministicExplanation,
  type VibeAnchor,
} from '../lib/matchFormatters';
import { vectorCache } from '../lib/vectorCache';

export type WorkerCandidate = EmbeddableMovie;

let pipelinePromise: Promise<any> | null = null;

function getWorkerPipeline(): Promise<any> {
  if (pipelinePromise) return pipelinePromise;

  pipelinePromise = (async () => {
    const progressCallback = (progress: any) => {
      self.postMessage({ type: 'MODEL_PROGRESS', progress });
    };

    try {
      return await pipeline('feature-extraction', EMBEDDING_CONFIG.modelId, {
        dtype: EMBEDDING_CONFIG.dtype,
        device: 'auto',
        progress_callback: progressCallback,
      });
    } catch (err) {
      console.warn('[EmbeddingWorker] device: auto failed, falling back to wasm:', err);
      return await pipeline('feature-extraction', EMBEDDING_CONFIG.modelId, {
        dtype: EMBEDDING_CONFIG.dtype,
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
 * Ensures all curated Horror Vibe Anchors are embedded and cached in IndexedDB.
 */
async function getOrComputeAnchors(
  pipe: any
): Promise<Map<string, { anchor: VibeAnchor; vector: Float32Array }>> {
  if (cachedAnchorsMap && cachedAnchorsMap.size === HORROR_VIBE_ANCHORS.length) {
    return cachedAnchorsMap;
  }

  const map = new Map<string, { anchor: VibeAnchor; vector: Float32Array }>();

  // 1. Try reading pre-embedded anchors from vectorCache
  const persisted = await vectorCache.getVibeAnchors();
  if (persisted.size >= HORROR_VIBE_ANCHORS.length) {
    for (const anchor of HORROR_VIBE_ANCHORS) {
      const vec = persisted.get(anchor.anchorId);
      if (vec) {
        map.set(anchor.anchorId, { anchor, vector: vec });
      }
    }
    if (map.size === HORROR_VIBE_ANCHORS.length) {
      cachedAnchorsMap = map;
      return map;
    }
    map.clear();
  }

  // 2. Embed anchors once and persist
  const anchorTexts = HORROR_VIBE_ANCHORS.map((a) => formatAnchorDocument(a.text));
  const out = await pipe(anchorTexts, { pooling: EMBEDDING_CONFIG.pooling });
  const data = out.data as Float32Array;

  const toPersist: Array<{ anchorId: string; vector: Float32Array }> = [];
  for (let i = 0; i < HORROR_VIBE_ANCHORS.length; i++) {
    const anchor = HORROR_VIBE_ANCHORS[i];
    const normalized = truncateAndNormalize(data, i);
    map.set(anchor.anchorId, { anchor, vector: normalized });
    toPersist.push({ anchorId: anchor.anchorId, vector: normalized });
  }

  cachedAnchorsMap = map;
  await vectorCache.setVibeAnchors(toPersist);
  return map;
}

self.onmessage = async (e: MessageEvent) => {
  const { type, requestId, queryText, candidates } = e.data || {};

  if (type === 'WARMUP') {
    try {
      const pipe = await getWorkerPipeline();
      await getOrComputeAnchors(pipe);
      self.postMessage({ type: 'READY' });
    } catch (err: any) {
      self.postMessage({
        type: 'ERROR',
        error: err?.message || 'Model initialization failed',
      });
    }
    return;
  }

  if (type === 'RANK_CANDIDATES') {
    try {
      const pipe = await getWorkerPipeline();
      const anchorsMap = await getOrComputeAnchors(pipe);

      // 1. Prefix and embed user query
      const queryPrefixed = formatUserQuery(queryText || '');
      const qOut = await pipe(queryPrefixed, { pooling: EMBEDDING_CONFIG.pooling });
      const qVec = truncateAndNormalize(qOut.data as Float32Array, 0);

      // 2. Query cache for candidate vectors
      const candidateList: WorkerCandidate[] = candidates || [];
      const cachedMap = await vectorCache.getMany(candidateList.map((c) => c.id));

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

      // 3. Compute embeddings only for cache-miss candidates in bounded chunks
      if (missCandidates.length > 0) {
        const missDocTexts = missCandidates.map(formatMovieDocument);
        const newVectorsToCache: Array<{ tmdbId: number; vector: Float32Array }> = [];
        const chunkSize = EMBEDDING_CONFIG.batchChunkSize;

        for (let i = 0; i < missDocTexts.length; i += chunkSize) {
          const chunk = missDocTexts.slice(i, i + chunkSize);
          const out = await pipe(chunk, { pooling: EMBEDDING_CONFIG.pooling });
          const data = out.data as Float32Array;

          for (let j = 0; j < chunk.length; j++) {
            const movie = missCandidates[i + j];
            const normalized = truncateAndNormalize(data, j);
            vectorMap.set(movie.id, normalized);
            newVectorsToCache.push({ tmdbId: movie.id, vector: normalized });
          }
        }

        await vectorCache.setMany(newVectorsToCache);
      }

      // 4. Score candidates via dot-product cosine similarity
      const scores: Record<number, number> = {};
      const explanations: Record<number, string> = {};
      const topThemesMap: Record<number, string[]> = {};

      const scored = candidateList.map((c) => {
        const vec = vectorMap.get(c.id)!;
        const rawScore = dotProduct(qVec, vec);
        scores[c.id] = calibrateMatchPercentage(rawScore) / 100;

        const { explanation, topThemes } = generateDeterministicExplanation(
          c,
          vec,
          qVec,
          rawScore,
          anchorsMap
        );
        explanations[c.id] = explanation;
        topThemesMap[c.id] = topThemes;

        return { id: c.id, score: rawScore };
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
