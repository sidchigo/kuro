import { json, type RequestHandler } from '@sveltejs/kit';
import { getCookieToken, deleteSession, COOKIE_NAME, createClearCookieHeader } from '$lib/auth';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  const token = cookies.get(COOKIE_NAME) || getCookieToken(request);
  if (token) {
    try {
      await deleteSession(token);
    } catch {
      // Ignore database errors during session cleanup
    }
  }

  // Clear session cookie across all environments
  cookies.delete(COOKIE_NAME, { path: '/' });

  return json(
    { success: true },
    {
      headers: {
        'Set-Cookie': createClearCookieHeader(request, url),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
};
