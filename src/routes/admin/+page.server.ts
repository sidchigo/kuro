import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/auth';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ request, cookies, setHeaders, depends }) => {
  depends('app:auth');

  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });

  const adminCheck = await requireAdmin(request, cookies);
  if ('errorResponse' in adminCheck) {
    throw redirect(302, '/?auth_error=' + encodeURIComponent('Administrator access required. Please sign in with an admin account.'));
  }

  return {
    user: adminCheck.user,
  };
};
