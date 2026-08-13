import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Public paths that don't require authentication
  const publicPaths = ['/', '/register'];
  
  // Get token from request cookies (don't verify on edge runtime - just check existence)
  const token = request.cookies.get('token')?.value;
  const isAuthenticated = !!token;
  
  // Public paths - allow unauthenticated access
  if (publicPaths.includes(pathname)) {
    // If user is already logged in, redirect to dashboard
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // Allow public access to login/register
    return NextResponse.next();
  }
  
  // Organization setup page - allow access if coming from signup or already authenticated
  if (pathname.startsWith('/organization')) {
    // Allow unauthenticated access to /organization (for signup flow)
    // The page will check for sessionStorage data and redirect if missing
    return NextResponse.next();
  }
  
  // Dashboard and other protected routes
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Allow access to dashboard if token exists
    // Token validation will happen on the client side or in API routes
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes
     * - images and known static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
