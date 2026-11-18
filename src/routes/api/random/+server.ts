import type { RequestHandler } from './$types';
import { fetchRandomHorrorMovie, fetchRandomHorrorBatch } from '$lib/tmdb';

export const GET: RequestHandler = async ({ request, url }) => {
  const customTmdbKey = request.headers.get('x-tmdb-key') || url.searchParams.get('tmdbKey') || undefined;
  const isBatch = url.searchParams.get('batch') === 'true' || url.searchParams.has('count');
  const count = parseInt(url.searchParams.get('count') || '15', 10);

  try {
    if (isBatch) {
      const movies = await fetchRandomHorrorBatch(count, customTmdbKey);
      return new Response(JSON.stringify({ movies, count: movies.length }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    const movie = await fetchRandomHorrorMovie(customTmdbKey);
    if (!movie) {
      return new Response(JSON.stringify({ error: 'Failed to discover random horror film', movie: null, movies: [] }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ movie }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    console.error('[API /api/random] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', movie: null, movies: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
