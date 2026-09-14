import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Device from '@/models/Device';
import { requireAdmin } from '@/lib/auth';
import { formatPhoneNumberForStorage } from '@/lib/phone';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
  handleApiError,
  parseRequestBody,
} from '@/lib/api-helpers';

/**
 * GET /api/admin/users/[id]
 * Get full details of a specific registered user (Admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isAdmin) {
      return unauthorizedResponse(adminCheck.error || 'Admin privileges required');
    }

    const { id } = await params;
    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse('User not found');
    }

    const devices = await Device.find({ userId: user._id });

    return successResponse({
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role || 'user',
        emergencyContacts: user.emergencyContacts || [],
        medicalNotes: user.medicalNotes,
        devices: devices.map((d) => ({
          id: d._id.toString(),
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          status: d.status,
          registeredAt: d.registeredAt?.toISOString?.() || d.registeredAt,
          lastActive: d.lastActive?.toISOString?.() || d.lastActive,
        })),
        createdAt: user.createdAt?.toISOString?.() || user.createdAt,
        updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update a user's role or registration info (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isAdmin) {
      return unauthorizedResponse(adminCheck.error || 'Admin privileges required');
    }

    const { id } = await params;
    const body = await parseRequestBody<any>(request);

    if (!body) {
      return errorResponse('Request body is required', 'Bad Request', 400);
    }

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse('User not found');
    }

    // Role toggle safeguard: don't let current admin demote themselves
    if (body.role && (body.role === 'user' || body.role === 'admin')) {
      if (adminCheck.userId === user._id.toString() && body.role !== 'admin') {
        return errorResponse('You cannot remove your own admin privileges.', 'Forbidden', 403);
      }
      user.role = body.role;
    }

    if (body.fullName && typeof body.fullName === 'string') {
      user.fullName = body.fullName.trim();
    }

    if (body.phoneNumber && typeof body.phoneNumber === 'string') {
      user.phoneNumber = formatPhoneNumberForStorage(body.phoneNumber);
    }

    await user.save();

    return successResponse(
      {
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
        },
      },
      'User updated successfully'
    );
  } catch (error: any) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user registration and their linked devices (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isAdmin) {
      return unauthorizedResponse(adminCheck.error || 'Admin privileges required');
    }

    const { id } = await params;
    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return notFoundResponse('User not found');
    }

    // Safeguard: Do not allow current admin to delete their own account
    if (adminCheck.userId === user._id.toString()) {
      return errorResponse('You cannot delete your own admin account.', 'Forbidden', 403);
    }

    // Delete all devices registered to this user
    await Device.deleteMany({ userId: user._id });

    // Delete user
    await User.findByIdAndDelete(user._id);

    return successResponse(null, 'User registration and associated devices removed successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}

