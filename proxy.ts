import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

const PUBLIC_PATHS = ['/auth', '/login', '/api/auth/login', '/api/auth/logout'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isStaticAsset(pathname: string) {
  return pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico') || /\.[^/]+$/.test(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if ((pathname === '/auth' || pathname === '/login') && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname === '/login') {
    const authUrl = new URL('/auth', request.url);
    const next = request.nextUrl.searchParams.get('next');
    if (next) authUrl.searchParams.set('next', next);
    return NextResponse.redirect(authUrl);
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    const authUrl = new URL('/auth', request.url);
    authUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
