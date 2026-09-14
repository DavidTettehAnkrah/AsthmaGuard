'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Search,
  Users,
  ShieldCheck,
  Watch,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  RefreshCw,
  X,
  Radio,
  UserX,
  LogOut,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getAuthToken,
  getAuthHeaders,
  isAuthenticated,
  removeAuthToken,
} from '@/lib/client-auth';
import { IAdminUserItem, IAdminStats } from '@/types';

export default function AdminPortalPage() {
  const router = useRouter();
  const [users, setUsers] = useState<IAdminUserItem[]>([]);
  const [stats, setStats] = useState<IAdminStats>({
    totalUsers: 0,
    totalAdmins: 0,
    totalPatients: 0,
    totalDevices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [selectedUser, setSelectedUser] = useState<IAdminUserItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<IAdminUserItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch admin data
  const fetchAdminData = async (query = searchQuery, role = roleFilter) => {
    try {
      setLoading(true);
      setError('');

      if (!isAuthenticated()) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (role !== 'all') params.set('role', role);

      const response = await fetch(`/api/admin/users?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (response.status === 401 || response.status === 403) {
        // Not authorized as admin
        setError('Access denied. Administrator privileges required.');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to load registration data');
      }

      setUsers(result.data?.users || []);
      setStats(
        result.data?.stats || {
          totalUsers: 0,
          totalAdmins: 0,
          totalPatients: 0,
          totalDevices: 0,
        }
      );
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching registrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminData(searchQuery, roleFilter);
  };

  // Toggle user role
  const handleToggleRole = async (user: IAdminUserItem) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg =
      nextRole === 'admin'
        ? `Grant administrator privileges to ${user.fullName}?`
        : `Demote ${user.fullName} to regular patient user?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role: nextRole }),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user role');
      }

      setSuccess(`Role updated to ${nextRole} for ${user.fullName}`);
      setTimeout(() => setSuccess(''), 4000);
      fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Error updating user role');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user registration
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete user');
      }

      setSuccess(`User ${userToDelete.fullName} and associated devices removed successfully`);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      if (selectedUser?.id === userToDelete.id) {
        setIsDetailModalOpen(false);
        setSelectedUser(null);
      }
      setTimeout(() => setSuccess(''), 4000);
      fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  // Remove device from user
  const handleRemoveDevice = async (deviceId: string, deviceName: string) => {
    if (!window.confirm(`Are you sure you want to unlink and remove "${deviceName}" (${deviceId})?`)) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/devices/${deviceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove device');
      }

      setSuccess(`Device ${deviceName} removed successfully`);
      setTimeout(() => setSuccess(''), 4000);

      // Refresh selected user view
      if (selectedUser) {
        const updatedDevices = selectedUser.devices.filter((d) => d.id !== deviceId);
        setSelectedUser({ ...selectedUser, devices: updatedDevices });
      }
      fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove device');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    removeAuthToken();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Minimal Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-slate-900">AsthmaGuard</span>
              <span className="text-[10px] font-semibold bg-slate-900 text-white px-2 py-0.5 rounded tracking-wide uppercase">
                Admin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8 px-2.5 text-xs font-normal text-slate-600 border-slate-200 hover:text-slate-900"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Registrations Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and manage user accounts, roles, emergency contacts, and registered devices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAdminData()}
              disabled={loading}
              className="h-8 px-3 text-xs border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Global Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2.5 text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">Total Registrations</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{stats.totalUsers}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All registered accounts</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">Patient Accounts</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{stats.totalPatients}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active patient users</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">Administrators</span>
              <ShieldCheck className="w-4 h-4 text-slate-900" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{stats.totalAdmins}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">System admin accounts</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium">Registered Devices</span>
              <Watch className="w-4 h-4 text-sky-600" />
            </div>
            <p className="text-2xl font-semibold text-slate-900">{stats.totalDevices}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Wristband devices linked</p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="w-full sm:w-96 relative">
            <Input
              type="text"
              placeholder="Search name, email, phone, or MAC address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs border-slate-200 bg-slate-50 focus-visible:bg-white"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </form>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">Filter:</span>
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                roleFilter === 'all'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({stats.totalUsers})
            </button>
            <button
              onClick={() => setRoleFilter('user')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                roleFilter === 'user'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Patients ({stats.totalPatients})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                roleFilter === 'admin'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Admins ({stats.totalAdmins})
            </button>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Phone Number</th>
                  <th className="py-2.5 px-3">Registered Devices</th>
                  <th className="py-2.5 px-3">Emergency Contacts</th>
                  <th className="py-2.5 px-3">Registered Date</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                      Loading registrations...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <UserX className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                      No registrations found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const initials = user.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* User identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-[11px] shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{user.fullName}</p>
                              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role badge */}
                        <td className="py-3 px-3">
                          {user.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-900 text-white px-2 py-0.5 rounded">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              Patient
                            </span>
                          )}
                        </td>

                        {/* Phone Number */}
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {user.phoneNumber}
                        </td>

                        {/* Registered Devices */}
                        <td className="py-3 px-3">
                          {user.devices && user.devices.length > 0 ? (
                            <div className="space-y-1">
                              {user.devices.map((device) => (
                                <div key={device.id} className="flex items-center gap-1.5">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="font-mono text-[11px] text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                    {device.deviceId}
                                  </span>
                                  {device.deviceName && (
                                    <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                                      ({device.deviceName})
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No device linked</span>
                          )}
                        </td>

                        {/* Emergency Contacts count */}
                        <td className="py-3 px-3">
                          {user.emergencyContacts && user.emergencyContacts.length > 0 ? (
                            <span className="text-[11px] text-slate-700 font-medium">
                              {user.emergencyContacts.length}{' '}
                              {user.emergencyContacts.length === 1 ? 'contact' : 'contacts'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">None</span>
                          )}
                        </td>

                        {/* Registered Date */}
                        <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsDetailModalOpen(true);
                              }}
                              className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            >
                              Details
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleRole(user)}
                              disabled={actionLoading}
                              title={user.role === 'admin' ? 'Demote to Patient' : 'Promote to Admin'}
                              className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            >
                              {user.role === 'admin' ? 'Set Patient' : 'Set Admin'}
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setUserToDelete(user);
                                setIsDeleteModalOpen(true);
                              }}
                              disabled={actionLoading}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete user registration"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* User Details Modal */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Registration Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">User ID: {selectedUser.id}</p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 text-xs text-slate-700">
              {/* Account Overview */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Account</p>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-md border border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Full Name</span>
                    <span className="font-medium text-slate-900">{selectedUser.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Role</span>
                    <span className="font-medium text-slate-900 capitalize">{selectedUser.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Email</span>
                    <span className="font-mono text-slate-800">{selectedUser.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Primary Phone</span>
                    <span className="font-mono text-slate-800">{selectedUser.phoneNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Registered On</span>
                    <span>{new Date(selectedUser.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Emergency Contacts ({selectedUser.emergencyContacts?.length || 0})
                </p>
                {selectedUser.emergencyContacts && selectedUser.emergencyContacts.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.emergencyContacts.map((c, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-md"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{c.name}</p>
                          <p className="font-mono text-[11px] text-slate-500">{c.phoneNumber}</p>
                        </div>
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          SMS Alerts Active
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No emergency contacts registered.</p>
                )}
              </div>

              {/* Registered Devices */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Registered Devices ({selectedUser.devices?.length || 0})
                </p>
                {selectedUser.devices && selectedUser.devices.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.devices.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-md"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{device.deviceName || 'Wristband Device'}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 rounded text-slate-700">
                              {device.deviceId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Registered: {new Date(device.registeredAt).toLocaleDateString()}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveDevice(device.id, device.deviceName || device.deviceId)}
                          disabled={actionLoading}
                          className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No devices registered for this user.</p>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-8 px-3 text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 shadow-lg max-w-sm w-full p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Delete User Registration</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-slate-900">{userToDelete.fullName}</strong> ({userToDelete.email})?
                  All associated device registrations will also be unlinked.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                disabled={actionLoading}
                className="h-8 px-3 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteUser}
                disabled={actionLoading}
                className="h-8 px-3 text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {actionLoading ? 'Deleting...' : 'Delete Registration'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

