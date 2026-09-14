import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations';
import { checkRateLimit } from '@/lib/auth';
import { formatPhoneNumberForStorage } from '@/lib/phone';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  conflictResponse,
  rateLimitResponse,
  handleApiError,
  parseRequestBody,
  getClientIp,
} from '@/lib/api-helpers';
import { IRegisterRequest, IUserResponse } from '@/types';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const isRateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isRateLimitEnabled) {
      const clientIp = getClientIp(request);
      const maxRequests = isDev ? 100 : 5;
      const windowMs = isDev ? 15 * 60 * 1000 : 60 * 60 * 1000;
      const rateLimit = checkRateLimit(`register:${clientIp}`, maxRequests, windowMs);
      
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.resetTime);
      }
    }
    
    // Parse request body
    const body = await parseRequestBody<IRegisterRequest>(request);
    
    if (!body) {
      return errorResponse('Invalid request body', 'Request body is required', 400);
    }
    
    // Validate request body
    const validation = registerSchema.safeParse(body);
    
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    
    const { fullName, email, phoneNumber, password, role, adminSecretCode, emergencyContacts, medicalNotes } = validation.data;
    
    // Enforce admin secret access code if registering as an admin
    if (role === 'admin') {
      const configuredSecret = process.env.ADMIN_REGISTRATION_SECRET || 'AsthmaAdmin@2026!';
      if (!adminSecretCode || adminSecretCode !== configuredSecret) {
        return errorResponse(
          'Invalid admin access code. You are not authorized to create an administrator account.',
          'Forbidden',
          403
        );
      }
    }

    // Connect to database
    await connectDB();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return conflictResponse('User with this email already exists');
    }
    
    // Create new user with phone numbers formatted for SMS
    const user = new User({
      fullName,
      email,
      phoneNumber: formatPhoneNumberForStorage(phoneNumber),
      password, // Will be hashed by pre-save middleware
      role: role || 'user',
      emergencyContacts: emergencyContacts
        ? emergencyContacts.map((c) => ({
            name: c.name,
            phoneNumber: formatPhoneNumberForStorage(c.phoneNumber),
          }))
        : [],
      medicalNotes: medicalNotes || {},
    });
    
    await user.save();
    
    // Get public user profile
    const userResponse: IUserResponse = user.getPublicProfile();
    
    return successResponse(
      { user: userResponse },
      'User registered successfully',
      201
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}

