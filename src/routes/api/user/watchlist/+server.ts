import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/auth';
import { db } from '$lib/db';
import { watchlists } from '$lib/schema';
import { eq, and } from 'drizzle-orm';
import type { WatchlistItem } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const item = (await request.json()) as WatchlistItem;
    if (!item || !item.id || !item.title) {
      return new Response(JSON.stringify({ error: 'Invalid movie payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db
      .insert(watchlists)
      .values({
        userId: auth.user.id,
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
      .onConflictDoUpdate({
        target: [watchlists.userId, watchlists.movieId],
        set: {
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
        },
      });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /api/user/watchlist POST] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update watchlist' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: RequestHandler = async ({ request, url }) => {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  const movieId = parseInt(url.searchParams.get('id') || '', 10);
  if (isNaN(movieId)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db
    .delete(watchlists)
    .where(and(eq(watchlists.userId, auth.user.id), eq(watchlists.movieId, movieId)));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
