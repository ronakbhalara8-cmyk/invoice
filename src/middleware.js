import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Public paths that don't require authentication (e.g. login page)
  const publicPaths = ['/'];
  
  // Protected paths that require authentication
  const protectedPaths = ['/dashboard', '/api/protected'];
  
  // Get token from request cookies
  const token = request.cookies.get('token')?.value;
  
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isPublicPath = publicPaths.includes(pathname);

  // If trying to access protected route without token, redirect to login
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // If user is authenticated and trying to access login page, redirect to dashboard
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
     * - api routes (if not protected by middleware directly)
     * - images and known static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
