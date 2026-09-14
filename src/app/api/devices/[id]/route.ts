import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Device from '@/models/Device';
import { deviceUpdateSchema } from '@/lib/validations';
import { verifyToken } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  forbiddenResponse,
  handleApiError,
  parseRequestBody,
  getUserIdFromHeaders,
  extractAuthToken,
} from '@/lib/api-helpers';
import { IDeviceResponse } from '@/types';

/**
 * GET /api/devices/[id]
 * Get a specific device by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const token = extractAuthToken(request);

    if (!token) {
      return errorResponse('No token provided', 'Unauthorized', 401);
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return errorResponse('Invalid or expired token', 'Unauthorized', 401);
    }
    const userId = decoded.userId;
    
    // Connect to database
    await connectDB();
    
    // Find device
    const device = await Device.findById(id);
    
    if (!device) {
      return notFoundResponse('Device');
    }
    
    // Check if device belongs to user
    if (device.userId.toString() !== userId) {
      return forbiddenResponse('You do not have access to this device');
    }
    
    // Get public device info
    const deviceResponse: IDeviceResponse = device.getPublicInfo();
    
    return successResponse(deviceResponse, 'Device retrieved successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/devices/[id]
 * Update a specific device
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const validation = deviceUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      return validationErrorResponse(validation.error);
    }
    
    // Connect to database
    await connectDB();
    
    // Find device
    const device = await Device.findById(id);
    
    if (!device) {
      return notFoundResponse('Device');
    }
    
    // Check if device belongs to user
    if (device.userId.toString() !== userId) {
      return forbiddenResponse('You do not have access to this device');
    }
    
    // Update fields
    const { deviceId, deviceName, status, metadata } = validation.data;
    
    if (deviceId !== undefined) {
      const normalizedDeviceId = deviceId.trim().toUpperCase();
      if (normalizedDeviceId !== device.deviceId) {
        // Check if another device already uses this MAC address / deviceId
        const existingDevice = await Device.findOne({
          deviceId: normalizedDeviceId,
          _id: { $ne: device._id },
        });
        if (existingDevice) {
          return errorResponse('This Device ID / MAC address is already registered to another device', 'Conflict', 409);
        }
        device.deviceId = normalizedDeviceId;
      }
    }

    if (deviceName !== undefined) device.deviceName = deviceName;
    if (status !== undefined) device.status = status;
    if (metadata !== undefined) {
      device.metadata = { ...device.metadata, ...metadata };
    }
    
    await device.save();
    
    // Get updated public device info
    const deviceResponse: IDeviceResponse = device.getPublicInfo();
    
    return successResponse(deviceResponse, 'Device updated successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/devices/[id]
 * Delete a specific device
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    
    // Connect to database
    await connectDB();
    
    // Find device
    const device = await Device.findById(id);
    
    if (!device) {
      return notFoundResponse('Device');
    }
    
    // Check if device belongs to user
    if (device.userId.toString() !== userId) {
      return forbiddenResponse('You do not have access to this device');
    }
    
    // Delete device
    await Device.findByIdAndDelete(id);
    
    return successResponse(
      { id },
      'Device deleted successfully'
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}


