import type { PageServerLoad } from './$types';
import { requireAuth } from '$lib/auth';
import { getUserLibrary } from '$lib/server/library';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ request, cookies, setHeaders, depends }) => {
  depends('app:auth');

  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });

  const authCheck = await requireAuth(request, cookies);
  if ('errorResponse' in authCheck) {
    throw redirect(302, '/?auth_error=' + encodeURIComponent('Authentication required to access your persistent archive.'));
  }

  const library = await getUserLibrary(authCheck.user.id);

  return {
    user: authCheck.user,
    watchlist: library.watchlist,
    seenList: library.seenList,
    recentSeeds: library.recentSeeds,
  };
};
