import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import type { AdminUserView, Role } from '../../../lib/types';

export const prerender = false;

// GET /api/admin/users: List all users with library & activity metrics
export const GET: APIRoute = async ({ request }) => {
  const adminCheck = requireAdmin(request);
  if ('errorResponse' in adminCheck) return adminCheck.errorResponse;

  const db = getDb();
  const rows = db.prepare(`
    SELECT u.id, u.username, u.role, u.created_at as createdAt,
           (SELECT COUNT(*) FROM watchlists w WHERE w.user_id = u.id) as watchlistCount,
           (SELECT COUNT(*) FROM seen_movies s WHERE s.user_id = u.id) as seenCount,
           (SELECT COUNT(*) FROM discovery_logs d WHERE d.user_id = u.id) as discoveryCount
    FROM users u
    ORDER BY u.created_at DESC
  `).all() as unknown as AdminUserView[];

  return new Response(JSON.stringify({ users: rows }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

// PATCH /api/admin/users: Change user role (admin <-> member)
export const PATCH: APIRoute = async ({ request }) => {
  const adminCheck = requireAdmin(request);
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

    const db = getDb();

    // Prevent demoting self if sole admin
    if (userId === adminCheck.user.id && newRole !== 'admin') {
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
      if (adminCount.count <= 1) {
        return new Response(JSON.stringify({ error: 'Cannot demote the sole administrator.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);

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
  const adminCheck = requireAdmin(request);
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

  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

  return new Response(JSON.stringify({ success: true, deletedId: targetId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
