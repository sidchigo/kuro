import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as schema from './schema';
import { users } from './schema';
import { count } from 'drizzle-orm';

const isRemoteDb =
  typeof process.env.DATABASE_URL === 'string' &&
  (process.env.DATABASE_URL.startsWith('libsql://') ||
    process.env.DATABASE_URL.startsWith('http://') ||
    process.env.DATABASE_URL.startsWith('https://'));

let dbUrl: string = process.env.DATABASE_URL || '';

if (!isRemoteDb && !dbUrl) {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isServerless ? '/tmp' : path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[DB] Could not create local data directory:', err);
  }
  dbUrl = `file:${path.join(dataDir, 'kuro.db')}`;
}

const authToken = process.env.DATABASE_AUTH_TOKEN;

export const client = createClient({
  url: dbUrl,
  authToken,
});

export const db = drizzle(client, { schema });

let initPromise: Promise<void> | null = null;

export async function ensureDbInitialized() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Ensure tables and pragmas are created
    await client.executeMultiple(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS watchlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        movie_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        year INTEGER,
        original_language TEXT,
        runtime INTEGER,
        poster_url TEXT,
        vote_average REAL,
        pitch TEXT,
        catch_warning TEXT,
        director TEXT,
        added_at INTEGER NOT NULL,
        UNIQUE(user_id, movie_id)
      );
      CREATE TABLE IF NOT EXISTS seen_movies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        movie_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        year INTEGER,
        rating INTEGER,
        director TEXT,
        original_language TEXT,
        poster_url TEXT,
        added_at INTEGER NOT NULL,
        UNIQUE(user_id, movie_id)
      );
      CREATE TABLE IF NOT EXISTS recent_seeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        movie_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        year INTEGER,
        original_language TEXT,
        poster_url TEXT,
        director TEXT,
        sentence TEXT,
        used_at INTEGER NOT NULL,
        UNIQUE(user_id, movie_id)
      );
      CREATE TABLE IF NOT EXISTS discovery_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        seed_movie_id INTEGER NOT NULL,
        seed_title TEXT NOT NULL,
        sentence TEXT NOT NULL,
        preset TEXT NOT NULL,
        candidate_count INTEGER NOT NULL,
        result_count INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id);
      CREATE INDEX IF NOT EXISTS idx_seen_user ON seen_movies(user_id);
      CREATE INDEX IF NOT EXISTS idx_recent_seeds_user ON recent_seeds(user_id);
      CREATE INDEX IF NOT EXISTS idx_discovery_logs_created ON discovery_logs(created_at);
    `);

    // Seed default Admin if no users exist
    const userCount = await db.select({ value: count() }).from(users);
    if ((userCount[0]?.value ?? 0) === 0) {
      const initialPass = process.env.INITIAL_ADMIN_PASSWORD || 'kuroadmin123';
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(initialPass, salt, 64).toString('hex');
      const now = Date.now();

      await db.insert(users).values({
        username: 'admin',
        passwordHash: hash,
        salt,
        role: 'admin',
        createdAt: now,
      });

      console.log('[Kuro Drizzle ORM] Initial admin account initialized: username="admin"');
    }
  })();

  return initPromise;
}

// Automatically ensure DB initialization
ensureDbInitialized().catch((err) => {
  console.error('[Kuro Drizzle ORM] Initialization error:', err);
});
