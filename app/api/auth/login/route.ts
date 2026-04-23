import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AUTH_COOKIE_NAME, AUTH_SESSION_MAX_AGE, createSessionToken, isAuthConfigured, isValidLogin } from '@/lib/auth';

export const runtime = 'nodejs';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: 'Authentication is not configured. Set BASIC_AUTH_EMAIL, BASIC_AUTH_PASSWORD, and AUTH_SECRET.' },
      { status: 500 }
    );
  }

  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email and password.' }, { status: 400 });
  }

  const valid = await isValidLogin(parsed.data.email, parsed.data.password);
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect email or password.' }, { status: 401 });
  }

  const token = await createSessionToken(parsed.data.email);
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication is not configured. Set BASIC_AUTH_EMAIL, BASIC_AUTH_PASSWORD, and AUTH_SECRET.' },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_SESSION_MAX_AGE,
  });

  return response;
}
