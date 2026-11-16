import type { APIRoute } from 'astro';
import { z } from 'zod';
import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';
import { eq } from 'drizzle-orm';
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

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        passwordHash: users.passwordHash,
        salt: users.salt,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isValid = verifyPassword(password, row.passwordHash, row.salt);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid username or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { token, expiresAt } = await createSession(row.id);

    const user: User = {
      id: row.id,
      username: row.username,
      role: row.role as Role,
      createdAt: row.createdAt,
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
