import { pipeline } from '@huggingface/transformers';
import type { TMDBRawMovie, SeedMovie } from './types';
import { vectorCache } from './vectorCache';
import { HORROR_VIBE_ANCHORS, type VibeAnchor } from './matchFormatters';

// TMDB Genre Map for rich document representations
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

// Module-level singleton promise ensuring weights download & initialize once across requests
let pipelinePromise: Promise<any> | null = null;

export function getFeatureExtractionPipeline(): Promise<any> {
  if (!pipelinePromise) {
    pipelinePromise = pipeline('feature-extraction', 'onnx-community/embeddinggemma-300m-ONNX', {
      dtype: 'q8',
    }).catch((err) => {
      pipelinePromise = null; // Reset on failure so subsequent calls can retry
      console.error('[EmbeddingGemma] Failed to initialize model pipeline:', err);
      throw err;
    });
  }
  return pipelinePromise;
}

/**
 * Normalizes vector using L2 norm (v / Math.hypot(...v))
 * so dot-product equals exact cosine similarity.
 */
export function l2Normalize(v: number[] | Float32Array): Float32Array {
  const norm = Math.hypot(...v) || 1e-12;
  const normalized = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    normalized[i] = v[i] / norm;
  }
  return normalized;
}

/**
 * Dot product of two normalized vectors equals exact cosine similarity.
 */
