import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getDb } from '../../../lib/db';
import { verifyPassword, createSession, createSessionCookieHeader } from '../../../lib/auth';
import type { User, Role } from '../../../lib/types';

export const prerender = false;

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: parseResult.error.issues[0]?.message || 'Validation failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { username, password } = parseResult.data;
    const db = getDb();

    const row = db.prepare(`
      SELECT id, username, password_hash, salt, role, created_at
      FROM users
      WHERE username = ?
    `).get(username) as {
      id: number;
      username: string;
      password_hash: string;
      salt: string;
      role: Role;
      created_at: number;
    } | undefined;

    if (!row) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = verifyPassword(password, row.password_hash, row.salt);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { token, expiresAt } = createSession(row.id);

    const user: User = {
      id: row.id,
      username: row.username,
      role: row.role,
      createdAt: row.created_at,
    };

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': createSessionCookieHeader(token, expiresAt),
      },
    });
  } catch (error) {
    console.error('[API /api/auth/login] Error:', error);
    return new Response(JSON.stringify({ error: 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
