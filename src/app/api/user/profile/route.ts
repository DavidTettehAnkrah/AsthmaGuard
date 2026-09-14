import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { profileUpdateSchema } from '@/lib/validations';
import { verifyToken } from '@/lib/auth';
import { formatPhoneNumberForStorage } from '@/lib/phone';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  handleApiError,
  parseRequestBody,
  getUserIdFromHeaders,
  extractAuthToken,
} from '@/lib/api-helpers';
import { IUserResponse } from '@/types';

/**
 * GET /api/user/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    const token = extractAuthToken(request);

    if (!token) {
      return errorResponse('No token provided', 'Unauthorized', 401);
    }

    // Verify token and extract userId
    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse('Invalid or expired token', 'Unauthorized', 401);
    }

    const userId = decoded.userId;
    
    // Connect to database
    await connectDB();
    
    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return notFoundResponse('User');
    }
    
    // Get public user profile
    const userResponse: IUserResponse = user.getPublicProfile();
    
    return successResponse(userResponse, 'Profile retrieved successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/user/profile
 * Update current user's profile
 */
export async function PUT(request: NextRequest) {
  try {
    // Get token from Authorization header or x-token
    const token = extractAuthToken(request);
    
    if (!token) {
      return errorResponse('No token provided', 'Unauthorized', 401);
    }
    
    // Verify token and extract userId
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return errorResponse('Invalid or expired token', 'Unauthorized', 401);
    }
    
    const userId = decoded.userId;
    
    // Parse request body
    const body = await parseRequestBody(request);
    
    if (!body) {
      return errorResponse('Invalid request body', 'Request body is required', 400);
    }
    
    // Validate request body
    const validation = profileUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    
    // Connect to database
    await connectDB();
    
    // Find and update user
    const user = await User.findById(userId);
    
    if (!user) {
      return notFoundResponse('User');
    }
    
    // Update fields
    const { fullName, phoneNumber, emergencyContacts, medicalNotes } = validation.data;
    
    if (fullName) user.fullName = fullName;
    if (phoneNumber) user.phoneNumber = formatPhoneNumberForStorage(phoneNumber);
    if (emergencyContacts) {
      user.emergencyContacts = emergencyContacts.map((c) => ({
        name: c.name,
        phoneNumber: formatPhoneNumberForStorage(c.phoneNumber),
      }));
    }
    if (medicalNotes) user.medicalNotes = medicalNotes;
    
    await user.save();
    
    // Get updated public profile
    const userResponse: IUserResponse = user.getPublicProfile();
    
    return successResponse(userResponse, 'Profile updated successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}

