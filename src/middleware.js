import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Read expected credentials from env vars
  const expectedUser = process.env.AUTH_USER;
  const expectedPwd = process.env.AUTH_PASS;

  // If no auth variables are set, allow all access
  if (!expectedUser || !expectedPwd) {
    return NextResponse.next();
  }

  // Allow access to login API and login page
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Check for auth_token cookie
  const tokenCookie = req.cookies.get('auth_token');
  
  if (tokenCookie) {
    // Generate the expected token using Edge-compatible btoa
    const expectedToken = btoa(`${expectedUser}:${expectedPwd}`);
    
    if (tokenCookie.value === expectedToken) {
      return NextResponse.next();
    }
  }

  // If not authenticated, redirect to login page (or return 401 for API routes)
  if (pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}
