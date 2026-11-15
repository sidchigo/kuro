import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import type { WatchlistItem, SeenItem, RecentSeedItem } from '../../../lib/types';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const userId = auth.user.id;
  const db = getDb();

  // Watchlist
  const watchlistRows = (db.prepare(`
    SELECT movie_id as id, title, year, original_language as originalLanguage,
           runtime, poster_url as posterUrl, vote_average as voteAverage,
           pitch, catch_warning as catchWarning, director, added_at as addedAt
    FROM watchlists
    WHERE user_id = ?
    ORDER BY added_at DESC
  `).all(userId) as unknown) as WatchlistItem[];

  // Seen list
  const seenRows = (db.prepare(`
    SELECT movie_id as id, title, year, rating, director,
           original_language as originalLanguage, poster_url as posterUrl
    FROM seen_movies
    WHERE user_id = ?
    ORDER BY added_at DESC
  `).all(userId) as unknown) as SeenItem[];

  // Recent seeds
  const recentRows = (db.prepare(`
    SELECT movie_id as id, title, year, original_language as originalLanguage,
           poster_url as posterUrl, director, sentence
    FROM recent_seeds
    WHERE user_id = ?
    ORDER BY used_at DESC
    LIMIT 5
  `).all(userId) as unknown) as RecentSeedItem[];

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

/**
 * Bulk sync local items into user account (e.g. upon login)
 */
export const POST: APIRoute = async ({ request }) => {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) {
    return auth.errorResponse;
  }

  const userId = auth.user.id;
  const db = getDb();

  try {
    const body = await request.json();
    const { watchlist = [], seenList = [], recentSeeds = [] } = body;

    // Insert watchlist items
    const insertWatchlist = db.prepare(`
      INSERT OR IGNORE INTO watchlists (user_id, movie_id, title, year, original_language, runtime, poster_url, vote_average, pitch, catch_warning, director, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of watchlist) {
      insertWatchlist.run(
        userId,
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
    }

    // Insert seen items
    const insertSeen = db.prepare(`
      INSERT OR IGNORE INTO seen_movies (user_id, movie_id, title, year, rating, director, original_language, poster_url, added_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of seenList) {
      insertSeen.run(
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
    }

    // Insert recent seeds
    const insertRecent = db.prepare(`
      INSERT OR REPLACE INTO recent_seeds (user_id, movie_id, title, year, original_language, poster_url, director, sentence, used_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of recentSeeds) {
      insertRecent.run(
        userId,
        item.id,
        item.title,
        item.year ?? null,
        item.originalLanguage ?? null,
        item.posterUrl ?? null,
        item.director ?? null,
        item.sentence ?? null,
        Date.now()
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[API /api/user/library POST] Error:', err);
    return new Response(JSON.stringify({ error: 'Sync failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
