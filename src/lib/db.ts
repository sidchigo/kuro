import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as schema from './schema';
import { users, seenMovies, watchlists, recentSeeds } from './schema';
import { count } from 'drizzle-orm';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbUrl = process.env.DATABASE_URL || `file:${path.join(dataDir, 'kuro.db')}`;
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

      const inserted = await db.insert(users).values({
        username: 'admin',
        passwordHash: hash,
        salt,
        role: 'admin',
        createdAt: now,
      }).returning({ id: users.id });

      const adminId = inserted[0]?.id;
      if (adminId) {
        console.log('[Kuro Drizzle ORM] Initial admin account initialized: username="admin"');
        await seedAdminCuratedData(adminId);
      }
    }
  })();

  return initPromise;
}

// Automatically ensure DB initialization
ensureDbInitialized().catch((err) => {
  console.error('[Kuro Drizzle ORM] Initialization error:', err);
});

async function seedAdminCuratedData(adminId: number) {
  const now = Date.now();

  const seenMoviesList = [
    { movieId: 424121, title: 'Apostle', year: 2018, rating: 2, director: 'Gareth Evans', originalLanguage: 'en', posterUrl: null, userId: adminId, addedAt: now },
    { movieId: 4552, title: 'A Tale of Two Sisters', year: 2003, rating: 3, director: 'Kim Jee-woon', originalLanguage: 'ko', posterUrl: null, userId: adminId, addedAt: now },
    { movieId: 864386, title: 'Incantation', year: 2022, rating: 5, director: 'Kevin Ko', originalLanguage: 'zh', posterUrl: 'https://image.tmdb.org/t/p/w500/2DTiv6daWh74BCm5vdKwcLiGB8N.jpg', userId: adminId, addedAt: now },
    { movieId: 293670, title: 'The Wailing', year: 2016, rating: 5, director: 'Na Hong-jin', originalLanguage: 'ko', posterUrl: null, userId: adminId, addedAt: now },
    { movieId: 722780, title: 'The Medium', year: 2021, rating: 5, director: 'Banjong Pisanthanakun', originalLanguage: 'th', posterUrl: null, userId: adminId, addedAt: now },
    { movieId: 334175, title: 'Sijjin', year: 2014, rating: 4, director: 'Alper Mestçi', originalLanguage: 'tr', posterUrl: null, userId: adminId, addedAt: now },
    { movieId: 334394, title: 'Baskin', year: 2015, rating: 3, director: 'Can Evrenol', originalLanguage: 'tr', posterUrl: null, userId: adminId, addedAt: now },
    { movieId: 572468, title: 'Impetigore', year: 2019, rating: 3, director: 'Joko Anwar', originalLanguage: 'id', posterUrl: 'https://image.tmdb.org/t/p/w500/dku2KnAPALsi69MnvTV7cXrylWm.jpg', userId: adminId, addedAt: now },
    { movieId: 590593, title: 'The Queen of Black Magic', year: 2019, rating: 2, director: 'Kimo Stamboel', originalLanguage: 'id', posterUrl: 'https://image.tmdb.org/t/p/w500/tQOBVQjXiBGstCGYvzmgm97EkMF.jpg', userId: adminId, addedAt: now },
    { movieId: 493922, title: 'Hereditary', year: 2018, rating: 4, director: 'Ari Aster', originalLanguage: 'en', posterUrl: 'https://image.tmdb.org/t/p/w500/4GFPuL14eXi66V96xBWY73Y9PfR.jpg', userId: adminId, addedAt: now },
    { movieId: 1058063, title: 'Hell Torture', year: 2023, rating: 3, director: 'Anggy Umbara', originalLanguage: 'id', posterUrl: 'https://image.tmdb.org/t/p/w500/gt0zaEuYDgr5AbgHkLKmTfliBdd.jpg', userId: adminId, addedAt: now },
    { movieId: 1119527, title: 'Grave Torture', year: 2024, rating: 4, director: 'Joko Anwar', originalLanguage: 'id', posterUrl: 'https://image.tmdb.org/t/p/w500/sDaiRx3OWvCOo1vLoEpdedLeVzY.jpg', userId: adminId, addedAt: now },
  ];

  for (const m of seenMoviesList) {
    await db.insert(seenMovies).values(m).onConflictDoNothing();
  }

  const watchlistList = [
    {
      movieId: 409297,
      title: 'A Dark Song',
      year: 2016,
      originalLanguage: 'en',
      runtime: 100,
      posterUrl: 'https://image.tmdb.org/t/p/w500/fguce8M1bZnWjVkRWCFh9P3kt6A.jpg',
      director: 'Liam Gavin',
      pitch: 'A grieving woman and a damaged occultist undertake a dangerous, months-long ritual to contact the dead, confined to an isolated house. Its power lies in the psychological toll and escalating strangeness of the ritual itself, creating profound unease without relying on cheap scares.',
      userId: adminId,
      addedAt: now,
    }
  ];

  for (const w of watchlistList) {
    await db.insert(watchlists).values(w).onConflictDoNothing();
  }

  const recentSeedsList = [
    {
      movieId: 1119527,
      title: 'Grave Torture',
      year: 2024,
      originalLanguage: 'id',
      posterUrl: 'https://image.tmdb.org/t/p/w500/sDaiRx3OWvCOo1vLoEpdedLeVzY.jpg',
      director: 'Joko Anwar',
      sentence: 'A good islamic religious horror with nice visuals. I liked the way it uses religious concepts to depict the torture.',
      userId: adminId,
      usedAt: now,
    },
    {
      movieId: 1058063,
      title: 'Hell Torture',
      year: 2023,
      originalLanguage: 'id',
      posterUrl: 'https://image.tmdb.org/t/p/w500/gt0zaEuYDgr5AbgHkLKmTfliBdd.jpg',
      director: 'Anggy Umbara',
      sentence: null,
      userId: adminId,
      usedAt: now,
    },
    {
      movieId: 530385,
      title: 'Midsommar',
      year: 2019,
      originalLanguage: 'en',
      posterUrl: 'https://image.tmdb.org/t/p/w500/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg',
      director: 'Ari Aster',
      sentence: 'Really liked the beautiful visuals along with eerie and creepy rituals which creates the horror element without jump scares or dark visuals',
      userId: adminId,
      usedAt: now,
    },
    {
      movieId: 467012,
      title: "Satan's Slaves",
      year: 2017,
      originalLanguage: 'id',
      posterUrl: 'https://image.tmdb.org/t/p/w500/k16xOaI9x5fqepxVwBwUJAozsW8.jpg',
      director: 'Joko Anwar',
      sentence: 'Good islamic horror and atmospheric setting',
      userId: adminId,
      usedAt: now,
    },
    {
      movieId: 864370,
      title: 'Incantation',
      year: 2022,
      originalLanguage: 'zh',
      posterUrl: 'https://image.tmdb.org/t/p/w500/2DTiv6daWh74BCm5vdKwcLiGB8N.jpg',
      director: 'Kevin Ko',
      sentence: null,
      userId: adminId,
      usedAt: now,
    }
  ];

  for (const s of recentSeedsList) {
    await db.insert(recentSeeds).values(s).onConflictDoNothing();
  }
}
