import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-helpers';

/**
 * POST /api/auth/logout
 * Logout user by clearing the token cookie
 */
export async function POST(request: NextRequest) {
  // Create response
  const response = successResponse(
    null,
    'Logout successful'
  );
  
  // Clear token cookie
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  });
  
  return response;
}


