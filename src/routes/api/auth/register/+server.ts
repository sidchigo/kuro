import type { RequestHandler } from './$types';
import { dev } from '$app/environment';
import { z } from 'zod';
import { db } from '$lib/db';
import { users } from '$lib/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, createSession, COOKIE_NAME, getSessionCookieOptions } from '$lib/auth';
import type { User } from '$lib/types';

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, underscores, and dashes'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  if (!dev) {
    return new Response(
      JSON.stringify({ error: 'Manual registration is disabled in production.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

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

    const parseResult = RegisterSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: parseResult.error.issues[0]?.message || 'Validation failed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { username, password } = parseResult.data;

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Username is already taken' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { hash, salt } = hashPassword(password);
    const now = Date.now();

    const [inserted] = await db
      .insert(users)
      .values({
        username,
        passwordHash: hash,
        salt,
        role: 'member',
        createdAt: now,
      })
      .returning({ id: users.id });

    const userId = inserted.id;
    const { token, expiresAt } = await createSession(userId);

    const user: User = {
      id: userId,
      username,
      role: 'member',
      createdAt: now,
    };

    cookies.set(COOKIE_NAME, token, getSessionCookieOptions(expiresAt, request, url));

    return new Response(JSON.stringify({ user }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[API /api/auth/register] Error:', error);
    return new Response(JSON.stringify({ error: 'Registration failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
