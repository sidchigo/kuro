import type { RequestHandler } from './$types';
import { z } from 'zod';
import { processDiscovery, getDiscoveryCandidates } from '$lib/discoveryService';
import { hydrateWinningMovies } from '$lib/tmdb';
import { authenticateRequest } from '$lib/auth';
import { db } from '$lib/db';
import { discoveryLogs } from '$lib/schema';

const DiscoverBodySchema = z.object({
  movieId: z.number().optional(),
  sentence: z.string().default(''),
  preset: z.enum(['all', 'cult', 'foreign']).default('all'),
  blacklist: z.array(z.number()).default([]),
  blacklistTitles: z.array(z.string()).default([]),
  targetLanguageCodes: z.array(z.string()).optional(),
  mode: z.enum(['full', 'candidates', 'hydrate']).default('full').optional(),
  winningIds: z.array(z.number()).optional(),
  candidateCount: z.number().optional(),
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = await authenticateRequest(request);

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          matches: [],
          candidateCount: 0,
          fallbackReason: 'Invalid JSON body payload.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const parseResult = DiscoverBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          matches: [],
          candidateCount: 0,
          fallbackReason: parseResult.error.issues.map((i) => i.message).join(', '),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const {
      movieId,
      sentence,
      preset,
      blacklist,
      blacklistTitles,
      targetLanguageCodes,
      mode = 'full',
      winningIds = [],
      candidateCount: clientCandidateCount,
    } = parseResult.data;

    // Mode 1: Candidates Only (for offloading inference to Web Worker)
    if (mode === 'candidates') {
      if (!movieId) {
        return new Response(
          JSON.stringify({ candidates: [], candidateCount: 0, fallbackReason: 'movieId is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const candidateData = await getDiscoveryCandidates({
        movieId,
        sentence,
        preset,
        blacklist,
        blacklistTitles,
        targetLanguageCodes,
      });

      return new Response(JSON.stringify(candidateData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mode 2: Hydrate Winning Matches
    if (mode === 'hydrate') {
      const hydrationMap = await hydrateWinningMovies(winningIds);
      const hydrationObj = Object.fromEntries(hydrationMap.entries());

      if (movieId) {
        try {
          await db.insert(discoveryLogs).values({
            userId: user ? user.id : null,
            seedMovieId: movieId,
            seedTitle: `Seed #${movieId}`,
            sentence,
            preset,
            candidateCount: clientCandidateCount || winningIds.length,
            resultCount: winningIds.length,
            createdAt: Date.now(),
          });
        } catch (dbErr) {
          console.warn('[Telemetry] Failed to log discovery query:', dbErr);
        }
      }

      return new Response(JSON.stringify({ hydration: hydrationObj }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Mode 3: Full Server Pipeline (Fallback)
    if (!movieId) {
      return new Response(
        JSON.stringify({ matches: [], candidateCount: 0, fallbackReason: 'movieId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await processDiscovery({
      movieId,
      sentence,
      preset,
      blacklist,
      blacklistTitles,
      targetLanguageCodes,
    });

    try {
      await db.insert(discoveryLogs).values({
        userId: user ? user.id : null,
        seedMovieId: movieId,
        seedTitle: result.matches[0]?.title || `Seed #${movieId}`,
        sentence,
        preset,
        candidateCount: result.candidateCount,
        resultCount: result.matches.length,
        createdAt: Date.now(),
      });
    } catch (dbErr) {
      console.warn('[Telemetry] Failed to log discovery query:', dbErr);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /api/discover] Error:', error);
    return new Response(
      JSON.stringify({
        matches: [],
        candidateCount: 0,
        fallbackReason:
          error instanceof Error ? error.message : 'Discovery pipeline encountered an unexpected error.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
