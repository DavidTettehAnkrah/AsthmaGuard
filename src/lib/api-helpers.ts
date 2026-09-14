import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { IApiResponse, IApiError } from '@/types';

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T,
  message: string = 'Success',
  status: number = 200
): NextResponse<IApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

/**
 * Error response helper
 */
export function errorResponse(
  message: string,
  error: string = 'An error occurred',
  status: number = 500
): NextResponse<IApiError> {
  return NextResponse.json(
    {
      success: false,
      message,
      error,
      statusCode: status,
    },
    { status }
  );
}

/**
 * Validation error response helper
 */
export function validationErrorResponse(
  errors: any
): NextResponse<IApiError> {
  return NextResponse.json(
    {
      success: false,
      message: 'Validation failed',
      error: formatValidationErrors(errors),
      statusCode: 400,
    },
    { status: 400 }
  );
}

/**
 * Format Zod validation errors
 */
export function formatValidationErrors(error: ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ');
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(
  message: string = 'Unauthorized'
): NextResponse<IApiError> {
  return errorResponse(message, 'Authentication required', 401);
}

/**
 * Forbidden response
 */
export function forbiddenResponse(
  message: string = 'Forbidden'
): NextResponse<IApiError> {
  return errorResponse(message, 'Access denied', 403);
}

/**
 * Not found response
 */
export function notFoundResponse(
  resource: string = 'Resource'
): NextResponse<IApiError> {
  return errorResponse(`${resource} not found`, 'Not found', 404);
}

/**
 * Conflict response
 */
export function conflictResponse(
  message: string = 'Resource already exists'
): NextResponse<IApiError> {
  return errorResponse(message, 'Conflict', 409);
}

/**
 * Rate limit response
 */
export function rateLimitResponse(
  resetTime: number
): NextResponse<IApiError> {
  const response = errorResponse(
    'Too many requests',
    'Rate limit exceeded',
    429
  );
  
  response.headers.set('X-RateLimit-Reset', resetTime.toString());
  response.headers.set('Retry-After', Math.ceil((resetTime - Date.now()) / 1000).toString());
  
  return response;
}

/**
 * Extract user ID from request headers (set by middleware)
 */
export function getUserIdFromHeaders(request: Request): string | null {
  return request.headers.get('x-user-id');
}

/**
 * Extract user email from request headers (set by middleware)
 */
export function getUserEmailFromHeaders(request: Request): string | null {
  return request.headers.get('x-user-email');
}

/**
 * Extract auth token from request (Bearer header or x-token header)
 */
export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return request.headers.get('x-token') || null;
}

/**
 * Parse request body safely
 */
export async function parseRequestBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

/**
 * Get client IP address
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any): NextResponse<IApiError> {
  console.error('API Error:', error);
  
  // Zod validation errors
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }
  
  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    return errorResponse(
      'Validation failed',
      Object.values(error.errors).map((e: any) => e.message).join(', '),
      400
    );
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return conflictResponse(`${field} already exists`);
  }
  
  // Mongoose cast error
  if (error.name === 'CastError') {
    return errorResponse('Invalid ID format', error.message, 400);
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return unauthorizedResponse('Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return unauthorizedResponse('Token expired');
  }
  
  // Default error
  return errorResponse(
    error.message || 'Internal server error',
    error.toString(),
    error.statusCode || 500
  );
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: any,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredFields.filter(field => !body[field]);
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Sanitize user input (basic XSS prevention)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Parse pagination params from URL
 */
export function parsePaginationParams(url: URL): { page: number; limit: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
  
  return { page, limit };
}

