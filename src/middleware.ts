import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Protected routes that require authentication
 */
const protectedRoutes = [
  '/dashboard',
  '/devices',
  '/profile',
  '/api/user',
  '/api/devices',
];

/**
 * Public routes that should redirect to dashboard if authenticated
 */
const authRoutes = ['/login', '/register'];

/**
 * Middleware to protect routes and handle authentication
 * Note: Token verification is done in API routes, not here, because
 * Edge Runtime (where middleware runs) has limited Node.js compatibility
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookie or Authorization header
  const tokenFromCookie = request.cookies.get('token')?.value;
  const authHeader = request.headers.get('authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;
  
  const token = tokenFromCookie || tokenFromHeader;
  
  // For page routes (not API), allow through - client-side will handle auth
  // This prevents middleware redirect loops with client-side navigation
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );
  
  // For API routes, if protected and no token, reject
  if (isProtectedRoute && !token) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized', error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Add token to headers for API route processing
  // The API route will verify the token
  if (token) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-token', token);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
