import { NextResponse, type NextRequest } from 'next/server';

/**
 * First line of defence for the dashboard: no session cookie → login.
 * This only checks that a cookie exists. The real authorization (role === ADMIN)
 * is enforced by the API on every request and re-checked in the admin layout.
 */
export function middleware(req: NextRequest) {
  if (!req.cookies.get('token')) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
