import type { APIRoute } from 'astro';
import { getCookieToken, deleteSession, createClearCookieHeader } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const token = getCookieToken(request);
  if (token) {
    deleteSession(token);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createClearCookieHeader(),
    },
  });
};
