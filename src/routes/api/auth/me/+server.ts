import type { RequestHandler } from './$types';
import { authenticateRequest } from '$lib/auth';

export const GET: RequestHandler = async ({ request, cookies }) => {
  const user = await authenticateRequest(request, cookies);
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
