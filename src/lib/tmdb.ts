import type { Preset, SeedMovie, MovieSearchResult, TMDBRawMovie } from './types';
import { TMDB_IMAGE_BASE } from './constants';
import { tmdbFetch } from './tmdbFetch';

export { TMDB_IMAGE_BASE };

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export function getTmdbApiKey(customKey?: string): string | undefined {
  if (typeof customKey === 'string' && customKey.trim().length > 5) {
    return customKey.trim();
  }
  return (
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.TMDB_API_KEY) ||
    (typeof process !== 'undefined' && process.env && process.env.TMDB_API_KEY) ||
    undefined
  );
}

/**
 * GET /api/search?q={query}
 * Searches TMDB for films matching the query.
 */
export async function searchTmdbMovies(query: string, customKey?: string): Promise<MovieSearchResult[]> {
  const apiKey = getTmdbApiKey(customKey);
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  if (!apiKey) {
    console.warn('[TMDB] TMDB_API_KEY is not configured.');
    return [];
  }

  try {
    const url = `${TMDB_BASE_URL}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
      trimmed
    )}&include_adult=false&language=en-US&page=1`;

    const data = await tmdbFetch<any>(url);
    const results = (data.results || []) as Array<{
      id: number;
      title: string;
      original_title?: string;
      release_date?: string;
      original_language: string;
      overview: string;
      poster_path?: string | null;
      vote_average: number;
      genre_ids?: number[];
    }>;

    return results
      .filter((m) => {
        // Kuro is strictly niche horror: require horror genre (27)
        if (!m.genre_ids || m.genre_ids.length === 0) return false;
        return m.genre_ids.includes(27);
      })
      .slice(0, 10)
      .map((m) => ({
        id: m.id,
        title: m.title,
        originalTitle: m.original_title !== m.title ? m.original_title : undefined,
        year: m.release_date ? parseInt(m.release_date.split('-')[0], 10) : undefined,
        originalLanguage: m.original_language?.toUpperCase() || 'EN',
        overview: m.overview || 'Synopsis unavailable.',
        posterUrl: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : undefined,
        voteAverage: Math.round(m.vote_average * 10) / 10,
      }));
  } catch (error) {
    console.error('[TMDB] Search failed:', error);
    return [];
  }
}

/**
 * Hydrates full seed movie details (runtime, director, keywords, imdb_id)
 * GET /api/search?id={movieId}
 */
