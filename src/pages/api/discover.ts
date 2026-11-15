import type { APIRoute } from 'astro';
import { z } from 'zod';
import { processDiscovery } from '../../lib/discoveryService';
import { authenticateRequest } from '../../lib/auth';
import { getDb } from '../../lib/db';

export const prerender = false;

const DiscoverBodySchema = z.object({
  movieId: z.number({ required_error: 'movieId is required' }),
  sentence: z.string().default(''),
  preset: z.enum(['all', 'cult', 'foreign']).default('all'),
  blacklist: z.array(z.number()).default([]),
  blacklistTitles: z.array(z.string()).default([]),
  targetLanguageCodes: z.array(z.string()).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = authenticateRequest(request);

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

    const { movieId, sentence, preset, blacklist, blacklistTitles, targetLanguageCodes } = parseResult.data;

    const result = await processDiscovery({
      movieId,
      sentence,
      preset,
      blacklist,
      blacklistTitles,
      targetLanguageCodes,
    });

    // Record discovery telemetry in SQLite
    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO discovery_logs (
          user_id, seed_movie_id, seed_title, sentence, preset, candidate_count, result_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user ? user.id : null,
        movieId,
        result.matches[0]?.title || `Seed #${movieId}`,
        sentence,
        preset,
        result.candidateCount,
        result.matches.length,
        Date.now()
      );
    } catch (dbErr) {
      console.warn('[Telemetry] Failed to log discovery query:', dbErr);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[API /api/discover] Error:', error);
    return new Response(
      JSON.stringify({
        matches: [],
        candidateCount: 0,
        fallbackReason: error instanceof Error ? error.message : 'Discovery pipeline encountered an unexpected error.',
      }),
      {
        status: 200, // Never throw 500 per specification
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
