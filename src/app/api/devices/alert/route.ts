import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Device from '@/models/Device';
import { sendEmergencyAlert } from '@/lib/arkesel';
import {
  successResponse,
  errorResponse,
  handleApiError,
  parseRequestBody,
} from '@/lib/api-helpers';
import { IDeviceAlertRequest } from '@/types';

/**
 * POST /api/devices/alert
 * Endpoint for ESP32 devices to trigger an emergency alert.
 * Authenticates via the registered deviceId — no JWT required.
 *
 * Request body:
 * {
 *   "deviceId": "AA:BB:CC:DD:EE:FF",
 *   "sensorData": { "temperature": 37.5, "humidity": 65, ... },  // optional
 *   "message": "Custom alert message"  // optional
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await parseRequestBody<IDeviceAlertRequest>(request);

    if (!body || !body.deviceId) {
      return errorResponse(
        'Device ID is required',
        'Invalid request body',
        400
      );
    }

    const { deviceId, sensorData, message } = body;

    // Connect to database
    await connectDB();

    // Look up the device by its deviceId
    const device = await Device.findOne({
      deviceId: deviceId.toUpperCase(),
    });

    if (!device) {
      return errorResponse(
        'Device not found. Please register this device first.',
        'Device not registered',
        404
      );
    }

    // Check if device is active
    if (device.status !== 'active') {
      return errorResponse(
        'Device is inactive. Please activate it from the dashboard.',
        'Device inactive',
        403
      );
    }

    // Update device last active timestamp
    device.lastActive = new Date();
    await device.save();

    // Send emergency alert to user and their emergency contacts
    const result = await sendEmergencyAlert(
      device.userId.toString(),
      deviceId,
      sensorData,
      message
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
        deviceId: deviceId.toUpperCase(),
      },
      'Emergency alert sent successfully',
      201
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}



