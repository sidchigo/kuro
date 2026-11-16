import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { watchlists, seenMovies, recentSeeds } from '../../../lib/schema';
import { eq, desc } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const userId = auth.user.id;

  // Watchlist
  const watchlistRows = await db
    .select({
      id: watchlists.movieId,
      title: watchlists.title,
      year: watchlists.year,
      originalLanguage: watchlists.originalLanguage,
      runtime: watchlists.runtime,
      posterUrl: watchlists.posterUrl,
      voteAverage: watchlists.voteAverage,
      pitch: watchlists.pitch,
      catchWarning: watchlists.catchWarning,
      director: watchlists.director,
      addedAt: watchlists.addedAt,
    })
    .from(watchlists)
    .where(eq(watchlists.userId, userId))
    .orderBy(desc(watchlists.addedAt));

  // Seen list
  const seenRows = await db
    .select({
      id: seenMovies.movieId,
      title: seenMovies.title,
      year: seenMovies.year,
      rating: seenMovies.rating,
      director: seenMovies.director,
      originalLanguage: seenMovies.originalLanguage,
      posterUrl: seenMovies.posterUrl,
    })
    .from(seenMovies)
    .where(eq(seenMovies.userId, userId))
    .orderBy(desc(seenMovies.addedAt));

  // Recent seeds
  const recentRows = await db
    .select({
      id: recentSeeds.movieId,
      title: recentSeeds.title,
      year: recentSeeds.year,
      originalLanguage: recentSeeds.originalLanguage,
      posterUrl: recentSeeds.posterUrl,
      director: recentSeeds.director,
      sentence: recentSeeds.sentence,
    })
    .from(recentSeeds)
    .where(eq(recentSeeds.userId, userId))
    .orderBy(desc(recentSeeds.usedAt))
    .limit(5);

  return new Response(
    JSON.stringify({
      watchlist: watchlistRows,
      seenList: seenRows,
      recentSeeds: recentRows,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};

export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const userId = auth.user.id;

  try {
    const body = await request.json();
    const { watchlist = [], seenList = [], recentSeeds: recents = [] } = body;

    for (const item of watchlist) {
      await db
        .insert(watchlists)
        .values({
          userId,
          movieId: item.id,
          title: item.title,
          year: item.year ?? null,
          originalLanguage: item.originalLanguage ?? null,
          runtime: item.runtime ?? null,
          posterUrl: item.posterUrl ?? null,
          voteAverage: item.voteAverage ?? null,
          pitch: item.pitch ?? null,
          catchWarning: item.catchWarning ?? null,
          director: item.director ?? null,
          addedAt: item.addedAt || Date.now(),
        })
        .onConflictDoNothing();
    }

    for (const item of seenList) {
      await db
        .insert(seenMovies)
        .values({
          userId,
          movieId: item.id,
          title: item.title,
          year: item.year ?? null,
          rating: item.rating ?? null,
          director: item.director ?? null,
          originalLanguage: item.originalLanguage ?? null,
          posterUrl: item.posterUrl ?? null,
          addedAt: Date.now(),
        })
        .onConflictDoNothing();
    }

    for (const item of recents) {
      await db
        .insert(recentSeeds)
        .values({
          userId,
          movieId: item.id,
          title: item.title,
          year: item.year ?? null,
          originalLanguage: item.originalLanguage ?? null,
          posterUrl: item.posterUrl ?? null,
          director: item.director ?? null,
          sentence: item.sentence ?? null,
          usedAt: Date.now(),
        })
        .onConflictDoNothing();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /api/user/library] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to sync library' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
