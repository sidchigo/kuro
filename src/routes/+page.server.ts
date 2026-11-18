import type { PageServerLoad } from './$types';
import { authenticateRequest } from '$lib/auth';
import { getUserLibrary } from '$lib/server/library';

const BASE_RESPONSE = {
  user: null,
  watchlist: [],
  seenList: [],
  recentSeeds: [],
};

export const load: PageServerLoad = async ({ request }) => {
  try {
    const user = await authenticateRequest(request);
    if (!user) {
      return BASE_RESPONSE;
    }

    const library = await getUserLibrary(user.id);
    return {
      user,
      watchlist: library.watchlist,
      seenList: library.seenList,
      recentSeeds: library.recentSeeds,
    };
  } catch (err) {
    console.warn('[+page.server.ts] Initial session/library load failed:', err);
    return BASE_RESPONSE;
  }
};
