import type { WatchlistItem, SeenItem } from '$lib/types';

/**
 * Calculates deterministic taste score between a watchlist film and user's rated watched films.
 */
export function computeAffinityScore(item: WatchlistItem, seen: SeenItem[]): number {
  let score = 50;

  const ratedMovies = seen.filter(
    (s) => typeof s.rating === 'number' && (s.rating || 0) > 0
  );
  if (ratedMovies.length === 0) {
    return (item.voteAverage || 7.0) * 10;
  }

  const highRated = ratedMovies.filter((s) => (s.rating || 0) >= 4);
  const lowRated = ratedMovies.filter((s) => (s.rating || 0) <= 2);

  // 1. Director affinity
  if (item.director) {
    const itemDir = item.director.toLowerCase();
    const dirMatchHigh = highRated.find(
      (s) => s.director && s.director.toLowerCase() === itemDir
    );
    if (dirMatchHigh) score += 30;

    const dirMatchLow = lowRated.find(
      (s) => s.director && s.director.toLowerCase() === itemDir
    );
    if (dirMatchLow) score -= 25;
  }

  // 2. Language / Regional affinity
  if (item.originalLanguage) {
    const itemLang = item.originalLanguage.toLowerCase();
    const langMovies = ratedMovies.filter(
      (s) => s.originalLanguage && s.originalLanguage.toLowerCase() === itemLang
    );
    if (langMovies.length > 0) {
      const avgLangRating =
        langMovies.reduce((acc, curr) => acc + (curr.rating || 0), 0) /
        langMovies.length;
      if (avgLangRating >= 4.0) score += 20;
      else if (avgLangRating <= 2.5) score -= 15;
    }
  }

  return score;
}
