import type { APIRoute } from 'astro';
import { fetchRandomHorrorMovie } from '../../lib/tmdb';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const customTmdbKey = request.headers.get('x-tmdb-key') || url.searchParams.get('tmdbKey') || undefined;

  try {
    const movie = await fetchRandomHorrorMovie(customTmdbKey);
    if (!movie) {
      return new Response(JSON.stringify({ error: 'Failed to discover random horror film', movie: null }), {
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
    return new Response(JSON.stringify({ error: 'Internal server error', movie: null }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
