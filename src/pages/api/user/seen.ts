import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import type { SeenItem } from '../../../lib/types';

export const prerender = false;

// Add to seen (and remove from watchlist)
export const POST: APIRoute = async ({ request }) => {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const item = (await request.json()) as SeenItem;
    if (!item || !item.id || !item.title) {
      return new Response(JSON.stringify({ error: 'Invalid movie payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb();
    const userId = auth.user.id;

    // Insert into seen_movies
    db.prepare(`
      INSERT OR REPLACE INTO seen_movies (
        user_id, movie_id, title, year, rating, director, original_language, poster_url, added_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      item.id,
      item.title,
      item.year ?? null,
      item.rating ?? null,
      item.director ?? null,
      item.originalLanguage ?? null,
      item.posterUrl ?? null,
      Date.now()
    );

    // If it was in watchlist, remove it
    db.prepare('DELETE FROM watchlists WHERE user_id = ? AND movie_id = ?').run(userId, item.id);

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
  const auth = requireAuth(request);
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

    const db = getDb();
    db.prepare(`
      UPDATE seen_movies
      SET rating = ?
      WHERE user_id = ? AND movie_id = ?
    `).run(rating, auth.user.id, movieId);

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
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  const url = new URL(request.url);
  const movieId = parseInt(url.searchParams.get('id') || '', 10);
  if (isNaN(movieId)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDb();
  db.prepare('DELETE FROM seen_movies WHERE user_id = ? AND movie_id = ?').run(auth.user.id, movieId);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
