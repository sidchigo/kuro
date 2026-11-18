import type { RequestHandler } from './$types';
import { getCookieToken, deleteSession, COOKIE_NAME } from '$lib/auth';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  const token = getCookieToken(request);
  if (token) {
    await deleteSession(token);
  }

  const isHttps =
    url.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

  cookies.delete(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
