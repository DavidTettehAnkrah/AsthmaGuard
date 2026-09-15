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
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[DEBUG 1] /api/devices/alert endpoint hit!");

    // Parse request body
    console.log("[DEBUG 2] Parsing request body...");
    const body = await parseRequestBody<IDeviceAlertRequest>(request);

    if (!body  !body.deviceId) {
      console.log("[DEBUG] Failed: Missing deviceId in request");
      return errorResponse(
        'Device ID is required',
        'Invalid request body',
        400
      );
    }

    const { deviceId, sensorData, message } = body;
    console.log(`[DEBUG 3] Payload extracted for device: ${deviceId}`);

    // Connect to database
    console.log("[DEBUG 4] Attempting to connect to the Database...");
    await connectDB();
    console.log("[DEBUG 5] -> Database connection successful!");

    // Look up the device by its deviceId
    console.log("[DEBUG 6] Querying device from database...");
    const device = await Device.findOne({
      deviceId: deviceId.toUpperCase(),
    });
    console.log("[DEBUG 7] -> Device query complete. Found:", !!device);

    if (!device) {
      console.log("[DEBUG] Failed: Device not found in database");
      return errorResponse(
        'Device not found. Please register this device first.',
        'Device not registered',
        404
      );
    }

    // Check if device is active
    if (device.status !== 'active') {
      console.log("[DEBUG] Failed: Device is marked as inactive");
      return errorResponse(
        'Device is inactive. Please activate it from the dashboard.',
        'Device inactive',
        403
      );
    }

    // Update device last active timestamp
    console.log("[DEBUG 8] Saving updated device status to DB...");
    device.lastActive = new Date();
    await device.save();
    console.log("[DEBUG 9] -> Device status saved!");

    // Send emergency alert to user and their emergency contacts
    console.log("[DEBUG 10] Attempting to send SMS via Arkesel...");
    const result = await sendEmergencyAlert(
      device.userId.toString(),
      deviceId,
      sensorData,
      message
    );
    console.log("[DEBUG 11] -> Arkesel response received! Success status:", result.success);

    if (!result.success) {
      console.log("[DEBUG] Failed: Arkesel API returned an error:", result.error);
      return errorResponse(
        result.error  'Failed to send emergency alert',
        'Alert failed',
        500
      );
    }

    console.log("[DEBUG 12] Sending HTTP 201 Success back to ESP32...");
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
    // This will catch exactly what went wrong and print it to Vercel logs
    console.error("!!! [FATAL ERROR CAUGHT] !!!", error.message, error);
    return handleApiError(error);
  }
}
