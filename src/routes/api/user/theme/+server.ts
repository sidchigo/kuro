import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/auth';
import { db } from '$lib/db';
import { users } from '$lib/schema';
import { eq } from 'drizzle-orm';
import { STOCK_THEMES } from '$lib/stores/theme.svelte';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const auth = await requireAuth(request, cookies);
  if ('errorResponse' in auth) return auth.errorResponse;

  try {
    const body = (await request.json()) as { theme?: string; customColor?: string };
    const themeId = body?.theme;
    const customColor = body?.customColor;

    const isStock = STOCK_THEMES.some((t) => t.id === themeId);
    const isCustom = themeId === 'custom';

    if (!themeId || (!isStock && !isCustom)) {
      return new Response(JSON.stringify({ error: 'Invalid theme specified' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updateData: { themePreference: string; customColor?: string } = {
      themePreference: themeId,
    };

    if (customColor && /^#[0-9a-fA-F]{3,8}$/.test(customColor)) {
      updateData.customColor = customColor;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, auth.user.id));

    return new Response(JSON.stringify({ ok: true, theme: themeId, customColor }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[API /api/user/theme] Error updating theme preference:', error);
    return new Response(JSON.stringify({ error: 'Failed to update theme preference' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
