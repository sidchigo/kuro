import { redirect, isRedirect, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/db';
import { users } from '$lib/schema';
import { eq, or } from 'drizzle-orm';
import { createSession, deleteSession, getCookieToken, COOKIE_NAME, getSessionCookieOptions } from '$lib/auth';
import type { Role } from '$lib/types';

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  id_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function sanitizeUsername(base: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 18);
  return cleaned.length >= 3 ? cleaned : `kuro_${cleaned}`;
}

export const GET: RequestHandler = async ({ url, cookies, request }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    throw redirect(302, `/?auth_error=${encodeURIComponent('Google authentication was canceled or declined.')}`);
  }

  const storedState = cookies.get('google_oauth_state');
  const storedCodeVerifier = cookies.get('google_oauth_code_verifier');

  // Always remove temporary OAuth verification cookies
  const isHttps = url.protocol === 'https:';
  cookies.delete('google_oauth_state', { path: '/', httpOnly: true, sameSite: 'lax', secure: isHttps });
  cookies.delete('google_oauth_code_verifier', { path: '/', httpOnly: true, sameSite: 'lax', secure: isHttps });

  if (!code || !state || !storedState || state !== storedState || !storedCodeVerifier) {
    throw redirect(302, `/?auth_error=${encodeURIComponent('Security validation failed (OAuth state mismatch). Please try again.')}`);
  }

  const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const adminEmail = (env.ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').toLowerCase().trim();

  if (!clientId || !clientSecret) {
    throw redirect(302, `/?auth_error=${encodeURIComponent('Google OAuth server configuration missing.')}`);
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;

    // 1. Exchange authorization code with PKCE verifier for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: storedCodeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Google OAuth] Token exchange error:', errText);
      let message = 'Failed to exchange authorization code with Google.';
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error_description) {
          message = `Google OAuth: ${parsed.error_description}`;
        }
      } catch {
        // use fallback message
      }
      throw redirect(302, `/?auth_error=${encodeURIComponent(message)}`);
    }

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenData.access_token) {
      throw redirect(302, `/?auth_error=${encodeURIComponent('Invalid token response received from Google.')}`);
    }

    // 2. Fetch authenticated user profile
    const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoRes.ok) {
      throw redirect(302, `/?auth_error=${encodeURIComponent('Failed to fetch user profile from Google.')}`);
    }

    const userInfo = (await userInfoRes.json()) as GoogleUserInfo;
    const email = (userInfo.email || '').toLowerCase().trim();
    const googleId = userInfo.sub;
    const avatarUrl = userInfo.picture;
    const now = Date.now();

    if (!googleId || !email) {
      throw redirect(302, `/?auth_error=${encodeURIComponent('Google did not provide a verified email address.')}`);
    }

    const isTargetAdmin = Boolean(adminEmail && email === adminEmail);

    // 3. Match user strictly by googleId or verified email (no heuristic hijacking)
    const existingUsers = await db
      .select()
      .from(users)
      .where(or(eq(users.googleId, googleId), eq(users.email, email)))
      .limit(1);

    let userId: number;

    if (existingUsers.length > 0) {
      const existing = existingUsers[0];
      userId = existing.id;

      const shouldPromoteAdmin = isTargetAdmin && existing.role !== 'admin';
      const roleToSet: Role = shouldPromoteAdmin ? 'admin' : (existing.role as Role);

      await db
        .update(users)
        .set({
          googleId,
          email,
          avatarUrl: avatarUrl || existing.avatarUrl,
          role: roleToSet,
        })
        .where(eq(users.id, userId));
    } else {
      // Role is admin ONLY if email matches configured ADMIN_EMAIL
      const role: Role = isTargetAdmin ? 'admin' : 'member';

      const rawBase = email.split('@')[0] || userInfo.name || 'member';
      let candidateUsername = sanitizeUsername(rawBase);

      // Ensure unique username
      const conflict = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, candidateUsername))
        .limit(1);

      if (conflict.length > 0) {
        candidateUsername = `${candidateUsername.slice(0, 14)}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      const [inserted] = await db
        .insert(users)
        .values({
          username: candidateUsername,
          email,
          googleId,
          avatarUrl,
          passwordHash: '',
          salt: '',
          role,
          createdAt: now,
        })
        .returning({ id: users.id });

      userId = inserted.id;
    }

    // 4. Invalidate any lingering session for this browser before creating the new one
    const oldToken = cookies.get(COOKIE_NAME) || getCookieToken(request);
    if (oldToken) {
      try {
        await deleteSession(oldToken);
      } catch {
        // Ignore DB deletion errors
      }
    }

    // 5. Create persistent session and set session cookie
    const { token, expiresAt } = await createSession(userId);
    cookies.set(COOKIE_NAME, token, getSessionCookieOptions(expiresAt, request, url));

    // Return HTML intermediate page to prevent Chrome dropping SameSite=Lax cookie on cross-site 302 redirects
    const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authenticating | kuro.</title>
  <meta http-equiv="refresh" content="0;url=/" />
  <style>
    body {
      background-color: #0A0A0B;
      color: #F2EFE9;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div>[AUTHENTICATING...]</div>
  <script>
    window.location.replace('/');
  </script>
</body>
</html>`;

    return new Response(redirectHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    if (isRedirect(err)) {
      throw err;
    }
    console.error('[Google OAuth] Callback handler unexpected error:', err);
    cookies.delete(COOKIE_NAME, { path: '/' });
    const detail = err instanceof Error ? err.message : String(err);
    throw redirect(302, `/?auth_error=${encodeURIComponent(`Authentication error: ${detail}`)}`);
  }
};
