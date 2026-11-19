import type { PageServerLoad } from './$types';
import { authenticateRequest } from '$lib/auth';
import { getUserLibrary } from '$lib/server/library';

const BASE_RESPONSE = {
  user: null,
  watchlist: [],
  seenList: [],
  recentSeeds: [],
  authError: null,
  initialSeedId: null,
  initialSentence: null,
};

export const load: PageServerLoad = async ({ request, cookies, url, setHeaders, depends }) => {
  depends('app:auth');

  setHeaders({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });

  const authError = url.searchParams.get('auth_error') || null;
  const seedParam = url.searchParams.get('seed');
  const initialSeedId = seedParam && !isNaN(Number(seedParam)) ? Number(seedParam) : null;
  const initialSentence = url.searchParams.get('sentence') || null;

  try {
    const user = await authenticateRequest(request, cookies);
    if (!user) {
      return {
        ...BASE_RESPONSE,
        authError,
        initialSeedId,
        initialSentence,
      };
    }

    const library = await getUserLibrary(user.id);
    return {
      user,
      watchlist: library.watchlist,
      seenList: library.seenList,
      recentSeeds: library.recentSeeds,
      authError,
      initialSeedId,
      initialSentence,
    };
  } catch (err) {
    console.warn('[+page.server.ts] Initial session/library load failed:', err);
    return {
      ...BASE_RESPONSE,
      authError,
      initialSeedId,
      initialSentence,
    };
  }
};
