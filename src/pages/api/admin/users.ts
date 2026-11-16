import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { db } from '../../../lib/db';
import { users } from '../../../lib/schema';
import { eq, sql, desc, count } from 'drizzle-orm';
import type { Role } from '../../../lib/types';

export const prerender = false;

// GET /api/admin/users: List all users with library & activity metrics
export const GET: APIRoute = async ({ request }) => {
  const adminCheck = await requireAdmin(request);
  if ('errorResponse' in adminCheck) return adminCheck.errorResponse;

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
      watchlistCount: sql<number>`(SELECT COUNT(*) FROM watchlists w WHERE w.user_id = ${users.id})`,
      seenCount: sql<number>`(SELECT COUNT(*) FROM seen_movies s WHERE s.user_id = ${users.id})`,
      discoveryCount: sql<number>`(SELECT COUNT(*) FROM discovery_logs d WHERE d.user_id = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return new Response(JSON.stringify({ users: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

// PATCH /api/admin/users: Change user role (admin <-> member)
export const PATCH: APIRoute = async ({ request }) => {
  const adminCheck = await requireAdmin(request);
  if ('errorResponse' in adminCheck) return adminCheck.errorResponse;

  try {
    const body = await request.json();
    const userId = typeof body.userId === 'number' ? body.userId : null;
    const newRole = body.role as Role;

    if (!userId || !['admin', 'member'].includes(newRole)) {
      return new Response(JSON.stringify({ error: 'Invalid userId or role' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prevent demoting self if sole admin
    if (userId === adminCheck.user.id && newRole !== 'admin') {
      const adminCountRes = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.role, 'admin'));

      if ((adminCountRes[0]?.value ?? 0) <= 1) {
        return new Response(JSON.stringify({ error: 'Cannot demote the sole administrator.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    await db.update(users).set({ role: newRole }).where(eq(users.id, userId));

    return new Response(JSON.stringify({ success: true, userId, role: newRole }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /api/admin/users PATCH] Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update user role' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// DELETE /api/admin/users?id={userId}: Delete user
export const DELETE: APIRoute = async ({ request }) => {
  const adminCheck = await requireAdmin(request);
  if ('errorResponse' in adminCheck) return adminCheck.errorResponse;

  const url = new URL(request.url);
  const targetId = parseInt(url.searchParams.get('id') || '', 10);
  if (isNaN(targetId)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (targetId === adminCheck.user.id) {
    return new Response(JSON.stringify({ error: 'Cannot delete your own administrator account.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.delete(users).where(eq(users.id, targetId));

  return new Response(JSON.stringify({ success: true, deletedId: targetId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
