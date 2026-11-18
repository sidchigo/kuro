import crypto from 'node:crypto';
import { db } from './db';
import { users, sessions } from './schema';
import { eq, and, gt } from 'drizzle-orm';
import type { User, Role } from './types';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const COOKIE_NAME = 'kuro_session';

export function getSessionCookieOptions(expiresAt: number, request?: Request, url?: URL) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const isHttps =
    url?.protocol === 'https:' ||
    (request
      ? request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https'
      : false);
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttps,
    maxAge,
    expires: new Date(expiresAt),
  };
}

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

export async function createSession(userId: number): Promise<{ token: string; expiresAt: number }> {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  await db.insert(sessions).values({
    token,
    userId,
    expiresAt,
    createdAt: now,
  });

  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function validateSession(token: string): Promise<User | null> {
  if (!token) return null;
  const now = Date.now();

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, now)))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row.id,
    username: row.username,
    role: row.role as Role,
    createdAt: row.createdAt,
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

export function createSessionCookieHeader(token: string, expiresAt: number, request?: Request): string {
  const expiresDate = new Date(expiresAt).toUTCString();
  const maxAgeSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const isHttps = request
    ? request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https'
    : false;
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; Expires=${expiresDate}; HttpOnly; SameSite=Lax${isHttps ? '; Secure' : ''
    }`;
}

export function createClearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`;
}

/**
 * Authenticates request via session cookie or Authorization Bearer header
 */
export async function authenticateRequest(request: Request): Promise<User | null> {
  let token = getCookieToken(request);
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;
  return await validateSession(token);
}

/**
 * RBAC Guard: Ensures user is logged in
 */
export async function requireAuth(request: Request): Promise<{ user: User } | { errorResponse: Response }> {
  const user = await authenticateRequest(request);
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
export async function requireAdmin(request: Request): Promise<{ user: User } | { errorResponse: Response }> {
  const authResult = await requireAuth(request);
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
