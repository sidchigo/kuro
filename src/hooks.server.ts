import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  // Enforce zero caching on all HTML documents and SvelteKit route data payloads
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html') || event.url.pathname.includes('__data.json')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.delete('ETag');
  }

  return response;
};
