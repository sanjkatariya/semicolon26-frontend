import { SignJWT, jwtVerify } from 'jose';

export const AUTH_COOKIE_NAME = 'semicolon_session';

export interface AuthSession {
  email: string;
  name: string;
  role: string;
}

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function getAuthSecret() {
  const configuredSecret = process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET || '';

  if (configuredSecret && configuredSecret !== 'your-secret-key-change-this-in-production') {
    return configuredSecret;
  }

  return process.env.NODE_ENV === 'production'
    ? ''
    : 'semicolon-local-demo-session-secret-change-before-production';
}

function getSecretKey() {
  const secret = getAuthSecret();
  if (!secret) {
    throw new Error('AUTH_SESSION_SECRET is not configured');
  }

  return new TextEncoder().encode(secret);
}

export function getDemoCredentials() {
  return {
    email: process.env.DEMO_ADMIN_EMAIL || 'admin@semicolon.ai',
    password: process.env.DEMO_ADMIN_PASSWORD || 'Semicolon@2026',
    name: process.env.DEMO_ADMIN_NAME || 'Security Admin',
    role: process.env.DEMO_ADMIN_ROLE || 'admin',
  };
}

export async function createSessionToken(session: AuthSession) {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token?: string): Promise<AuthSession | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const email = typeof payload.email === 'string' ? payload.email : '';
    const name = typeof payload.name === 'string' ? payload.name : '';
    const role = typeof payload.role === 'string' ? payload.role : '';

    if (!email || !name || !role) {
      return null;
    }

    return { email, name, role };
  } catch {
    return null;
  }
}

export function getSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}
