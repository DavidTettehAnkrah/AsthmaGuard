import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Device from '@/models/Device';
import { requireAdmin } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  errorResponse,
  handleApiError,
} from '@/lib/api-helpers';

/**
 * GET /api/admin/users
 * Search and list all registered users with their devices and statistics (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isAdmin) {
      return unauthorizedResponse(adminCheck.error || 'Admin privileges required');
    }

    await connectDB();

    // Automatically backfill any pre-existing users that do not have a role field
    await User.updateMany(
      { $or: [{ role: { $exists: false } }, { role: null }, { role: '' }] },
      { $set: { role: 'user' } }
    );

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const roleFilter = searchParams.get('role')?.trim() || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));

    // Base filter: 'user' matches any patient account (non-admin or explicit 'user')
    const filter: any = {};
    if (roleFilter === 'user') {
      filter.role = { $ne: 'admin' };
    } else if (roleFilter === 'admin') {
      filter.role = 'admin';
    }

    // If search query is provided, check if it matches device ID first
    let userIdsFromDeviceMatch: string[] = [];
    if (query) {
      const matchingDevices = await Device.find({
        deviceId: { $regex: query, $options: 'i' },
      }).select('userId');
      userIdsFromDeviceMatch = matchingDevices.map((d) => d.userId.toString());

      filter.$or = [
        { fullName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phoneNumber: { $regex: query, $options: 'i' } },
        ...(userIdsFromDeviceMatch.length > 0 ? [{ _id: { $in: userIdsFromDeviceMatch } }] : []),
      ];
    }

    const totalMatching = await User.countDocuments(filter);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Fetch devices for the retrieved users
    const userIds = users.map((u) => u._id);
    const devices = await Device.find({ userId: { $in: userIds } });

    // Group devices by userId
    const deviceMap = new Map<string, any[]>();
    devices.forEach((d) => {
      const uid = d.userId.toString();
      if (!deviceMap.has(uid)) {
        deviceMap.set(uid, []);
      }
      deviceMap.get(uid)!.push({
        id: d._id.toString(),
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        status: d.status,
        registeredAt: d.registeredAt?.toISOString?.() || d.registeredAt,
        lastActive: d.lastActive?.toISOString?.() || d.lastActive,
      });
    });

    // Format user response list
    const userList = users.map((u) => ({
      id: u._id.toString(),
      fullName: u.fullName,
      email: u.email,
      phoneNumber: u.phoneNumber,
      role: u.role || 'user',
      emergencyContacts: u.emergencyContacts || [],
      medicalNotes: u.medicalNotes,
      devices: deviceMap.get(u._id.toString()) || [],
      createdAt: u.createdAt?.toISOString?.() || u.createdAt,
      updatedAt: u.updatedAt?.toISOString?.() || u.updatedAt,
    }));

    // Aggregate overall statistics
    const [totalUsers, totalAdmins, totalPatients, totalDevices] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: { $ne: 'admin' } }),
      Device.countDocuments(),
    ]);

    return successResponse({
      users: userList,
      stats: {
        totalUsers,
        totalAdmins,
        totalPatients,
        totalDevices,
      },
      pagination: {
        page,
        limit,
        totalMatching,
        totalPages: Math.ceil(totalMatching / limit) || 1,
      },
    });
  } catch (error: any) {
    return handleApiError(error);
  }
}

