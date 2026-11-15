import crypto from 'node:crypto';
import { getDb } from './db';
import type { User, Role } from './types';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE_NAME = 'kuro_session';

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const key = crypto.scryptSync(password, salt, 64);
    const hashBuffer = Buffer.from(hash, 'hex');
    return crypto.timingSafeEqual(key, hashBuffer);
  } catch {
    return false;
  }
}

export function createSession(userId: number): { token: string; expiresAt: number } {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, expiresAt, now);

  return { token, expiresAt };
}

export function deleteSession(token: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function validateSession(token: string): User | null {
  if (!token) return null;
  const db = getDb();
  const now = Date.now();

  const row = db.prepare(`
    SELECT u.id, u.username, u.role, u.created_at, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, now) as {
    id: number;
    username: string;
    role: Role;
    created_at: number;
    expires_at: number;
  } | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function getCookieToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${COOKIE_NAME}=`)) {
      return decodeURIComponent(cookie.substring(COOKIE_NAME.length + 1));
    }
  }
  return null;
}

export function createSessionCookieHeader(token: string, expiresAt: number): string {
  const expiresDate = new Date(expiresAt).toUTCString();
  const isProduction = process.env.NODE_ENV === 'production';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Expires=${expiresDate}; HttpOnly; SameSite=Lax${
    isProduction ? '; Secure' : ''
  }`;
}

export function createClearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`;
}

/**
 * Authenticates request via session cookie or Authorization Bearer header
 */
export function authenticateRequest(request: Request): User | null {
  let token = getCookieToken(request);
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;
  return validateSession(token);
}

/**
 * RBAC Guard: Ensures user is logged in
 */
export function requireAuth(request: Request): { user: User } | { errorResponse: Response } {
  const user = authenticateRequest(request);
  if (!user) {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Authentication required. Please sign in.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }
  return { user };
}

/**
 * RBAC Guard: Ensures user has Admin role
 */
export function requireAdmin(request: Request): { user: User } | { errorResponse: Response } {
  const authResult = requireAuth(request);
  if ('errorResponse' in authResult) {
    return authResult;
  }

  if (authResult.user.role !== 'admin') {
    return {
      errorResponse: new Response(
        JSON.stringify({ error: 'Forbidden. Admin role required.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { user: authResult.user };
}
