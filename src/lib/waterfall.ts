import type { Preset, SeedMovie, TMDBRawMovie } from './types';
import {
  resolveKeywordIds,
  queryDiscoverByKeywords,
  queryRecommendationsAndSimilar,
  queryDiscoverMovies,
  getTmdbApiKey,
} from './tmdb';

export interface WaterfallResult {
  candidates: TMDBRawMovie[];
  tiersReached: number[];
}

/**
 * Filter checks ensuring movie meets rating floor, release date, and preset criteria:
 * - vote_average >= 4.8
 * - release_date is not in the future
 * - language constraints (targetLanguageCodes if specified, else preset === 'foreign')
 * - 'cult': vote_count >= 30 && vote_count <= 1500
 * - 'all' / 'foreign': vote_count >= 30
 */
function passesFilters(
  movie: TMDBRawMovie,
  preset: Preset,
  targetLanguageCodes?: string[],
  seedHasAction?: boolean
): boolean {
  const rating = movie.vote_average ?? 0;
  if (rating < 4.8) return false;

  const count = movie.vote_count ?? 100;
  const lang = (movie.original_language || '').toLowerCase();
  const releaseDate = movie.release_date || '';

  // Exclude pure Action (28) or Adventure (12) blockbusters unless seed is action
  if (!seedHasAction && Array.isArray(movie.genre_ids)) {
    if (movie.genre_ids.includes(28) || movie.genre_ids.includes(12)) {
      return false;
    }
  }

  // Prevent unreleased/future titles
  const today = new Date().toISOString().split('T')[0];
  if (releaseDate && releaseDate > today) return false;

  // Language constraints: language-agnostic by default, unless preset === 'foreign' or targetLanguageCodes given
  if (targetLanguageCodes && targetLanguageCodes.length > 0) {
    const allowed = targetLanguageCodes.map((c) => c.toLowerCase());
    if (!allowed.includes(lang)) return false;
  } else if (preset === 'foreign') {
    if (lang === 'en') return false;
  }

  if (preset === 'cult') {
    return count >= 30 && count <= 1500;
  }
  return count >= 30;
}

export function normalizeTitle(t?: string | null): string {
  if (!t) return '';
  return t
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Executes Deterministic TMDB Waterfall
 * Language-agnostic discovery prioritising seed neighbors & keyword discovery.
 * Guarantees zero crashes and clean candidate pool.
 */
export async function executeWaterfall(
  seed: SeedMovie,
  keywordTerms: string[],
  preset: Preset,
  blacklist: number[],
  targetLanguageCodes?: string[],
  customKey?: string,
  blacklistTitles?: string[]
): Promise<WaterfallResult> {
  const candidateMap = new Map<number, TMDBRawMovie>();
  const tiersReached: number[] = [];

  const blacklistSet = new Set<number>([seed.id, ...blacklist]);
  const seedTitleNorm = normalizeTitle(seed.title);
  const blacklistTitleSet = new Set<string>(
    [seedTitleNorm, ...(blacklistTitles || []).map(normalizeTitle)].filter(Boolean)
  );
  const apiKey = getTmdbApiKey(customKey);
  const seedHasAction = (seed.genres || []).some((g) => g.toLowerCase().includes('action'));

  const isBlacklisted = (m: TMDBRawMovie): boolean => {
    if (!m || !m.id) return true;
    if (blacklistSet.has(m.id)) return true;
    const titleNorm = normalizeTitle(m.title);
    if (titleNorm && blacklistTitleSet.has(titleNorm)) return true;
    if (m.original_title) {
      const origNorm = normalizeTitle(m.original_title);
      if (origNorm && blacklistTitleSet.has(origNorm)) return true;
    }
    return false;
  };

  const addMovies = (movies: TMDBRawMovie[]) => {
    for (const m of movies) {
      if (isBlacklisted(m)) continue;
      if (passesFilters(m, preset, targetLanguageCodes, seedHasAction)) {
        if (!candidateMap.has(m.id)) {
          candidateMap.set(m.id, m);
        }
      }
    }
  };

  // --- TIER 1: Seed Neighbors + Keyword-based Discover (Language-Agnostic) ---
  tiersReached.push(1);
  if (apiKey) {
    try {
      const [seedNeighbors, keywordIds] = await Promise.all([
        queryRecommendationsAndSimilar(seed.id, preset, targetLanguageCodes, apiKey),
        keywordTerms.length > 0 ? resolveKeywordIds(keywordTerms, apiKey) : Promise.resolve([]),
      ]);

      addMovies(seedNeighbors);

      if (keywordIds.length > 0) {
        const keywordMovies = await queryDiscoverByKeywords(
          keywordIds,
          preset,
          targetLanguageCodes,
          apiKey
        );
        addMovies(keywordMovies);
      }
    } catch (e) {
      console.error('[Waterfall Tier 1] Failed:', e);
    }
  }

  // --- TIER 2: Broader Horror Discovery (Language-Agnostic, if < 5 candidates) ---
  if (candidateMap.size < 5 && apiKey) {
    tiersReached.push(2);
    try {
      const broaderMovies = await queryDiscoverMovies(preset, targetLanguageCodes, apiKey);
      addMovies(broaderMovies);
    } catch (e) {
      console.error('[Waterfall Tier 2] Failed:', e);
    }
  }

  // Cap final candidate array at 20 items
  const finalCandidates = Array.from(candidateMap.values()).slice(0, 20);

  return {
    candidates: finalCandidates,
    tiersReached,
  };
}
