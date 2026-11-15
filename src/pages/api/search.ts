import type { APIRoute } from 'astro';
import { z } from 'zod';
import { searchTmdbMovies, fetchSeedMovieDetails } from '../../lib/tmdb';

export const prerender = false;

const SearchQuerySchema = z.object({
  q: z.string().optional(),
  id: z.string().optional(),
});

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const parseResult = SearchQuerySchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    id: url.searchParams.get('id') || undefined,
  });

  if (!parseResult.success) {
    return new Response(JSON.stringify({ error: 'Invalid search parameters', results: [] }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { q, id } = parseResult.data;
  const customTmdbKey = request.headers.get('x-tmdb-key') || url.searchParams.get('tmdbKey') || undefined;

  try {
    // If id query param is passed, hydrate seed film
    if (id) {
      const movieId = parseInt(id, 10);
      if (isNaN(movieId)) {
        return new Response(JSON.stringify({ error: 'Invalid movie ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const seedMovie = await fetchSeedMovieDetails(movieId, customTmdbKey);
      if (!seedMovie) {
        return new Response(JSON.stringify({ error: 'Film not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ movie: seedMovie }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Default: search horror title by query
    const query = q || '';
    const results = await searchTmdbMovies(query, customTmdbKey);

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('[API /api/search] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Search operation failed',
        results: [],
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
