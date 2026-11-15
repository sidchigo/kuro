import type { DiscoverRequest, DiscoverResponse, HorrorMatch } from './types';
import { fetchSeedMovieDetails, hydrateWinningMovies, TMDB_IMAGE_BASE } from './tmdb';
import { decomposeIntent, rerankCandidates } from './llm';
import { executeWaterfall, normalizeTitle } from './waterfall';

export async function processDiscovery(request: DiscoverRequest): Promise<DiscoverResponse> {
  const { movieId, sentence = '', preset = 'all', blacklist = [], blacklistTitles = [] } = request;

  // 1. Fetch seed movie details
  const seed = await fetchSeedMovieDetails(movieId);
  if (!seed) {
    return {
      matches: [],
      candidateCount: 0,
      fallbackReason: `Seed film ID ${movieId} not found in archive.`,
    };
  }

  // Stage 1: Seed Hydration & Intent Decomposition (LLM Call #1)
  const intent = await decomposeIntent(seed, sentence, preset);

  // Merge any explicit language codes from request or intent
  const targetLanguageCodes = request.targetLanguageCodes || intent.targetLanguageCodes;

  // Stage 2: Deterministic 3-Tier TMDB Waterfall
  const { candidates } = await executeWaterfall(
    seed,
    intent.tmdbKeywordTerms,
    preset,
    blacklist,
    targetLanguageCodes,
    undefined,
    blacklistTitles
  );

  if (candidates.length === 0) {
    return {
      matches: [],
      candidateCount: 0,
      fallbackReason: 'No horror candidates matched the filter constraints.',
    };
  }

  // Stage 3: Grounded Cross-Encoder Reranking (LLM Call #2)
  const rerankResult = await rerankCandidates(candidates, sentence, intent.avoidTropes, seed.title);

  // Find candidate objects for winning IDs
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const blacklistSet = new Set<number>([seed.id, ...blacklist]);
  const seedTitleNorm = normalizeTitle(seed.title);
  const blacklistTitleSet = new Set<string>(
    [seedTitleNorm, ...blacklistTitles.map(normalizeTitle)].filter(Boolean)
  );

  let winningMatches = rerankResult.matches.filter((m) => {
    const raw = candidateMap.get(m.id);
    if (!raw) return false;
    if (blacklistSet.has(m.id)) return false;
    const norm = normalizeTitle(raw.title);
    if (norm && blacklistTitleSet.has(norm)) return false;
    if (raw.original_title) {
      const origNorm = normalizeTitle(raw.original_title);
      if (origNorm && blacklistTitleSet.has(origNorm)) return false;
    }
    return true;
  });

  // If no matches survived validation, fallback to top candidates with overview-specific plots (NO mock template strings)
  if (winningMatches.length === 0) {
    const safeCandidates = candidates.filter((c) => {
      if (blacklistSet.has(c.id)) return false;
      const norm = normalizeTitle(c.title);
      if (norm && blacklistTitleSet.has(norm)) return false;
      if (c.original_title) {
        const origNorm = normalizeTitle(c.original_title);
        if (origNorm && blacklistTitleSet.has(origNorm)) return false;
      }
      return true;
    });

    winningMatches = safeCandidates.slice(0, 3).map((c) => {
      const sentences = (c.overview || '').split(/(?<=[.?!])\s+/);
      const plot = sentences.slice(0, 2).join(' ') || c.overview || 'a relentless supernatural occurrence';
      return {
        id: c.id,
        pitch: `${c.title} delves into ${plot.replace(/\.$/, '')}. It delivers an escalating, grounded dread centered on ritual and spiritual collapse.`,
        catchWarning: 'Deliberate, slow-burn pacing that demands patience before the dread surfaces.',
      };
    });
  }

  // Hydrate external_ids (imdb_id), runtime, and director in parallel
  const winningIds = winningMatches.map((m) => m.id);
  const hydrationMap = await hydrateWinningMovies(winningIds);

  const hydratedMatches: HorrorMatch[] = winningMatches.map((w) => {
    const raw = candidateMap.get(w.id)!;
    const extra = hydrationMap.get(w.id);
    const year = raw.release_date ? parseInt(raw.release_date.split('-')[0], 10) : 0;
    const posterPath = (extra?.posterPath !== undefined && extra?.posterPath !== null) ? extra.posterPath : (raw.poster_path ?? null);

    return {
      id: w.id,
      title: raw.title,
      year,
      originalLanguage: raw.original_language?.toUpperCase() || 'EN',
      runtime: extra?.runtime || raw.runtime || 95,
      voteAverage: Math.round((raw.vote_average ?? 7.0) * 10) / 10,
      posterPath,
      posterUrl: posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : undefined,
      director: extra?.director,
      pitch: w.pitch,
      catchWarning: w.catchWarning,
      imdbId: extra?.imdbId,
    };
  });

  return {
    matches: hydratedMatches,
    candidateCount: candidates.length,
    fallbackReason: rerankResult.fallbackReason,
  };
}
