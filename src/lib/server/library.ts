import { db, ensureDbInitialized } from '$lib/db';
import { watchlists, seenMovies, recentSeeds } from '$lib/schema';
import { eq, desc } from 'drizzle-orm';
import type { WatchlistItem, SeenItem, RecentSeedItem } from '$lib/types';

export interface UserLibraryData {
  watchlist: WatchlistItem[];
  seenList: SeenItem[];
  recentSeeds: RecentSeedItem[];
}

export async function getUserLibrary(userId: number): Promise<UserLibraryData> {
  await ensureDbInitialized();

  const [watchlistRows, seenRows, recentRows] = await Promise.all([
    db
      .select({
        id: watchlists.movieId,
        title: watchlists.title,
        year: watchlists.year,
        originalLanguage: watchlists.originalLanguage,
        runtime: watchlists.runtime,
        posterUrl: watchlists.posterUrl,
        voteAverage: watchlists.voteAverage,
        pitch: watchlists.pitch,
        catchWarning: watchlists.catchWarning,
        director: watchlists.director,
        addedAt: watchlists.addedAt,
      })
      .from(watchlists)
      .where(eq(watchlists.userId, userId))
      .orderBy(desc(watchlists.addedAt)),

    db
      .select({
        id: seenMovies.movieId,
        title: seenMovies.title,
        year: seenMovies.year,
        rating: seenMovies.rating,
        director: seenMovies.director,
        originalLanguage: seenMovies.originalLanguage,
        posterUrl: seenMovies.posterUrl,
      })
      .from(seenMovies)
      .where(eq(seenMovies.userId, userId))
      .orderBy(desc(seenMovies.addedAt)),

    db
      .select({
        id: recentSeeds.movieId,
        title: recentSeeds.title,
        year: recentSeeds.year,
        originalLanguage: recentSeeds.originalLanguage,
        posterUrl: recentSeeds.posterUrl,
        director: recentSeeds.director,
        sentence: recentSeeds.sentence,
      })
      .from(recentSeeds)
      .where(eq(recentSeeds.userId, userId))
      .orderBy(desc(recentSeeds.usedAt))
      .limit(5),
  ]);

  return {
    watchlist: watchlistRows.map((row) => ({
      id: row.id,
      title: row.title,
      year: row.year ?? undefined,
      originalLanguage: row.originalLanguage ?? undefined,
      runtime: row.runtime ?? undefined,
      posterUrl: row.posterUrl ?? undefined,
      voteAverage: row.voteAverage ?? undefined,
      pitch: row.pitch ?? undefined,
      catchWarning: row.catchWarning ?? undefined,
      director: row.director ?? undefined,
      addedAt: row.addedAt,
    })),
    seenList: seenRows.map((row) => ({
      id: row.id,
      title: row.title,
      year: row.year ?? undefined,
      rating: row.rating ?? undefined,
      director: row.director ?? undefined,
      originalLanguage: row.originalLanguage ?? undefined,
      posterUrl: row.posterUrl ?? undefined,
    })),
    recentSeeds: recentRows.map((row) => ({
      id: row.id,
      title: row.title,
      year: row.year ?? undefined,
      originalLanguage: row.originalLanguage ?? undefined,
      posterUrl: row.posterUrl ?? undefined,
      director: row.director ?? undefined,
      sentence: row.sentence ?? undefined,
    })),
  };
}
