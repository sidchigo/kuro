import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import type { RecentSeedItem } from '../../../lib/types';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const auth = requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const item = (await request.json()) as RecentSeedItem;
    if (!item || !item.id || !item.title) {
      return new Response(JSON.stringify({ error: 'Invalid seed payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = getDb();
    db.prepare(`
      INSERT OR REPLACE INTO recent_seeds (
        user_id, movie_id, title, year, original_language, poster_url, director, sentence, used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      auth.user.id,
      item.id,
      item.title,
      item.year ?? null,
      item.originalLanguage ?? null,
      item.posterUrl ?? null,
      item.director ?? null,
      item.sentence ?? null,
      Date.now()
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /api/user/recent-seeds POST] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to record recent seed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
