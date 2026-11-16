import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
  createdAt: integer('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_sessions_expires').on(table.expiresAt),
]);

export const watchlists = sqliteTable('watchlists', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  movieId: integer('movie_id').notNull(),
  title: text('title').notNull(),
  year: integer('year'),
  originalLanguage: text('original_language'),
  runtime: integer('runtime'),
  posterUrl: text('poster_url'),
  voteAverage: real('vote_average'),
  pitch: text('pitch'),
  catchWarning: text('catch_warning'),
  director: text('director'),
  addedAt: integer('added_at').notNull(),
}, (table) => [
  uniqueIndex('idx_watchlists_user_movie').on(table.userId, table.movieId),
  index('idx_watchlists_user').on(table.userId),
]);

export const seenMovies = sqliteTable('seen_movies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  movieId: integer('movie_id').notNull(),
  title: text('title').notNull(),
  year: integer('year'),
  rating: integer('rating'),
  director: text('director'),
  originalLanguage: text('original_language'),
  posterUrl: text('poster_url'),
  addedAt: integer('added_at').notNull(),
}, (table) => [
  uniqueIndex('idx_seen_user_movie').on(table.userId, table.movieId),
  index('idx_seen_user').on(table.userId),
]);

export const recentSeeds = sqliteTable('recent_seeds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  movieId: integer('movie_id').notNull(),
  title: text('title').notNull(),
  year: integer('year'),
  originalLanguage: text('original_language'),
  posterUrl: text('poster_url'),
  director: text('director'),
  sentence: text('sentence'),
  usedAt: integer('used_at').notNull(),
}, (table) => [
  uniqueIndex('idx_recent_seeds_user_movie').on(table.userId, table.movieId),
  index('idx_recent_seeds_user').on(table.userId),
]);

export const discoveryLogs = sqliteTable('discovery_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  seedMovieId: integer('seed_movie_id').notNull(),
  seedTitle: text('seed_title').notNull(),
  sentence: text('sentence').notNull(),
  preset: text('preset').notNull(),
  candidateCount: integer('candidate_count').notNull(),
  resultCount: integer('result_count').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('idx_discovery_logs_created').on(table.createdAt),
]);

export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
export type SessionSelect = typeof sessions.$inferSelect;
export type WatchlistSelect = typeof watchlists.$inferSelect;
export type SeenMovieSelect = typeof seenMovies.$inferSelect;
export type RecentSeedSelect = typeof recentSeeds.$inferSelect;
export type DiscoveryLogSelect = typeof discoveryLogs.$inferSelect;
