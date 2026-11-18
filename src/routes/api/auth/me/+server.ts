import type { RequestHandler } from './$types';
import { authenticateRequest } from '$lib/auth';

export const GET: RequestHandler = async ({ request }) => {
  const user = await authenticateRequest(request);
  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
