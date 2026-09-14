import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { loginSchema } from '@/lib/validations';
import { generateToken, checkRateLimit } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  rateLimitResponse,
  handleApiError,
  parseRequestBody,
  getClientIp,
} from '@/lib/api-helpers';
import { ILoginRequest, IUserResponse } from '@/types';

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const isRateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isRateLimitEnabled) {
      const clientIp = getClientIp(request);
      const maxRequests = isDev ? 100 : 10;
      const rateLimit = checkRateLimit(`login:${clientIp}`, maxRequests, 15 * 60 * 1000);
      
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.resetTime);
      }
    }
    
    // Parse request body
    const body = await parseRequestBody<ILoginRequest>(request);
    
    if (!body) {
      return errorResponse('Invalid request body', 'Request body is required', 400);
    }
    
    // Validate request body
    const validation = loginSchema.safeParse(body);
    
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    
    const { email, password } = validation.data;
    
    // Connect to database
    await connectDB();
    
    // Find user by email (with password field)
    const user = await User.findByEmail(email);
    
    if (!user) {
      return unauthorizedResponse('Invalid email or password');
    }
    
    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return unauthorizedResponse('Invalid email or password');
    }
    
    // Generate JWT token with role
    const token = generateToken(user._id.toString(), user.email, user.role || 'user');
    
    // Get public user profile
    const userResponse: IUserResponse = user.getPublicProfile();
    
    // Create response with token
    const response = successResponse(
      { user: userResponse, token },
      'Login successful'
    );
    
    // Set token in httpOnly session cookie (cleared when browser session ends)
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    return handleApiError(error);
  }
}


