/**
 * Kuro — Global Application Constants & Configuration
 * Centralized domain constants for TMDB queries, filtering thresholds,
 * runtime evaluations, score calibrations, and international language parsing.
 */

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const TMDB_GENRES = {
  HORROR: 27,
  ACTION: 28,
  ADVENTURE: 12,
} as const;

export const DISCOVERY_THRESHOLDS = {
  MIN_VOTE_AVERAGE: 4.8,
  MIN_VOTE_COUNT: 35,
  CULT_MAX_VOTE_COUNT: 1500,
  CANDIDATE_POOL_TARGET: 35,
  MAX_CANDIDATE_POOL: 50,
  WINNING_MATCHES_COUNT: 3,
  RANDOM_POOL_PAGE_LIMIT: 40,
  RANDOM_BATCH_COUNT: 15,
  RANDOM_MIN_VOTES: 50,
  RANDOM_MIN_RATING: 4.5,
  DEFAULT_SEARCH_LIMIT: 10,
} as const;

export const RUNTIME_THRESHOLDS = {
  SLOW_BURN_MIN: 135,
  BRISK_MAX: 85,
  DEFAULT_FALLBACK: 95,
  SEED_DEFAULT_FALLBACK: 90,
} as const;

export const CALIBRATION_THRESHOLDS = {
  RAW_SIMILARITY_FLOOR: 0.18,
  RAW_SIMILARITY_CEILING: 0.55,
  HIGH_SIMILARITY_CLAMP: 0.70,
  PERCENT_DISPLAY_MIN: 72,
  PERCENT_DISPLAY_BASE: 75,
  PERCENT_DISPLAY_MAX: 98,
  PERCENT_DISPLAY_TOP_CEILING: 99,
  CALIBRATION_SCALE: 22,
} as const;

export const VIBE_RESONANCE_WEIGHTS = {
  MOVIE_AFFINITY: 0.65,
  QUERY_AFFINITY: 0.35,
} as const;

export const CATCH_THRESHOLDS = {
  OBSCURE_VOTE_COUNT: 100,
  ACCLAIMED_RATING: 7.5,
} as const;

/**
 * Natural language demonym/country to ISO-639-1 code mapping for query intent extraction.
 * Covers international horror traditions (J-Horror, K-Horror, Southeast Asian, European, Latin American, Turkish, etc.)
 */
export const LANGUAGE_NAME_MAP: Record<string, string> = {
  // East & Southeast Asia
  korean: 'ko',
  korea: 'ko',
  japanese: 'ja',
  japan: 'ja',
  chinese: 'zh',
  china: 'zh',
  taiwanese: 'zh',
  taiwan: 'zh',
  cantonese: 'zh',
  hongkong: 'zh',
  thai: 'th',
  thailand: 'th',
  indonesian: 'id',
  indonesia: 'id',
  tagalog: 'tl',
  filipino: 'tl',
  philippines: 'tl',
  malay: 'ms',
  malaysia: 'ms',
  vietnamese: 'vi',
  vietnam: 'vi',

  // Europe & Americas
  spanish: 'es',
  spain: 'es',
  mexican: 'es',
  mexico: 'es',
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
  danish: 'da',
  denmark: 'da',
  finnish: 'fi',
  finland: 'fi',
  polish: 'pl',
  poland: 'pl',
  russian: 'ru',
  russia: 'ru',
  portuguese: 'pt',
  portugal: 'pt',
  brazilian: 'pt',
  brazil: 'pt',
  dutch: 'nl',
  netherlands: 'nl',
  greek: 'el',
  greece: 'el',
  czech: 'cs',
  hungarian: 'hu',

  // Middle East & South Asia
  turkish: 'tr',
  turkey: 'tr',
  hindi: 'hi',
  india: 'hi',
  indian: 'hi',
};

const displayNames =
  typeof Intl !== 'undefined' && Intl.DisplayNames
    ? new Intl.DisplayNames(['en'], { type: 'language' })
    : null;

/**
 * Resolves an ISO-639-1 language code to an English display name.
 * Uses standard ECMAScript Intl.DisplayNames with graceful fallback.
 */
export function getLanguageDisplayName(code?: string): string {
  const clean = (code || '').toLowerCase().trim();
  if (!clean || clean === 'en') return 'Atmospheric';
  try {
    return displayNames?.of(clean) || clean.toUpperCase();
  } catch {
    return clean.toUpperCase();
  }
}
