import { pipeline } from '@huggingface/transformers';
import type { TMDBRawMovie } from './types';
import { vectorCache } from './vectorCache';
import { HORROR_VIBE_ANCHORS, type VibeAnchor } from './matchFormatters';
import {
  EMBEDDING_CONFIG,
  l2Normalize,
  dotProduct,
  truncateAndNormalize,
  formatUserQuery,
  formatMovieDocument,
  formatAnchorDocument,
} from './embeddingConfig';

export { l2Normalize, dotProduct, formatUserQuery, formatMovieDocument };

// Module-level singleton promise ensuring weights download & initialize once across requests
let pipelinePromise: Promise<any> | null = null;

export function getFeatureExtractionPipeline(): Promise<any> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline('feature-extraction', EMBEDDING_CONFIG.modelId, {
      dtype: EMBEDDING_CONFIG.dtype,
    }).catch((err) => {
      pipelinePromise = null;
      console.error('[EmbeddingGemma] Failed to initialize model pipeline:', err);
      throw err;
    });
  }
  return pipelinePromise;
}

/**
 * Embeds a single query string into an L2-normalized 256-d Matryoshka vector.
 */
export async function embedQuery(queryText: string): Promise<Float32Array> {
  const extractor = await getFeatureExtractionPipeline();
  const output = await extractor(queryText, { pooling: EMBEDDING_CONFIG.pooling });
  return truncateAndNormalize(output.data as Float32Array, 0);
}

/**
 * Batch-embeds candidate documents in chunks to avoid memory spikes.
 */
export async function embedCandidateDocuments(
  documents: string[],
  chunkSize: number = EMBEDDING_CONFIG.batchChunkSize
): Promise<Float32Array[]> {
  if (documents.length === 0) return [];
  const extractor = await getFeatureExtractionPipeline();
  const allVectors: Float32Array[] = [];

  for (let i = 0; i < documents.length; i += chunkSize) {
    const chunk = documents.slice(i, i + chunkSize);
    const output = await extractor(chunk, { pooling: EMBEDDING_CONFIG.pooling });
    const data = output.data as Float32Array;
    for (let j = 0; j < chunk.length; j++) {
      allVectors.push(truncateAndNormalize(data, j));
    }
  }

  return allVectors;
}

let serverAnchorsMap: Map<string, { anchor: VibeAnchor; vector: Float32Array }> | null = null;

export async function getServerVibeAnchors(): Promise<
  Map<string, { anchor: VibeAnchor; vector: Float32Array }>
> {
  if (serverAnchorsMap && serverAnchorsMap.size === HORROR_VIBE_ANCHORS.length) {
    return serverAnchorsMap;
  }
  const extractor = await getFeatureExtractionPipeline();
  const anchorTexts = HORROR_VIBE_ANCHORS.map((a) => formatAnchorDocument(a.text));
  const out = await extractor(anchorTexts, { pooling: EMBEDDING_CONFIG.pooling });
  const data = out.data as Float32Array;

  const map = new Map<string, { anchor: VibeAnchor; vector: Float32Array }>();
  for (let i = 0; i < HORROR_VIBE_ANCHORS.length; i++) {
    const anchor = HORROR_VIBE_ANCHORS[i];
    map.set(anchor.anchorId, { anchor, vector: truncateAndNormalize(data, i) });
  }

  serverAnchorsMap = map;
  return map;
}

export interface SemanticMatchResult {
  movie: TMDBRawMovie;
  similarity: number;
}

/**
 * Semantic ranking of candidates against user query with persistent vector caching.
 */
export async function rankCandidatesSemantically(
  userQuery: string,
  candidates: TMDBRawMovie[],
  minSimilarityThreshold: number = EMBEDDING_CONFIG.minSimilarityThreshold
): Promise<SemanticMatchResult[]> {
  if (candidates.length === 0) return [];

  const queryVector = await embedQuery(userQuery);

  const candidateIds = candidates.map((c) => c.id);
  const cachedVectorsMap = await vectorCache.getMany(candidateIds);

  const missCandidates: TMDBRawMovie[] = [];
  const vectorMap = new Map<number, Float32Array>();

  for (const candidate of candidates) {
    const cached = cachedVectorsMap.get(candidate.id);
    if (cached) {
      vectorMap.set(candidate.id, cached);
    } else {
      missCandidates.push(candidate);
    }
  }

  if (missCandidates.length > 0) {
    const missDocTexts = missCandidates.map(formatMovieDocument);
    const computedMissVectors = await embedCandidateDocuments(missDocTexts);

    const toCache: Array<{ tmdbId: number; vector: Float32Array }> = [];
    for (let i = 0; i < missCandidates.length; i++) {
      const movie = missCandidates[i];
      const vec = computedMissVectors[i];
      vectorMap.set(movie.id, vec);
      toCache.push({ tmdbId: movie.id, vector: vec });
    }

    await vectorCache.setMany(toCache);
  }

  const scored: SemanticMatchResult[] = candidates.map((movie) => ({
    movie,
    similarity: dotProduct(queryVector, vectorMap.get(movie.id)!),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);

  const filtered = scored.filter((s) => s.similarity >= minSimilarityThreshold);
  return filtered.length > 0 ? filtered : scored.slice(0, 3);
}
