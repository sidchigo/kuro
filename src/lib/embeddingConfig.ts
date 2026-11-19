import type { SeedMovie } from './types';

export const EMBEDDING_CONFIG = {
  modelId: 'onnx-community/embeddinggemma-300m-ONNX',
  dtype: 'q8' as const,
  pooling: 'mean' as const,
  baseDimensions: 768,
  matryoshkaDimensions: 256,
  batchChunkSize: 16,
  minSimilarityThreshold: 0.22,
  defaultQueryFallback: 'atmospheric psychological dread and terror',
  cacheDbName: 'kuro_vector_cache',
  cacheDbVersion: 2,
  movieStoreName: 'movie_embeddings',
  anchorsStoreName: 'vibe_anchors',
  cacheVersionTag: 'gemma300m_256d_v1',
  maxCacheEntries: 2000,
} as const;

export const TMDB_GENRE_MAP: Record<number, string> = {
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

export interface EmbeddableMovie {
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

/**
 * L2-normalizes a vector so dot product equals exact cosine similarity.
 */
export function l2Normalize(v: ArrayLike<number>): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < v.length; i++) {
    sumSq += v[i] * v[i];
  }
  const norm = Math.sqrt(sumSq) || 1e-12;
  const normalized = new Float32Array(v.length);
  for (let i = 0; i < v.length; i++) {
    normalized[i] = v[i] / norm;
  }
  return normalized;
}

/**
 * Dot product of two L2-normalized vectors (= cosine similarity).
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
 * Slices a packed flat batch tensor (row index * baseDimensions) down to
 * Matryoshka dimensions and L2-normalizes the result.
 */
export function truncateAndNormalize(data: Float32Array, rowIndex = 0): Float32Array {
  const start = rowIndex * EMBEDDING_CONFIG.baseDimensions;
  const slice = data.subarray(start, start + EMBEDDING_CONFIG.matryoshkaDimensions);
  return l2Normalize(slice);
}

/**
 * EmbeddingGemma asymmetric query prefix.
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
  return `task: search result | query: ${EMBEDDING_CONFIG.defaultQueryFallback}`;
}

/**
 * EmbeddingGemma candidate document template.
 */
export function formatMovieDocument(movie: EmbeddableMovie): string {
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

  const origin = movie.original_language ? movie.original_language.toUpperCase() : 'UNKNOWN';

  let keywordsStr = '';
  if (movie.keywords?.keywords && movie.keywords.keywords.length > 0) {
    keywordsStr = movie.keywords.keywords.map((k) => k.name).join(', ');
  }
  if (!keywordsStr) {
    keywordsStr = 'horror, psychological dread, supernatural';
  }

  const overview = (movie.overview || '').trim() || 'No overview available.';

  return `title: ${movie.title} | text: Genres: ${genresStr} | Origin: ${origin} | Keywords: ${keywordsStr} | Overview: ${overview}`;
}

/**
 * EmbeddingGemma vibe anchor document template.
 */
export function formatAnchorDocument(text: string): string {
  return `title: none | text: ${text}`;
}
