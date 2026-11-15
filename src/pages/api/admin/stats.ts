import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getDb } from '../../../lib/db';
import type { AdminStats, DiscoveryLogItem } from '../../../lib/types';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const adminCheck = requireAdmin(request);
  if ('errorResponse' in adminCheck) return adminCheck.errorResponse;

  const db = getDb();
  const now = Date.now();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const discoveryCount = db.prepare('SELECT COUNT(*) as count FROM discovery_logs').get() as { count: number };
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at > ?').get(now) as { count: number };

  const recentLogs = db.prepare(`
    SELECT d.id, d.user_id as userId, u.username, d.seed_movie_id as seedMovieId,
           d.seed_title as seedTitle, d.sentence, d.preset,
           d.candidate_count as candidateCount, d.result_count as resultCount,
           d.created_at as createdAt
    FROM discovery_logs d
    LEFT JOIN users u ON u.id = d.user_id
    ORDER BY d.created_at DESC
    LIMIT 10
  `).all() as unknown as DiscoveryLogItem[];

  const stats: AdminStats = {
    totalUsers: userCount.count,
    totalDiscoveries: discoveryCount.count,
    activeSessions: sessionCount.count,
  };

  return new Response(JSON.stringify({ stats, recentLogs }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
