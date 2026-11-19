import type {
  Preset,
  SeedMovie,
  HorrorMatch,
  SeenItem,
  TMDBRawMovie,
} from '$lib/types';
import {
  isEmbeddingWorkerSupported,
  rankMoviesWithWorker,
} from '$lib/embeddingClient';
import { createPitch, createCatchWarning } from '$lib/matchFormatters';
import { TMDB_IMAGE_BASE } from '$lib/constants';
import { EMBEDDING_CONFIG } from '$lib/embeddingConfig';
import { normalizeTitle } from '$lib/textUtils';

export interface DiscoveryResult {
  matches: HorrorMatch[];
  candidateCount: number;
  fallbackReason?: string;
}

export interface RunDiscoveryParams {
  seed: SeedMovie;
  sentence: string;
  preset: Preset;
  seenList: SeenItem[];
}

function filterCandidates(
  rawCandidates: TMDBRawMovie[],
  seed: SeedMovie,
  blacklistIds: number[],
  blacklistTitles: string[]
): TMDBRawMovie[] {
  const blacklistSet = new Set<number>([seed.id, ...blacklistIds]);
  const blacklistTitleSet = new Set<string>(
    [normalizeTitle(seed.title), ...blacklistTitles.map(normalizeTitle)].filter(Boolean)
  );

  return rawCandidates.filter((c) => {
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
}

async function runWorkerPipeline(
  seed: SeedMovie,
  trimmedSentence: string,
  preset: Preset,
  blacklistIds: number[],
  blacklistTitles: string[]
): Promise<DiscoveryResult | null> {
  const candidatesRes = await fetch('/api/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      movieId: seed.id,
      sentence: trimmedSentence,
      preset,
      blacklist: blacklistIds,
      blacklistTitles,
      mode: 'candidates',
    }),
  });

  if (!candidatesRes.ok) {
    return null;
  }

  const data = await candidatesRes.json();
  const rawCandidates = (data.candidates || []) as TMDBRawMovie[];
  const filteredCandidates = filterCandidates(
    rawCandidates,
    seed,
    blacklistIds,
    blacklistTitles
  );

  if (filteredCandidates.length === 0) {
    return {
      matches: [],
      candidateCount: data.candidateCount || 0,
      fallbackReason:
        data.fallbackReason || 'No horror candidates matched the filter constraints.',
    };
  }

  const queryText = trimmedSentence || `${seed.title}. ${seed.overview || ''}`;
  const rankResult = await rankMoviesWithWorker(queryText, filteredCandidates);

  const passingIds = rankResult.rankedIds.filter(
    (id) => (rankResult.scores[id] ?? 0) >= EMBEDDING_CONFIG.minSimilarityThreshold
  );
  const winningIds = (
    passingIds.length > 0 ? passingIds : rankResult.rankedIds
  ).slice(0, 3);

  let hydrationMap: Record<number, any> = {};
  try {
    const hydrateRes = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieId: seed.id,
        sentence: trimmedSentence,
        preset,
        mode: 'hydrate',
        winningIds,
        candidateCount: data.candidateCount || filteredCandidates.length,
      }),
    });
    if (hydrateRes.ok) {
      const hydrateData = await hydrateRes.json();
      hydrationMap = hydrateData.hydration || {};
    }
  } catch {
    // Graceful hydration fallback
  }

  const candidateMap = new Map(filteredCandidates.map((c) => [c.id, c]));
  const matches: HorrorMatch[] = winningIds.map((id) => {
    const raw = candidateMap.get(id)!;
    const extra = hydrationMap[id];
    const year = raw.release_date
      ? parseInt(raw.release_date.split('-')[0], 10)
      : 0;
    const posterPath =
      extra?.posterPath !== undefined && extra?.posterPath !== null
        ? extra.posterPath
        : (raw.poster_path ?? null);
    const runtime = extra?.runtime || raw.runtime || 95;

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
      similarity: rankResult.scores[id] ?? 0.5,
      explanation: rankResult.explanations?.[id],
      topThemes: rankResult.topThemes?.[id],
    };
  });

  return {
    matches,
    candidateCount: data.candidateCount || filteredCandidates.length,
  };
}

/**
 * Executes horror discovery: prefers client-side Web Worker EmbeddingGemma inference,
 * falling back transparently to the server discovery pipeline.
 */
export async function runDiscovery({
  seed,
  sentence,
  preset,
  seenList,
}: RunDiscoveryParams): Promise<DiscoveryResult> {
  const trimmedSentence = sentence.trim();
  const blacklistIds = seenList.map((s) => s.id);
  const blacklistTitles = seenList.map((s) => s.title);

  try {
    if (isEmbeddingWorkerSupported()) {
      try {
        const workerResult = await runWorkerPipeline(
          seed,
          trimmedSentence,
          preset,
          blacklistIds,
          blacklistTitles
        );
        if (workerResult) return workerResult;
      } catch (workerErr) {
        console.warn(
          '[discoveryClient] Web Worker ranking failed, falling back to server pipeline:',
          workerErr
        );
      }
    }

    const res = await fetch('/api/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        movieId: seed.id,
        sentence: trimmedSentence,
        preset,
        blacklist: blacklistIds,
        blacklistTitles,
        mode: 'full',
      }),
    });

    if (res.ok) {
      return (await res.json()) as DiscoveryResult;
    }

    return {
      matches: [],
      candidateCount: 0,
      fallbackReason: 'Failed to query discovery engine.',
    };
  } catch {
    return {
      matches: [],
      candidateCount: 0,
      fallbackReason: 'Network error communicating with horror discovery engine.',
    };
  }
}

export async function fetchSeedById(
  movieId: number,
  fallbackInfo?: Partial<SeedMovie>
): Promise<SeedMovie> {
  try {
    const res = await fetch(`/api/search?id=${movieId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.movie) {
        return data.movie as SeedMovie;
      }
    }
  } catch {
    // Fallback below
  }

  return {
    id: movieId,
    title: fallbackInfo?.title || 'Selected Horror Film',
    year: fallbackInfo?.year || 0,
    originalLanguage: fallbackInfo?.originalLanguage || 'EN',
    runtime: fallbackInfo?.runtime || 90,
    director: fallbackInfo?.director || 'Unknown',
    overview: fallbackInfo?.overview || '',
    posterUrl: fallbackInfo?.posterUrl,
    voteAverage: fallbackInfo?.voteAverage || 7.0,
    keywords: fallbackInfo?.keywords || ['horror'],
  };
}
