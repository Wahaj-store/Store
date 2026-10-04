import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { createCustomerSession } from '@/lib/customer-auth';
import { rateLimit, getClientKey } from '@/lib/rate-limit';

const providers = {
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    authorization: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
  },
  facebook: {
    clientId: () => process.env.FACEBOOK_CLIENT_ID,
    clientSecret: () => process.env.FACEBOOK_CLIENT_SECRET,
    authorization: 'https://www.facebook.com/v20.0/dialog/oauth',
    token: 'https://graph.facebook.com/v20.0/oauth/access_token',
  },
} as const;

type Provider = keyof typeof providers;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET غير مضبوط');
  return new TextEncoder().encode(value);
}

function siteUrl(req: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
}

function redirectUri(req: Request, provider: Provider) {
  return `${siteUrl(req)}/api/customer/social/${provider}`;
}

function finish(req: Request, code: string) {
  return NextResponse.redirect(new URL(`/account?social=${encodeURIComponent(code)}`, siteUrl(req)));
}

function providerFromParam(value: string): Provider | null {
  return value === 'google' || value === 'facebook' ? value : null;
}

async function createState(provider: Provider) {
  const nonce = randomUUID();
  const state = await new SignJWT({ provider, nonce, typ: 'customer-oauth-state' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret());
  cookies().set('wahaj_oauth_state', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return state;
}

async function startOAuth(req: Request, provider: Provider) {
  const config = providers[provider];
  const clientId = config.clientId();
  const clientSecret = config.clientSecret();
  if (!clientId || !clientSecret) return finish(req, `${provider}_unavailable`);

  const state = await createState(provider);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(req, provider),
    response_type: 'code',
    scope: provider === 'google' ? 'openid email profile' : 'email,public_profile',
    state,
  });
  return NextResponse.redirect(`${config.authorization}?${params.toString()}`);
}

async function exchangeCode(req: Request, provider: Provider, code: string) {
  const config = providers[provider];
  const clientId = config.clientId();
  const clientSecret = config.clientSecret();
  if (!clientId || !clientSecret) throw new Error('provider_unavailable');

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri(req, provider),
    grant_type: 'authorization_code',
  });
  const tokenResponse = provider === 'facebook'
    ? await fetch(`${config.token}?${body.toString()}`, { headers: { Accept: 'application/json' }, cache: 'no-store' })
    : await fetch(config.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body,
        cache: 'no-store',
      });
  const token = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !token.access_token) throw new Error('oauth_token_failed');

  if (provider === 'google') {
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }, cache: 'no-store',
    });
    const profile = await profileResponse.json().catch(() => ({}));
    if (!profileResponse.ok || !profile.email || profile.email_verified === false) throw new Error('oauth_profile_failed');
    return { email: String(profile.email).trim().toLowerCase(), name: String(profile.name || 'عضو وَهَج').trim() };
  }

  const profileResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(token.access_token)}`, { cache: 'no-store' });
  const profile = await profileResponse.json().catch(() => ({}));
  if (!profileResponse.ok || !profile.email) throw new Error('oauth_email_required');
  return { email: String(profile.email).trim().toLowerCase(), name: String(profile.name || 'عضو وَهَج').trim() };
}

export async function GET(req: Request, { params }: { params: { provider: string } }) {
  const provider = providerFromParam(params.provider);
  if (!provider) return NextResponse.json({ error: 'مزود تسجيل غير مدعوم' }, { status: 404 });
  const url = new URL(req.url);
  const limit = rateLimit(`customer-oauth:${provider}:${getClientKey(req)}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return finish(req, 'rate_limited');

  if (url.searchParams.get('error')) return finish(req, 'cancelled');
  if (!url.searchParams.get('code')) return startOAuth(req, provider);
  try {
    const state = url.searchParams.get('state') || '';
    const storedNonce = cookies().get('wahaj_oauth_state')?.value;
    const { payload } = await jwtVerify(state, secret());
    if (payload.typ !== 'customer-oauth-state' || payload.provider !== provider || !storedNonce || payload.nonce !== storedNonce) {
      return finish(req, 'invalid_state');
    }
    cookies().delete('wahaj_oauth_state');
    const profile = await exchangeCode(req, provider, url.searchParams.get('code')!);
    let customer = await prisma.customer.findUnique({ where: { email: profile.email } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: profile.name, email: profile.email, passwordHash: null, lastLoginAt: new Date() } });
    } else {
      customer = await prisma.customer.update({ where: { id: customer.id }, data: { lastLoginAt: new Date(), name: customer.name || profile.name } });
    }
    await createCustomerSession(customer.id, true);
    return NextResponse.redirect(new URL('/account?social=success', siteUrl(req)));
  } catch (error: any) {
    console.error('CUSTOMER_OAUTH_ERROR:', error?.message || error);
    return finish(req, error?.message === 'oauth_email_required' ? 'email_required' : 'oauth_failed');
  }
}
