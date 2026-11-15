import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import type { WatchlistItem } from '../../../lib/types';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const item = (await request.json()) as WatchlistItem;
    if (!item || !item.id || !item.title) {
      return new Response(JSON.stringify({ error: 'Invalid movie payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO watchlists (
        user_id, movie_id, title, year, original_language, runtime, poster_url,
        vote_average, pitch, catch_warning, director, added_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auth.user.id,
      item.id,
      item.title,
      item.year ?? null,
      item.originalLanguage ?? null,
      item.runtime ?? null,
      item.posterUrl ?? null,
      item.voteAverage ?? null,
      item.pitch ?? null,
      item.catchWarning ?? null,
      item.director ?? null,
      item.addedAt || Date.now()
    );

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
  db.prepare('DELETE FROM watchlists WHERE user_id = ? AND movie_id = ?').run(auth.user.id, movieId);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
