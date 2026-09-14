import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Device from '@/models/Device';
import { requireAdmin } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  handleApiError,
} from '@/lib/api-helpers';

/**
 * DELETE /api/admin/devices/[id]
 * Remove / unassign a device registration (Admin only)
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

    const device = await Device.findById(id);
    if (!device) {
      return notFoundResponse('Device not found');
    }

    await Device.findByIdAndDelete(id);

    return successResponse(null, 'Device registration removed successfully');
  } catch (error: any) {
    return handleApiError(error);
  }
}

