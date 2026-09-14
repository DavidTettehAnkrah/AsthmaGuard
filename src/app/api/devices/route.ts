import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Device from '@/models/Device';
import { deviceRegisterSchema } from '@/lib/validations';
import { verifyToken } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  conflictResponse,
  handleApiError,
  parseRequestBody,
  getUserIdFromHeaders,
  extractAuthToken,
} from '@/lib/api-helpers';
import { IDeviceResponse, IDeviceRegisterRequest } from '@/types';

/**
 * GET /api/devices
 * Get all devices for the current user
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
    
    // Find all devices for user
    const devices = await Device.findByUser(userId);
    
    // Convert to response format
    const devicesResponse: IDeviceResponse[] = devices.map(device => device.getPublicInfo());
    
    return successResponse(
      { devices: devicesResponse, count: devices.length },
      'Devices retrieved successfully'
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * POST /api/devices
 * Register a new device for the current user
 */
export async function POST(request: NextRequest) {
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
    
    // Parse request body
    const body = await parseRequestBody<IDeviceRegisterRequest>(request);
    
    if (!body) {
      return errorResponse('Invalid request body', 'Request body is required', 400);
    }
    
    // Validate request body
    const validation = deviceRegisterSchema.safeParse(body);
    
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    
    const { deviceId, deviceName, metadata } = validation.data;
    
    // Connect to database
    await connectDB();
    
    // Check if device ID already exists
    const existingDevice = await Device.deviceIdExists(deviceId);
    
    if (existingDevice) {
      return conflictResponse('Device with this ID is already registered');
    }
    
    // Check if user already has a device (enforce one device per user initially)
    const userHasDevice = await Device.userHasDevice(userId);
    
    if (userHasDevice) {
      return conflictResponse('You already have a device registered. Please delete the existing device first.');
    }
    
    // Create new device
    const device = new Device({
      deviceId,
      userId,
      deviceName,
      metadata,
      status: 'active',
    });
    
    await device.save();
    
    // Get public device info
    const deviceResponse: IDeviceResponse = device.getPublicInfo();
    
    return successResponse(
      deviceResponse,
      'Device registered successfully',
      201
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}

// Made with Bob