export async function fetchSeedMovieDetails(movieId: number, customKey?: string): Promise<SeedMovie | null> {
  const apiKey = getTmdbApiKey(customKey);

  if (!apiKey) {
    console.warn('[TMDB] TMDB_API_KEY is not configured.');
    return null;
  }

  try {
    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${apiKey}&append_to_response=keywords,credits,external_ids&language=en-US`;
    const data: TMDBRawMovie = await tmdbFetch<TMDBRawMovie>(url);

    const director = data.credits?.crew?.find((c) => c.job === 'Director')?.name;
    const keywords = (data.keywords?.keywords || []).map((k) => k.name);
    const imdbId = data.external_ids?.imdb_id;

    return {
      id: data.id,
      title: data.title,
      originalTitle: data.original_title,
      year: data.release_date ? parseInt(data.release_date.split('-')[0], 10) : 0,
      originalLanguage: data.original_language?.toUpperCase() || 'EN',
      runtime: data.runtime || 90,
      director: director || 'Unknown',
      overview: data.overview || 'No synopsis recorded.',
      posterUrl: data.poster_path ? `${TMDB_IMAGE_BASE}${data.poster_path}` : undefined,
      voteAverage: Math.round(data.vote_average * 10) / 10,
      genres: (data.genres || []).map((g) => g.name),
      keywords: keywords.length > 0 ? keywords : ['horror', 'supernatural'],
      imdbId,
    };
  } catch (err) {
    console.error('[TMDB] Movie details fetch error:', err);
    return null;
  }
}

/**
 * Parallel lookup: resolve text terms to TMDB keyword IDs.
 */
export async function resolveKeywordIds(terms: string[], customKey?: string): Promise<number[]> {
  const apiKey = getTmdbApiKey(customKey);
  if (!apiKey || terms.length === 0) return [];

  const keywordIdSet = new Set<number>();

  await Promise.all(
    terms.slice(0, 5).map(async (term) => {
      try {
        const url = `${TMDB_BASE_URL}/search/keyword?api_key=${apiKey}&query=${encodeURIComponent(
          term.trim()
        )}&page=1`;
        const data = await tmdbFetch<any>(url);
        const results = (data.results || []) as Array<{ id: number; name: string }>;
        for (const item of results.slice(0, 2)) {
          keywordIdSet.add(item.id);
        }
      } catch {
        // Skip failed term
      }
    })
  );

  return Array.from(keywordIdSet);
}

/**
 * Helper to build discovery query parameters per preset
 */
export function getPresetQueryParams(
  preset: Preset,
  targetLanguageCodes?: string[]
): Record<string, string> {
  const params: Record<string, string> = {
    'vote_average.gte': '4.8',
  };

  if (targetLanguageCodes && targetLanguageCodes.length > 0) {
    params['with_original_language'] = targetLanguageCodes.join('|');
  } else if (preset === 'foreign') {
    params['without_original_language'] = 'en';
  }

  if (preset === 'cult') {
    params['vote_count.gte'] = '35';
    params['vote_count.lte'] = '1500';
  } else {
    params['vote_count.gte'] = '35';
  }

  // Prevent unreleased/future titles
  const today = new Date().toISOString().split('T')[0];
  params['primary_release_date.lte'] = today;

  return params;
}

/**
 * Query /discover/movie with with_genres=27, preset params, and with_keywords={id1|id2|id3}
 */
export async function queryDiscoverByKeywords(
  keywordIds: number[],
  preset: Preset,
  targetLanguageCodes?: string[],
  customKey?: string
): Promise<TMDBRawMovie[]> {
  const apiKey = getTmdbApiKey(customKey);
  if (!apiKey || keywordIds.length === 0) return [];

  try {
    const presetParams = getPresetQueryParams(preset, targetLanguageCodes);
    const url = new URL(`${TMDB_BASE_URL}/discover/movie`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('with_genres', '27'); // Horror
    url.searchParams.set('with_keywords', keywordIds.join('|')); // OR pipe logic
    url.searchParams.set('sort_by', 'popularity.desc');
    url.searchParams.set('include_adult', 'false');

    for (const [key, value] of Object.entries(presetParams)) {
      url.searchParams.set(key, value);
    }

    const data = await tmdbFetch<any>(url.toString());
    return (data.results || []) as TMDBRawMovie[];
  } catch (e) {
    console.error('[TMDB] Discover by keywords error:', e);
    return [];
  }
}

/**
 * Query /movie/{id}/recommendations and /movie/{id}/similar in parallel.
 * Filters strictly to horror genre (27) with vote_average >= 4.8.
 */
export async function queryRecommendationsAndSimilar(
  movieId: number,
  preset: Preset,
  targetLanguageCodes?: string[],
  customKey?: string
): Promise<TMDBRawMovie[]> {
  const apiKey = getTmdbApiKey(customKey);
  if (!apiKey) return [];

  const urls = [
    `${TMDB_BASE_URL}/movie/${movieId}/recommendations?api_key=${apiKey}&language=en-US&page=1`,
    `${TMDB_BASE_URL}/movie/${movieId}/similar?api_key=${apiKey}&language=en-US&page=1`,
  ];

  try {
    const responses = await Promise.all(
      urls.map((u) => tmdbFetch<any>(u).catch(() => ({ results: [] })))
    );

    const merged = new Map<number, TMDBRawMovie>();
    for (const json of responses) {
      const results = (json.results || []) as TMDBRawMovie[];
      for (const m of results) {
        if (!merged.has(m.id)) {
          merged.set(m.id, m);
        }
      }
    }

    return Array.from(merged.values()).filter((m) => {
      const genres = m.genre_ids || [];
      const isHorror = genres.includes(27);
      const passesRating = (m.vote_average ?? 0) >= 4.8;
      const count = m.vote_count ?? 0;
      const passesCount = preset === 'cult' ? count >= 35 && count <= 1500 : count >= 35;

      const lang = (m.original_language || '').toLowerCase();
      let passesLanguage = true;
      if (targetLanguageCodes && targetLanguageCodes.length > 0) {
        passesLanguage = targetLanguageCodes.map((c) => c.toLowerCase()).includes(lang);
      } else if (preset === 'foreign') {
        passesLanguage = lang !== 'en';
      }

      return isHorror && passesRating && passesCount && passesLanguage;
    });
  } catch (e) {
    console.error('[TMDB] Recommendations/similar fetch error:', e);
    return [];
  }
}

/**
 * Language-agnostic horror discovery querying /discover/movie with with_genres=27,
 * rating floor, and preset filters.
 */
export async function queryDiscoverMovies(
  preset: Preset,
  targetLanguageCodes?: string[],
  customKey?: string,
  page: number = 1
): Promise<TMDBRawMovie[]> {
  const apiKey = getTmdbApiKey(customKey);
  if (!apiKey) return [];

  try {
    const presetParams = getPresetQueryParams(preset, targetLanguageCodes);
    const url = new URL(`${TMDB_BASE_URL}/discover/movie`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('with_genres', '27');
    url.searchParams.set('sort_by', 'popularity.desc');
    url.searchParams.set('include_adult', 'false');
    url.searchParams.set('page', String(page));

    for (const [key, value] of Object.entries(presetParams)) {
      url.searchParams.set(key, value);
    }

    const data = await tmdbFetch<any>(url.toString());
    return (data.results || []) as TMDBRawMovie[];
  } catch (e) {
    console.error('[TMDB] Discover error:', e);
    return [];
  }
}

/**
 * Hydrates external_ids (imdb_id), runtime, director, and live poster_path for winning 1-3 movies in parallel
 */
export async function hydrateWinningMovies(
  movieIds: number[],
  customKey?: string
): Promise<Map<number, { runtime: number; imdbId?: string; director?: string; posterPath?: string | null }>> {
  const apiKey = getTmdbApiKey(customKey);
  const map = new Map<number, { runtime: number; imdbId?: string; director?: string; posterPath?: string | null }>();

  if (!apiKey || movieIds.length === 0) {
    for (const id of movieIds) {
      map.set(id, { runtime: 95, posterPath: null });
    }
    return map;
  }

  await Promise.all(
    movieIds.map(async (id) => {
      try {
        const data: TMDBRawMovie = await tmdbFetch<TMDBRawMovie>(
          `${TMDB_BASE_URL}/movie/${id}?api_key=${apiKey}&append_to_response=external_ids,credits&language=en-US`
        );
        const dir = data.credits?.crew?.find((c) => c.job === 'Director')?.name;
        map.set(id, {
          runtime: data.runtime || 95,
          imdbId: data.external_ids?.imdb_id,
          director: dir,
          posterPath: data.poster_path ?? null,
        });
      } catch {
        map.set(id, { runtime: 95, posterPath: null });
      }
    })
  );

  return map;
}
