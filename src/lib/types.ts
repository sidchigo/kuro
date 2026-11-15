export type Preset = 'all' | 'cult' | 'foreign';

export type Role = 'admin' | 'member';

export interface User {
  id: number;
  username: string;
  role: Role;
  createdAt: number;
}

export interface AdminUserView extends User {
  watchlistCount: number;
  seenCount: number;
  discoveryCount: number;
}

export interface DiscoveryLogItem {
  id: number;
  userId?: number;
  username?: string;
  seedMovieId: number;
  seedTitle: string;
  sentence: string;
  preset: Preset;
  candidateCount: number;
  resultCount: number;
  createdAt: number;
}

export interface AdminStats {
  totalUsers: number;
  totalDiscoveries: number;
  activeSessions: number;
}

export interface SeedMovie {
  id: number;
  title: string;
  originalTitle?: string;
  year: number;
  originalLanguage: string;
  runtime?: number;
  director?: string;
  overview: string;
  posterUrl?: string;
  voteAverage: number;
  genres?: string[];
  keywords: string[];
  imdbId?: string;
}

export interface MovieSearchResult {
  id: number;
  title: string;
  originalTitle?: string;
  year?: number;
  originalLanguage: string;
  overview: string;
  posterUrl?: string;
  voteAverage: number;
}

export interface DiscoverRequest {
  movieId: number;
  sentence: string;
  preset: Preset;
  blacklist: number[];
  blacklistTitles?: string[];
  targetLanguageCodes?: string[];
}

export interface HorrorMatch {
  id: number;
  title: string;
  year: number;
  originalLanguage: string;
  runtime: number;
  voteAverage: number;
  posterPath: string | null;
  posterUrl?: string;
  director?: string;
  pitch: string;
  catchWarning: string;
  imdbId?: string;
}

export interface DiscoverResponse {
  matches: HorrorMatch[];
  candidateCount: number;
  fallbackReason?: string;
}

export interface SeenItem {
  id: number;
  title: string;
  year?: number;
  rating?: number; // 1 to 5
  director?: string;
  originalLanguage?: string;
  posterUrl?: string;
}

export interface RecentSeedItem {
  id: number;
  title: string;
  year?: number;
  originalLanguage?: string;
  posterUrl?: string;
  director?: string;
  sentence?: string;
}

export interface WatchlistItem {
  id: number;
  title: string;
  year?: number;
  originalLanguage?: string;
  runtime?: number;
  posterUrl?: string;
  voteAverage?: number;
  pitch?: string;
  catchWarning?: string;
  director?: string;
  addedAt: number;
}

export interface TMDBRawMovie {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  original_language: string;
  overview: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  credits?: {
    cast?: Array<{ id: number; name: string }>;
    crew?: Array<{ id: number; name: string; job: string }>;
  };
  keywords?: {
    keywords?: Array<{ id: number; name: string }>;
  };
  external_ids?: {
    imdb_id?: string;
  };
}
