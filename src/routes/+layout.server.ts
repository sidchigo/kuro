import type { LayoutServerLoad } from './$types';
import { authenticateRequest } from '$lib/auth';

export const load: LayoutServerLoad = async ({ request, cookies, depends }) => {
  depends('app:auth');
  const user = await authenticateRequest(request, cookies);
  return {
    user,
  };
};
