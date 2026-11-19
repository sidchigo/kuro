import { redirect, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import crypto from 'node:crypto';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const errorMsg = 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file.';
    throw redirect(302, `/?auth_error=${encodeURIComponent(errorMsg)}`);
  }

  // 1. Generate cryptographic state and PKCE code verifier
  const state = crypto.randomBytes(32).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  const isHttps = url.protocol === 'https:';

  // 2. Set short-lived security cookies
  cookies.set('google_oauth_state', state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: 600, // 10 minutes
  });

  cookies.set('google_oauth_code_verifier', codeVerifier, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps,
    maxAge: 600, // 10 minutes
  });

  // 3. Assemble Google OAuth authorization URL with PKCE
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'select_account');

  throw redirect(302, authUrl.toString());
};
