import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getDemoCredentials,
  getSessionMaxAge,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const demo = getDemoCredentials();

    if (email !== demo.email.toLowerCase() || password !== demo.password) {
      return NextResponse.json(
        { error: 'Invalid email or access key' },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      email: demo.email,
      name: demo.name,
      role: demo.role,
    });

    const response = NextResponse.json({
      user: {
        email: demo.email,
        name: demo.name,
        role: demo.role,
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: getSessionMaxAge(),
      path: '/',
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
