import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import EmergencyAlert from '@/models/EmergencyAlert';
import { verifyToken } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  handleApiError,
  extractAuthToken,
} from '@/lib/api-helpers';

/**
 * GET /api/emergency/history
 * Get the current user's emergency alert history.
 * Query params: ?limit=10
 */
export async function GET(request: NextRequest) {
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

    // Parse limit from query params
    const url = new URL(request.url);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(url.searchParams.get('limit') || '10'))
    );

    // Connect to database
    await connectDB();

    // Find alerts for this user
    const alerts = await EmergencyAlert.findByUser(userId, limit);

    // Convert to response format
    const alertsResponse = alerts.map((alert: any) => alert.getPublicInfo());

    return successResponse(
      { alerts: alertsResponse, count: alerts.length },
      'Alert history retrieved successfully'
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}


