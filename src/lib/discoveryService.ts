import type { DiscoverRequest, DiscoverResponse, HorrorMatch, TMDBRawMovie, SeedMovie } from './types';
import { fetchSeedMovieDetails, hydrateWinningMovies, TMDB_IMAGE_BASE } from './tmdb';
import { executeWaterfall, normalizeTitle } from './waterfall';
import {
  formatUserQuery,
  formatMovieDocument,
  embedQuery,
  embedCandidateDocuments,
  dotProduct,
  getServerVibeAnchors,
} from './embeddings';
import { vectorCache } from './vectorCache';
import { EMBEDDING_CONFIG } from './embeddingConfig';
import { createPitch, createCatchWarning, generateDeterministicExplanation } from './matchFormatters';

export { createPitch, createCatchWarning };

const LANGUAGE_NAME_MAP: Record<string, string> = {
  indonesian: 'id',
  indonesia: 'id',
  thai: 'th',
  thailand: 'th',
  korean: 'ko',
  korea: 'ko',
  japanese: 'ja',
  japan: 'ja',
  spanish: 'es',
  spain: 'es',
  mexican: 'es',
  french: 'fr',
  france: 'fr',
  german: 'de',
  germany: 'de',
  italian: 'it',
  italy: 'it',
  swedish: 'sv',
  sweden: 'sv',
  norwegian: 'no',
  norway: 'no',
  tagalog: 'tl',
  filipino: 'tl',
};

function extractLanguageCodes(sentence: string, explicitCodes?: string[]): string[] | undefined {
  if (explicitCodes && explicitCodes.length > 0) return explicitCodes;
  const lower = sentence.toLowerCase();
  const codes: string[] = [];
  for (const [kw, code] of Object.entries(LANGUAGE_NAME_MAP)) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(lower) && !codes.includes(code)) {
      codes.push(code);
    }
  }
  return codes.length > 0 ? codes : undefined;
}

function extractKeywords(sentence: string, seed: SeedMovie): string[] {
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'about', 'just', 'movie', 'film',
    'like', 'want', 'more', 'some', 'into', 'what', 'stayed', 'have', 'been', 'were', 'when',
    'which', 'there', 'their', 'they', 'them', 'than', 'then', 'also', 'such', 'very', 'only',
  ]);
  const words = sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const seedKeywords = (seed.keywords || []).map((k) => k.toLowerCase());
  return Array.from(new Set([...words, ...seedKeywords])).slice(0, 5);
}

export async function getDiscoveryCandidates(request: DiscoverRequest): Promise<{
  seed: SeedMovie | null;
  candidates: TMDBRawMovie[];
  candidateCount: number;
  fallbackReason?: string;
}> {
  const { movieId, sentence = '', preset = 'all', blacklist = [], blacklistTitles = [] } = request;

  const seed = await fetchSeedMovieDetails(movieId);
  if (!seed) {
    return {
      seed: null,
      candidates: [],
      candidateCount: 0,
      fallbackReason: `Seed film ID ${movieId} not found in archive.`,
    };
  }

  const targetLanguageCodes = extractLanguageCodes(sentence, request.targetLanguageCodes);
  const keywordTerms = extractKeywords(sentence, seed);

  const { candidates } = await executeWaterfall(
    seed,
    keywordTerms,
    preset,
    blacklist,
    targetLanguageCodes,
    undefined,
    blacklistTitles
  );

  const blacklistSet = new Set<number>([seed.id, ...blacklist]);
  const seedTitleNorm = normalizeTitle(seed.title);
  const blacklistTitleSet = new Set<string>(
    [seedTitleNorm, ...(blacklistTitles || []).map(normalizeTitle)].filter(Boolean)
  );

  const eligibleCandidates = candidates.filter((c) => {
    if (blacklistSet.has(c.id)) return false;
    const norm = normalizeTitle(c.title);
    if (norm && blacklistTitleSet.has(norm)) return false;
    if (c.original_title) {
      const origNorm = normalizeTitle(c.original_title);
      if (origNorm && blacklistTitleSet.has(origNorm)) return false;
    }
    const rating = c.vote_average ?? 0;
    if (rating < 4.8) return false;
    const count = c.vote_count ?? 0;
    if (count < 35) return false;
    return true;
  });

  return {
    seed,
    candidates: eligibleCandidates,
    candidateCount: candidates.length,
    fallbackReason:
      eligibleCandidates.length === 0
        ? 'No horror candidates matched the filter constraints.'
        : undefined,
  };
}

