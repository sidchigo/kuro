import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/auth';
import { db } from '$lib/db';
import { recentSeeds } from '$lib/schema';
import type { RecentSeedItem } from '$lib/types';

export const POST: RequestHandler = async ({ request }) => {
  const auth = await requireAuth(request);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const item = (await request.json()) as RecentSeedItem;
    if (!item || !item.id || !item.title) {
      return new Response(JSON.stringify({ error: 'Invalid seed payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await db
      .insert(recentSeeds)
      .values({
        userId: auth.user.id,
        movieId: item.id,
        title: item.title,
        year: item.year ?? null,
        originalLanguage: item.originalLanguage ?? null,
        posterUrl: item.posterUrl ?? null,
        director: item.director ?? null,
        sentence: item.sentence ?? null,
        usedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: [recentSeeds.userId, recentSeeds.movieId],
        set: {
          title: item.title,
          year: item.year ?? null,
          originalLanguage: item.originalLanguage ?? null,
          posterUrl: item.posterUrl ?? null,
          director: item.director ?? null,
          sentence: item.sentence ?? null,
          usedAt: Date.now(),
        },
      });

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
