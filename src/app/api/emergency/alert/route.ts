import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Device from '@/models/Device';
import { sendEmergencyAlert } from '@/lib/arkesel';
import { verifyToken } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  handleApiError,
  parseRequestBody,
  extractAuthToken,
} from '@/lib/api-helpers';

/**
 * POST /api/emergency/alert
 * Trigger an emergency alert from the web app (authenticated via JWT).
 *
 * Request body:
 * {
 *   "deviceId": "AA:BB:CC:DD:EE:FF",  // optional — if omitted, uses user's first active device
 *   "message": "Custom alert message"  // optional
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate via JWT
    const token = extractAuthToken(request);

    if (!token) {
      return errorResponse('No token provided', 'Unauthorized', 401);
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return errorResponse('Invalid or expired token', 'Unauthorized', 401);
    }

    const userId = decoded.userId;

    // Parse request body (optional)
    const body = await parseRequestBody<{
      deviceId?: string;
      message?: string;
    }>(request);

    // Connect to database
    await connectDB();

    // Find the device
    let deviceId: string;

    if (body?.deviceId) {
      // Use the specified device and verify it belongs to this user
      const device = await Device.findOne({
        deviceId: body.deviceId.toUpperCase(),
        userId,
      });

      if (!device) {
        return errorResponse(
          'Device not found or does not belong to you',
          'Device not found',
          404
        );
      }

      deviceId = device.deviceId;
    } else {
      // Find user's first active device
      const devices = await Device.findActiveByUser(userId);

      if (!devices || devices.length === 0) {
        return errorResponse(
          'No active devices found. Please register a device first.',
          'No device',
          404
        );
      }

      deviceId = devices[0].deviceId;
    }

    // Send emergency alert
    const result = await sendEmergencyAlert(
      userId,
      deviceId,
      undefined,
      body?.message
    );

    if (!result.success) {
      return errorResponse(
        result.error || 'Failed to send emergency alert',
        'Alert failed',
        500
      );
    }

    return successResponse(
      {
        alertId: result.alertId,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        deviceId,
      },
      'Emergency alert sent successfully',
      201
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}


