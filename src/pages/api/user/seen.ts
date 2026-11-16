import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { seenMovies, watchlists } from '../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import type { SeenItem } from '../../../lib/types';

export const prerender = false;

// Add to seen (and remove from watchlist)
export const POST: APIRoute = async ({ request }) => {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const item = (await request.json()) as SeenItem;
    if (!item || !item.id || !item.title) {
      return new Response(JSON.stringify({ error: 'Invalid movie payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = auth.user.id;

    // Insert into seen_movies (or update if already exists)
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
      .onConflictDoUpdate({
        target: [seenMovies.userId, seenMovies.movieId],
        set: {
          title: item.title,
          year: item.year ?? null,
          rating: item.rating ?? null,
          director: item.director ?? null,
          originalLanguage: item.originalLanguage ?? null,
          posterUrl: item.posterUrl ?? null,
          addedAt: Date.now(),
        },
      });

    // If it was in watchlist, remove it
    await db
      .delete(watchlists)
      .where(and(eq(watchlists.userId, userId), eq(watchlists.movieId, item.id)));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /api/user/seen POST] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to record seen movie' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Update 1-5 star rating
export const PATCH: APIRoute = async ({ request }) => {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = await request.json();
    const movieId = typeof body.movieId === 'number' ? body.movieId : null;
    const rating = typeof body.rating === 'number' ? Math.max(1, Math.min(5, body.rating)) : null;

    if (!movieId) {
      return new Response(JSON.stringify({ error: 'Invalid movieId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db
      .update(seenMovies)
      .set({ rating })
      .where(and(eq(seenMovies.userId, auth.user.id), eq(seenMovies.movieId, movieId)));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /api/user/seen PATCH] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update rating' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Undo / delete from seen
export const DELETE: APIRoute = async ({ request }) => {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  const url = new URL(request.url);
  const movieId = parseInt(url.searchParams.get('id') || '', 10);
  if (isNaN(movieId)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db
    .delete(seenMovies)
    .where(and(eq(seenMovies.userId, auth.user.id), eq(seenMovies.movieId, movieId)));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
