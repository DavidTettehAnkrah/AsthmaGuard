import jwt from 'jsonwebtoken';
import { IJWTPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Ephemeral server instance ID created when the server process starts.
// When the server process restarts (locally or during deployment), a new ID is generated,
// invalidating all previously issued tokens so users are never automatically logged in after a restart.
if (!process.env.__SERVER_INSTANCE_ID) {
  process.env.__SERVER_INSTANCE_ID = `${process.pid}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getEffectiveJwtSecret(): string {
  return `${JWT_SECRET}:${process.env.__SERVER_INSTANCE_ID}`;
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId: string, email: string, role: 'user' | 'admin' = 'user'): string {
  const payload: IJWTPayload = {
    userId,
    email,
    role,
  };

  return jwt.sign(payload, getEffectiveJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): IJWTPayload | null {
  try {
    const decoded = jwt.verify(token, getEffectiveJwtSecret()) as IJWTPayload;
    return decoded;
  } catch (error: any) {
    return null;
  }
}

/**
 * Decode JWT token without verification (for debugging)
 */
export function decodeToken(token: string): IJWTPayload | null {
  try {
    const decoded = jwt.decode(token) as IJWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  // Expected format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Extract token from request (header or cookies)
 */
export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  const bearerToken = extractTokenFromHeader(authHeader);
  if (bearerToken) return bearerToken;

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    if (tokenCookie) {
      return tokenCookie.substring('token='.length);
    }
  }

  return null;
}

/**
 * Get user ID from request headers or cookie
 */
export function getUserIdFromRequest(request: Request): string | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  
  const decoded = verifyToken(token);
  return decoded?.userId || null;
}

/**
 * Get full decoded JWT payload from request
 */
export function getJwtPayloadFromRequest(request: Request): IJWTPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Verifies that the incoming request belongs to an authorized administrator
 */
export async function requireAdmin(request: Request): Promise<{ isAdmin: boolean; userId: string | null; error?: string }> {
  const payload = getJwtPayloadFromRequest(request);
  if (!payload || !payload.userId) {
    return { isAdmin: false, userId: null, error: 'Authentication required' };
  }

  const { connectDB } = await import('@/lib/db');
  const User = (await import('@/models/User')).default;
  await connectDB();

  const user = await User.findById(payload.userId).select('role');
  if (!user || user.role !== 'admin') {
    return { isAdmin: false, userId: payload.userId, error: 'Forbidden: Admin access required' };
  }

  return { isAdmin: true, userId: payload.userId };
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

/**
 * Get token expiration time
 */
export function getTokenExpiration(token: string): Date | null {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return null;
  
  return new Date(decoded.exp * 1000);
}

/**
 * Refresh token (generate new token with same payload)
 */
export function refreshToken(oldToken: string): string | null {
  const decoded = verifyToken(oldToken);
  if (!decoded) return null;
  
  return generateToken(decoded.userId, decoded.email);
}

/**
 * Hash password using bcrypt (for consistency with User model)
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Generate secure random token for password reset, etc.
 */
export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  // Optional: Check for special characters
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   errors.push('Password must contain at least one special character');
  // }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create session cookie options
 */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use Redis or a proper rate limiting service
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    // Create new record
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(identifier, record);
  
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Clean up expired rate limit records (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up rate limit store every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

