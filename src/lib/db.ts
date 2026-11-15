import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

let dbInstance: DatabaseSync | null = null;

function hashInitialPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'kuro.db');
  const db = new DatabaseSync(dbPath);

  // Performance & Integrity Pragmas
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Schema Definitions
  db.exec(`
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
  const countRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (countRow.count === 0) {
    const initialPass = process.env.INITIAL_ADMIN_PASSWORD || 'kuroadmin123';
    const { hash, salt } = hashInitialPassword(initialPass);
    const now = Date.now();
    const result = db.prepare(`
      INSERT INTO users (username, password_hash, salt, role, created_at)
      VALUES (?, ?, ?, 'admin', ?)
    `).run('admin', hash, salt, now);
    const adminId = Number(result.lastInsertRowid);
    console.log('[Kuro RBAC] Initial admin account initialized: username="admin", password="' + initialPass + '"');
    seedAdminCuratedData(db, adminId);
  }

  dbInstance = db;
  return dbInstance;
}

function seedAdminCuratedData(db: DatabaseSync, adminId: number) {
  const now = Date.now();

  const seenMovies = [
    { id: 424121, title: 'Apostle', year: 2018, rating: 2, director: 'Gareth Evans', lang: 'en', poster: null },
    { id: 4552, title: 'A Tale of Two Sisters', year: 2003, rating: 3, director: 'Kim Jee-woon', lang: 'ko', poster: null },
    { id: 864386, title: 'Incantation', year: 2022, rating: 5, director: 'Kevin Ko', lang: 'zh', poster: 'https://image.tmdb.org/t/p/w500/2DTiv6daWh74BCm5vdKwcLiGB8N.jpg' },
    { id: 293670, title: 'The Wailing', year: 2016, rating: 5, director: 'Na Hong-jin', lang: 'ko', poster: null },
    { id: 722780, title: 'The Medium', year: 2021, rating: 5, director: 'Banjong Pisanthanakun', lang: 'th', poster: null },
    { id: 334175, title: 'Sijjin', year: 2014, rating: 4, director: 'Alper Mestçi', lang: 'tr', poster: null },
    { id: 334394, title: 'Baskin', year: 2015, rating: 3, director: 'Can Evrenol', lang: 'tr', poster: null },
    { id: 572468, title: 'Impetigore', year: 2019, rating: 3, director: 'Joko Anwar', lang: 'id', poster: 'https://image.tmdb.org/t/p/w500/dku2KnAPALsi69MnvTV7cXrylWm.jpg' },
    { id: 590593, title: 'The Queen of Black Magic', year: 2019, rating: 2, director: 'Kimo Stamboel', lang: 'id', poster: 'https://image.tmdb.org/t/p/w500/tQOBVQjXiBGstCGYvzmgm97EkMF.jpg' },
    { id: 493922, title: 'Hereditary', year: 2018, rating: 4, director: 'Ari Aster', lang: 'en', poster: 'https://image.tmdb.org/t/p/w500/4GFPuL14eXi66V96xBWY73Y9PfR.jpg' },
    { id: 1058063, title: 'Hell Torture', year: 2023, rating: 3, director: 'Anggy Umbara', lang: 'id', poster: 'https://image.tmdb.org/t/p/w500/gt0zaEuYDgr5AbgHkLKmTfliBdd.jpg' },
    { id: 1119527, title: 'Grave Torture', year: 2024, rating: 4, director: 'Joko Anwar', lang: 'id', poster: 'https://image.tmdb.org/t/p/w500/sDaiRx3OWvCOo1vLoEpdedLeVzY.jpg' },
  ];

  const insertSeen = db.prepare(`
    INSERT OR IGNORE INTO seen_movies (user_id, movie_id, title, year, rating, director, original_language, poster_url, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const m of seenMovies) {
    insertSeen.run(adminId, m.id, m.title, m.year, m.rating, m.director, m.lang, m.poster, now);
  }

  const watchlists = [
    {
      id: 409297,
      title: 'A Dark Song',
      year: 2016,
      lang: 'en',
      runtime: 100,
      poster: 'https://image.tmdb.org/t/p/w500/fguce8M1bZnWjVkRWCFh9P3kt6A.jpg',
      director: 'Liam Gavin',
      pitch: 'A grieving woman and a damaged occultist undertake a dangerous, months-long ritual to contact the dead, confined to an isolated house. Its power lies in the psychological toll and escalating strangeness of the ritual itself, creating profound unease without relying on cheap scares.'
    }
  ];

  const insertWatchlist = db.prepare(`
    INSERT OR IGNORE INTO watchlists (user_id, movie_id, title, year, original_language, runtime, poster_url, director, pitch, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const w of watchlists) {
    insertWatchlist.run(adminId, w.id, w.title, w.year, w.lang, w.runtime, w.poster, w.director, w.pitch, now);
  }

  const recentSeeds = [
    {
      id: 1119527,
      title: 'Grave Torture',
      year: 2024,
      lang: 'id',
      poster: 'https://image.tmdb.org/t/p/w500/sDaiRx3OWvCOo1vLoEpdedLeVzY.jpg',
      director: 'Joko Anwar',
      sentence: 'A good islamic religious horror with nice visuals. I liked the way it uses religious concepts to depict the torture.'
    },
    {
      id: 1058063,
      title: 'Hell Torture',
      year: 2023,
      lang: 'id',
      poster: 'https://image.tmdb.org/t/p/w500/gt0zaEuYDgr5AbgHkLKmTfliBdd.jpg',
      director: 'Anggy Umbara',
      sentence: null
    },
    {
      id: 530385,
      title: 'Midsommar',
      year: 2019,
      lang: 'en',
      poster: 'https://image.tmdb.org/t/p/w500/7LEI8ulZzO5gy9Ww2NVCrKmHeDZ.jpg',
      director: 'Ari Aster',
      sentence: 'Really liked the beautiful visuals along with eerie and creepy rituals which creates the horror element without jump scares or dark visuals'
    },
    {
      id: 467012,
      title: "Satan's Slaves",
      year: 2017,
      lang: 'id',
      poster: 'https://image.tmdb.org/t/p/w500/k16xOaI9x5fqepxVwBwUJAozsW8.jpg',
      director: 'Joko Anwar',
      sentence: 'Good islamic horror and atmospheric setting'
    },
    {
      id: 864370,
      title: 'Incantation',
      year: 2022,
      lang: 'zh',
      poster: 'https://image.tmdb.org/t/p/w500/2DTiv6daWh74BCm5vdKwcLiGB8N.jpg',
      director: 'Kevin Ko',
      sentence: null
    }
  ];

  const insertSeed = db.prepare(`
    INSERT OR IGNORE INTO recent_seeds (user_id, movie_id, title, year, original_language, poster_url, director, sentence, used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of recentSeeds) {
    insertSeed.run(adminId, s.id, s.title, s.year, s.lang, s.poster, s.director, s.sentence, now);
  }
}