export async function processDiscovery(request: DiscoverRequest): Promise<DiscoverResponse> {
  const { sentence = '' } = request;
  const candidateResult = await getDiscoveryCandidates(request);

  if (!candidateResult.seed || candidateResult.candidates.length === 0) {
    return {
      matches: [],
      candidateCount: candidateResult.candidateCount,
      fallbackReason: candidateResult.fallbackReason,
    };
  }

  const seed = candidateResult.seed;
  const eligibleCandidates = candidateResult.candidates;

  // Stage 3: EmbeddingGemma-300M Semantic Ranking with Persistent Vector Cache
  const userQuery = formatUserQuery(sentence, seed);
  const queryVector = await embedQuery(userQuery);

  // 1. Vector Cache Lookup: retrieve already-embedded movies in <5ms
  const eligibleIds = eligibleCandidates.map((c) => c.id);
  const cachedVectorsMap = await vectorCache.getMany(eligibleIds);

  const missCandidates: TMDBRawMovie[] = [];
  const vectorMap = new Map<number, Float32Array>();

  for (const candidate of eligibleCandidates) {
    const cached = cachedVectorsMap.get(candidate.id);
    if (cached) {
      vectorMap.set(candidate.id, cached);
    } else {
      missCandidates.push(candidate);
    }
  }

  // 2. Delta Inference: run EmbeddingGemma inference ONLY on cache-miss movies
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

    // Persist newly computed vectors in vectorCache
    await vectorCache.setMany(toCache);
  }

  // 3. Dot-Product Ranking against normalized 256-d query vector
  const scored = eligibleCandidates.map((movie) => {
    const movieVector = vectorMap.get(movie.id)!;
    const similarity = dotProduct(queryVector, movieVector);
    return {
      movie,
      similarity,
    };
  });

  // Sort descending by cosine similarity
  scored.sort((a, b) => b.similarity - a.similarity);

  // Filter out wildly off-vibe outliers with minimum similarity threshold
  const aboveThreshold = scored.filter(
    (s) => s.similarity >= EMBEDDING_CONFIG.minSimilarityThreshold
  );
  const winningScored = (aboveThreshold.length > 0 ? aboveThreshold : scored).slice(0, 3);

  // Hydrate external_ids (imdb_id), runtime, and director in parallel
  const winningIds = winningScored.map((s) => s.movie.id);
  const [hydrationMap, anchorsMap] = await Promise.all([
    hydrateWinningMovies(winningIds),
    getServerVibeAnchors(),
  ]);

  const hydratedMatches: HorrorMatch[] = winningScored.map(({ movie: raw, similarity }) => {
    const extra = hydrationMap.get(raw.id);
    const year = raw.release_date ? parseInt(raw.release_date.split('-')[0], 10) : 0;
    const posterPath =
      extra?.posterPath !== undefined && extra?.posterPath !== null
        ? extra.posterPath
        : raw.poster_path ?? null;
    const runtime = extra?.runtime || raw.runtime || 95;
    const movieVec = vectorMap.get(raw.id)!;
    const { explanation, topThemes } = generateDeterministicExplanation(
      raw,
      movieVec,
      queryVector,
      similarity,
      anchorsMap
    );

    return {
      id: raw.id,
      title: raw.title,
      year,
      originalLanguage: raw.original_language?.toUpperCase() || 'EN',
      runtime,
      voteAverage: Math.round((raw.vote_average ?? 7.0) * 10) / 10,
      posterPath,
      posterUrl: posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : undefined,
      director: extra?.director,
      pitch: createPitch(raw),
      catchWarning: createCatchWarning(raw, runtime),
      imdbId: extra?.imdbId,
      similarity: Math.round(similarity * 100) / 100,
      explanation,
      topThemes,
    };
  });

  return {
    matches: hydratedMatches,
    candidateCount: candidateResult.candidateCount,
  };
}
