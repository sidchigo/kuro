import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/auth';
import { db } from '$lib/db';
import { watchlists, seenMovies, recentSeeds } from '$lib/schema';
import { getUserLibrary } from '$lib/server/library';

export const GET: RequestHandler = async ({ request }) => {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const library = await getUserLibrary(auth.user.id);

  return new Response(JSON.stringify(library), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};

export const POST: RequestHandler = async ({ request }) => {
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
