import type { Preset, SeedMovie, TMDBRawMovie } from './types';
import {
  resolveKeywordIds,
  queryDiscoverByKeywords,
  queryRecommendationsAndSimilar,
  queryDiscoverMovies,
  getTmdbApiKey,
} from './tmdb';
import { normalizeTitle } from './textUtils';
import { TMDB_GENRES, DISCOVERY_THRESHOLDS } from './constants';

export { normalizeTitle };

export interface WaterfallResult {
  candidates: TMDBRawMovie[];
  tiersReached: number[];
}

/**
 * Filter checks ensuring movie meets rating floor, release date, and preset criteria:
 * - vote_average >= 4.8
 * - release_date is not in the future
 * - language constraints (targetLanguageCodes if specified, else preset === 'foreign')
 * - 'cult': vote_count >= 35 && vote_count <= 1500
 * - 'all' / 'foreign': vote_count >= 35
 */
function passesFilters(
  movie: TMDBRawMovie,
  preset: Preset,
  targetLanguageCodes?: string[],
  seedHasAction?: boolean
): boolean {
  const rating = movie.vote_average ?? 0;
  if (rating < DISCOVERY_THRESHOLDS.MIN_VOTE_AVERAGE) return false;

  const count = movie.vote_count ?? 100;
  const lang = (movie.original_language || '').toLowerCase();
  const releaseDate = movie.release_date || '';

  // Exclude pure Action (28) or Adventure (12) blockbusters unless seed is action
  if (!seedHasAction && Array.isArray(movie.genre_ids)) {
    if (
      movie.genre_ids.includes(TMDB_GENRES.ACTION) ||
      movie.genre_ids.includes(TMDB_GENRES.ADVENTURE)
    ) {
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
    return (
      count >= DISCOVERY_THRESHOLDS.MIN_VOTE_COUNT &&
      count <= DISCOVERY_THRESHOLDS.CULT_MAX_VOTE_COUNT
    );
  }
  return count >= DISCOVERY_THRESHOLDS.MIN_VOTE_COUNT;
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

  // --- TIER 2: Broader Horror Discovery (gather ~30-50 candidates) ---
  if (candidateMap.size < DISCOVERY_THRESHOLDS.CANDIDATE_POOL_TARGET && apiKey) {
    tiersReached.push(2);
    try {
      const broaderMovies1 = await queryDiscoverMovies(preset, targetLanguageCodes, apiKey, 1);
      addMovies(broaderMovies1);
      if (candidateMap.size < DISCOVERY_THRESHOLDS.CANDIDATE_POOL_TARGET) {
        const broaderMovies2 = await queryDiscoverMovies(preset, targetLanguageCodes, apiKey, 2);
        addMovies(broaderMovies2);
      }
    } catch (e) {
      console.error('[Waterfall Tier 2] Failed:', e);
    }
  }

  // Gather ~30-50 horror/thriller candidates (cap at 50)
  const finalCandidates = Array.from(candidateMap.values()).slice(
    0,
    DISCOVERY_THRESHOLDS.MAX_CANDIDATE_POOL
  );

  return {
    candidates: finalCandidates,
    tiersReached,
  };
}
