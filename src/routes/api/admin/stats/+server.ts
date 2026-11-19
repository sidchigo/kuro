import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/auth';
import { db } from '$lib/db';
import { users, discoveryLogs, sessions } from '$lib/schema';
import { desc, count, gt, eq } from 'drizzle-orm';
import type { AdminStats, DiscoveryLogItem } from '$lib/types';

export const GET: RequestHandler = async ({ request, cookies }) => {
  const adminCheck = await requireAdmin(request, cookies);
  if ('errorResponse' in adminCheck) return adminCheck.errorResponse;

  const now = Date.now();

  const userCountRes = await db.select({ value: count() }).from(users);
  const discoveryCountRes = await db.select({ value: count() }).from(discoveryLogs);
  const sessionCountRes = await db
    .select({ value: count() })
    .from(sessions)
    .where(gt(sessions.expiresAt, now));

  const recentLogs = (await db
    .select({
      id: discoveryLogs.id,
      userId: discoveryLogs.userId,
      username: users.username,
      seedMovieId: discoveryLogs.seedMovieId,
      seedTitle: discoveryLogs.seedTitle,
      sentence: discoveryLogs.sentence,
      preset: discoveryLogs.preset,
      candidateCount: discoveryLogs.candidateCount,
      resultCount: discoveryLogs.resultCount,
      createdAt: discoveryLogs.createdAt,
    })
    .from(discoveryLogs)
    .leftJoin(users, eq(users.id, discoveryLogs.userId))
    .orderBy(desc(discoveryLogs.createdAt))
    .limit(10)) as unknown as DiscoveryLogItem[];

  const stats: AdminStats = {
    totalUsers: userCountRes[0]?.value ?? 0,
    totalDiscoveries: discoveryCountRes[0]?.value ?? 0,
    activeSessions: sessionCountRes[0]?.value ?? 0,
  };

  return new Response(JSON.stringify({ stats, recentLogs }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