export function dotProduct(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * Prepend EmbeddingGemma asymmetric query prefix:
 * "task: search result | query: " + user intent / mood query
 */
export function formatUserQuery(
  sentence: string,
  seed?: SeedMovie | { title: string; overview?: string; keywords?: string[] }
): string {
  const trimmed = (sentence || '').trim();
  if (trimmed) {
    return `task: search result | query: ${trimmed}`;
  }
  if (seed) {
    const seedDesc = [
      seed.title,
      seed.keywords && seed.keywords.length > 0 ? seed.keywords.slice(0, 3).join(', ') : '',
      seed.overview,
    ]
      .filter(Boolean)
      .join(' - ');
    return `task: search result | query: ${seedDesc}`;
  }
  return 'task: search result | query: atmospheric psychological dread and terror';
}

/**
 * Prepend EmbeddingGemma candidate document prefix:
 * "title: " + movie.title + " | text: " followed by structured summary:
 * Genres: ... | Origin: ... | Keywords: ... | Overview: ...
 */
export function formatMovieDocument(movie: TMDBRawMovie): string {
  // 1. Genres
  let genresStr = '';
  if (movie.genres && movie.genres.length > 0) {
    genresStr = movie.genres.map((g) => g.name).join(', ');
  } else if (movie.genre_ids && movie.genre_ids.length > 0) {
    genresStr = movie.genre_ids
      .map((id) => TMDB_GENRE_MAP[id])
      .filter(Boolean)
      .join(', ');
  }
  if (!genresStr) {
    genresStr = 'Horror';
  }

  // 2. Origin
  const origin = movie.original_language ? movie.original_language.toUpperCase() : 'UNKNOWN';

  // 3. Keywords
  let keywordsStr = '';
  if (movie.keywords?.keywords && movie.keywords.keywords.length > 0) {
    keywordsStr = movie.keywords.keywords.map((k) => k.name).join(', ');
  }
  if (!keywordsStr) {
    keywordsStr = 'horror, psychological dread, supernatural';
  }

  // 4. Overview
  const overview = (movie.overview || '').trim() || 'No overview available.';

  return `title: ${movie.title} | text: Genres: ${genresStr} | Origin: ${origin} | Keywords: ${keywordsStr} | Overview: ${overview}`;
}

/**
 * Embeds a single query string:
 * 1. Mean-pools 768-d tensor
 * 2. Slices to first 256 dimensions (Matryoshka truncation)
 * 3. Re-applies L2 normalization
 */
export async function embedQuery(queryText: string): Promise<Float32Array> {
  const extractor = await getFeatureExtractionPipeline();
  const output = await extractor(queryText, { pooling: 'mean' });
  const data = output.data as Float32Array;
  const slice256 = Array.from(data.subarray(0, 256));
  return l2Normalize(slice256);
}

/**
 * Batch-embeds candidate documents in chunks to avoid memory spikes:
 * 1. Mean-pools 768-d tensors
 * 2. Slices each to first 256 dimensions (Matryoshka truncation)
 * 3. Re-applies L2 normalization
 */
export async function embedCandidateDocuments(
  documents: string[],
  chunkSize = 16
): Promise<Float32Array[]> {
  if (documents.length === 0) return [];
  const extractor = await getFeatureExtractionPipeline();
  const allVectors: Float32Array[] = [];

  for (let i = 0; i < documents.length; i += chunkSize) {
    const chunk = documents.slice(i, i + chunkSize);
    const output = await extractor(chunk, { pooling: 'mean' });
    const data = output.data as Float32Array;
    for (let j = 0; j < chunk.length; j++) {
      const start = j * 768;
      const slice256 = Array.from(data.subarray(start, start + 256));
      allVectors.push(l2Normalize(slice256));
    }
  }

  return allVectors;
}

let serverAnchorsMap: Map<string, { anchor: VibeAnchor; vector: Float32Array }> | null = null;

export async function getServerVibeAnchors(): Promise<Map<string, { anchor: VibeAnchor; vector: Float32Array }>> {
  if (serverAnchorsMap && serverAnchorsMap.size === HORROR_VIBE_ANCHORS.length) {
    return serverAnchorsMap;
  }
  const extractor = await getFeatureExtractionPipeline();
  const anchorTexts = HORROR_VIBE_ANCHORS.map((a) => `title: none | text: ${a.text}`);
  const out = await extractor(anchorTexts, { pooling: 'mean' });
  const data = out.data as Float32Array;

  const map = new Map<string, { anchor: VibeAnchor; vector: Float32Array }>();
  for (let i = 0; i < HORROR_VIBE_ANCHORS.length; i++) {
    const anchor = HORROR_VIBE_ANCHORS[i];
    const start = i * 768;
    const slice256 = Array.from(data.subarray(start, start + 256));
    const normalized = l2Normalize(slice256);
    map.set(anchor.anchorId, { anchor, vector: normalized });
  }

  serverAnchorsMap = map;
  return map;
}

export interface SemanticMatchResult {
  movie: TMDBRawMovie;
  similarity: number;
}

/**
 * Semantic ranking of candidates against user query with persistent vector caching:
 * - Embeds prefixed user query
 * - Looks up candidate movie vectors in vectorCache (IndexedDB or memory fallback)
 * - Runs EmbeddingGemma inference ONLY on cache-miss movies
 * - Persists newly computed movie vectors to cache
 * - Ranks candidates by cosine similarity (dot product of 256-d vectors)
 * - Optionally filters candidates below minSimilarityThreshold
 */
export async function rankCandidatesSemantically(
  userQuery: string,
  candidates: TMDBRawMovie[],
  minSimilarityThreshold = 0.22
): Promise<SemanticMatchResult[]> {
  if (candidates.length === 0) return [];

  // 1. Embed query
  const queryVector = await embedQuery(userQuery);

  // 2. Query vector cache to retrieve already-embedded movies in <5ms
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

  // 3. Run EmbeddingGemma inference ONLY on cache-miss movies
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

    // Persist newly computed vectors
    await vectorCache.setMany(toCache);
  }

  // 4. Dot-Product Ranking against normalized 256-d query vector
  const scored: SemanticMatchResult[] = candidates.map((movie) => {
    const movieVector = vectorMap.get(movie.id)!;
    const similarity = dotProduct(queryVector, movieVector);
    return {
      movie,
      similarity,
    };
  });

  // Sort descending by similarity score
  scored.sort((a, b) => b.similarity - a.similarity);

  // Apply minimum similarity threshold to drop wildly off-vibe outliers
  const filtered = scored.filter((s) => s.similarity >= minSimilarityThreshold);

  // If no candidates meet threshold, keep top matches rather than returning empty
  return filtered.length > 0 ? filtered : scored.slice(0, 3);
}
