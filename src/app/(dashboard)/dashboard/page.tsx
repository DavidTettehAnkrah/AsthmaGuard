'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IUserResponse, IDeviceResponse, IEmergencyAlertResponse } from '@/types';
import { getAuthHeaders, removeAuthToken, isAuthenticated } from '@/lib/client-auth';
import { sanitizePhoneInput, handlePhoneKeyDown, formatPhoneNumberForStorage } from '@/lib/phone';
import {
  Activity,
  Radio,
  Users,
  Cpu,
  AlertTriangle,
  Trash2,
  Edit3,
  Plus,
  X,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  User,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<IUserResponse | null>(null);
  const [devices, setDevices] = useState<IDeviceResponse[]>([]);
  const [alerts, setAlerts] = useState<IEmergencyAlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alertSending, setAlertSending] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Profile edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phoneNumber: '',
    emergencyContacts: [] as Array<{ name: string; phoneNumber: string }>,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Device edit modal state (for correcting MAC address / name)
  const [editingDevice, setEditingDevice] = useState<IDeviceResponse | null>(null);
  const [deviceFormData, setDeviceFormData] = useState({
    deviceId: '',
    deviceName: '',
  });
  const [deviceEditLoading, setDeviceEditLoading] = useState(false);
  const [deviceEditError, setDeviceEditError] = useState('');
  const [deviceEditSuccess, setDeviceEditSuccess] = useState('');

  useEffect(() => {
    // Check if authenticated
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      // Fetch user profile with auth headers
      const userResponse = await fetch('/api/user/profile', {
        headers: getAuthHeaders(),
      });

      if (userResponse.status === 401) {
        console.error('Authentication failed - token invalid or expired');
        removeAuthToken();
        router.push('/login');
        return;
      }

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.message || 'Failed to fetch profile');
      }

      const userData = await userResponse.json();
      const currentUser = userData.data;

      // Administrators are not patients; redirect them immediately to the Admin Portal
      if (currentUser?.role === 'admin') {
        router.replace('/admin');
        return;
      }

      setUser(currentUser);

      // Fetch devices with auth headers
      const devicesResponse = await fetch('/api/devices', {
        headers: getAuthHeaders(),
      });

      if (devicesResponse.status === 401) {
        removeAuthToken();
        router.push('/login');
        return;
      }

      if (!devicesResponse.ok) {
        const errorData = await devicesResponse.json();
        throw new Error(errorData.message || 'Failed to fetch devices');
      }

      const devicesData = await devicesResponse.json();
      setDevices(devicesData.data.devices);

      // Fetch emergency alert history with auth headers
      try {
        const alertsResponse = await fetch('/api/emergency/history?limit=10', {
          headers: getAuthHeaders(),
        });
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          setAlerts(alertsData.data.alerts);
        }
      } catch {
        // Alert history is non-critical, don't fail the whole page
        console.warn('Could not fetch alert history');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlert = async () => {
    if (!confirm('Are you sure you want to trigger an emergency alert? Immediate SMS notifications will be dispatched to you and all registered emergency contacts.')) return;

    setAlertSending(true);
    setAlertMessage('');

    try {
      const response = await fetch('/api/emergency/alert', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (response.status === 401) {
        removeAuthToken();
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send alert');
      }

      setAlertMessage(`✅ Emergency alert dispatched to ${data.data.sentCount} recipient(s) via Arkesel.`);
      // Refresh alert history
      fetchData();
    } catch (err: any) {
      setAlertMessage(`❌ ${err.message}`);
    } finally {
      setAlertSending(false);
    }
  };

  const handleLogout = async () => {
    removeAuthToken();
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch {
      // Ignore errors on logout
    }
    router.push('/login');
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to unpair and remove this device?')) return;

    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        headers: getAuthHeaders(),
        method: 'DELETE',
      });

      if (response.status === 401) {
        removeAuthToken();
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete device');
      }

      // Refresh devices list
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openEditDeviceModal = (device: IDeviceResponse) => {
    setEditingDevice(device);
    setDeviceFormData({
      deviceId: device.deviceId,
      deviceName: device.deviceName || '',
    });
    setDeviceEditError('');
    setDeviceEditSuccess('');
  };

  const handleUpdateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;

    setDeviceEditLoading(true);
    setDeviceEditError('');
    setDeviceEditSuccess('');

    try {
      const response = await fetch(`/api/devices/${editingDevice.id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: deviceFormData.deviceId.trim().toUpperCase(),
          deviceName: deviceFormData.deviceName.trim() || undefined,
        }),
      });

      if (response.status === 401) {
        removeAuthToken();
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update device MAC address');
      }

      setDeviceEditSuccess('Device MAC address updated successfully!');
      setTimeout(() => {
        setEditingDevice(null);
        setDeviceEditSuccess('');
        fetchData();
      }, 750);
    } catch (err: any) {
      setDeviceEditError(err.message || 'Failed to update device');
    } finally {
      setDeviceEditLoading(false);
    }
  };

  const openEditModal = () => {
    if (!user) return;
    setEditFormData({
      fullName: user.fullName || '',
      phoneNumber: user.phoneNumber || '',
      emergencyContacts:
        user.emergencyContacts && user.emergencyContacts.length > 0
          ? user.emergencyContacts.map((c) => ({ name: c.name, phoneNumber: c.phoneNumber }))
          : [{ name: '', phoneNumber: '' }],
    });
    setEditError('');
    setEditSuccess('');
    setIsEditModalOpen(true);
  };

  const handleAddContact = () => {
    if (editFormData.emergencyContacts.length >= 3) return;
    setEditFormData({
      ...editFormData,
      emergencyContacts: [...editFormData.emergencyContacts, { name: '', phoneNumber: '' }],
    });
  };

  const handleRemoveContact = (index: number) => {
    setEditFormData({
      ...editFormData,
      emergencyContacts: editFormData.emergencyContacts.filter((_, i) => i !== index),
    });
  };

  const handleContactChange = (index: number, field: 'name' | 'phoneNumber', value: string) => {
    const updated = [...editFormData.emergencyContacts];
    updated[index] = { ...updated[index], [field]: value };
    setEditFormData({
      ...editFormData,
      emergencyContacts: updated,
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    setEditSuccess('');

    // Filter out completely blank contact rows and format phone numbers for SMS
    const validContacts = editFormData.emergencyContacts
      .map((c) => ({
        name: c.name.trim(),
        phoneNumber: formatPhoneNumberForStorage(c.phoneNumber),
      }))
      .filter((c) => c.name || c.phoneNumber);

    // Validate that each specified contact has both name and phone
    for (let i = 0; i < validContacts.length; i++) {
      const c = validContacts[i];
      if (!c.name || !c.phoneNumber) {
        setEditError(`Emergency Contact #${i + 1} must have both a name and a phone number.`);
        setEditLoading(false);
        return;
      }
    }

    const formattedPrimaryPhone = formatPhoneNumberForStorage(editFormData.phoneNumber);
    if (!formattedPrimaryPhone || formattedPrimaryPhone.length < 10) {
      setEditError('Please enter a valid phone number with at least 10 digits.');
      setEditLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: editFormData.fullName.trim(),
          phoneNumber: formattedPrimaryPhone,
          emergencyContacts: validContacts,
        }),
      });

      if (response.status === 401) {
        removeAuthToken();
        router.push('/login');
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setUser(data.data);
      setEditSuccess('Profile updated successfully!');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditSuccess('');
      }, 1000);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Connecting to patient portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">{error}</p>
            <Button onClick={() => router.push('/login')} className="w-full bg-slate-900 text-white hover:bg-slate-800">
              Return to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeDeviceCount = devices.filter((d) => d.status === 'active').length;
  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : 'PT';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Clinical App Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand Logo & Context */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 tracking-tight text-base">AsthmaGuard</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Patient Portal
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">ESP32 Wrist-Wearable Monitoring &amp; Dispatch</p>
              </div>
            </div>

            {/* User Navigation */}
            <div className="flex items-center gap-3">
              {/* User Identity Chip */}
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-semibold text-xs flex items-center justify-center">
                  {userInitials}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">{user?.fullName}</p>
                  <p className="text-[11px] text-slate-500 leading-tight">Patient Account</p>
                </div>
              </div>

              {/* Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-xs h-8 px-2.5 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Status Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Paired Wearables */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center flex-shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Paired Hardware</p>
              <p className="text-base font-bold text-slate-900">
                {devices.length} {devices.length === 1 ? 'Wristband' : 'Wristbands'}
              </p>
              <p className="text-[11px] text-slate-500">{activeDeviceCount} active device</p>
            </div>
          </div>

          {/* Card 2: Emergency Contacts */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Emergency Contacts</p>
              <p className="text-base font-bold text-slate-900">
                {user?.emergencyContacts?.length || 0} Configured
              </p>
              <p className="text-[11px] text-slate-500">Ready for SMS dispatch</p>
            </div>
          </div>
        </section>

        {/* Core Layout Grid: 7 Cols (Hardware) + 5 Cols (Profile & Action) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Hardware) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Paired Wearables Card */}
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-slate-700" />
                    Paired Wearable Hardware
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Registered ESP32 wristbands paired to this patient record
                  </CardDescription>
                </div>
                <Link href="/devices/register">
                  <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 px-3">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Register Device
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-4">
                {devices.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed border-slate-200 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Radio className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">No Wearable Device Connected</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      Pair your ESP32 wristband to connect your wearable device and enable automatic emergency dispatch.
                    </p>
                    <Link href="/devices/register">
                      <Button variant="outline" size="sm" className="text-xs border-slate-300">
                        Register Your First Device
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {devices.map((device) => (
                      <div
                        key={device.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-sm font-semibold text-slate-900">
                              {device.deviceName || 'ESP32 Wearable'}
                            </h4>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                device.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {device.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700">
                              MAC: {device.deviceId}
                            </span>
                            <span>Registered: {new Date(device.registeredAt).toLocaleDateString()}</span>
                            {device.lastActive && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Last ping: {new Date(device.lastActive).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDeviceModal(device)}
                            className="text-xs h-8 text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            Edit MAC
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDevice(device.id)}
                            className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            Unpair
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Profile & Emergency Action Center) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Patient Profile Card */}
            <Card className="border-slate-200/80 shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-700" />
                    Patient Record
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">Registered personal details</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openEditModal}
                  className="text-xs h-7 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                    Full Name
                  </span>
                  <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                      Email Address
                    </span>
                    <p className="text-slate-700 font-medium truncate flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {user?.email}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                      Primary Phone
                    </span>
                    <p className="text-slate-700 font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {user?.phoneNumber}
                    </p>
                  </div>
                </div>

                {/* Emergency Contacts List */}
                <div className="pt-3 border-t border-slate-100">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-2">
                    Emergency Dispatch Contacts ({user?.emergencyContacts?.length || 0}/3)
                  </span>

                  {user?.emergencyContacts && user.emergencyContacts.length > 0 ? (
                    <div className="space-y-2">
                      {user.emergencyContacts.map((contact, index) => (
                        <div
                          key={index}
                          className="p-2 rounded-md bg-slate-50 border border-slate-200/80 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-slate-800 text-xs">{contact.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{contact.phoneNumber}</p>
                          </div>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                            Responder #{index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                      No emergency contacts configured yet. Click &quot;Edit&quot; to register contacts who will receive emergency SMS during an attack.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Action & Dispatch Card */}
            <Card className="border-rose-200 bg-white shadow-xs overflow-hidden">
              <CardHeader className="bg-rose-50/60 pb-3 border-b border-rose-100">
                <CardTitle className="text-sm font-bold text-rose-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Emergency Dispatch Center
                </CardTitle>
                <CardDescription className="text-xs text-rose-700/80">
                  Direct SMS broadcast to patient &amp; emergency responders via Arkesel
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  During an asthma emergency, the paired wristband automatically calls the alert endpoint. You can also trigger an immediate dispatch manually:
                </p>

                {alertMessage && (
                  <div
                    className={`text-xs p-3 rounded-lg border ${
                      alertMessage.startsWith('✅')
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                  >
                    {alertMessage}
                  </div>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-10 shadow-sm"
                  onClick={handleSendAlert}
                  disabled={alertSending || devices.length === 0}
                >
                  {alertSending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Dispatching Alert...
                    </span>
                  ) : devices.length === 0 ? (
                    'Register a Device to Enable Dispatch'
                  ) : (
                    'Broadcast Emergency Alert Now'
                  )}
                </Button>

                {/* Recent Alerts Audit Log */}
                {alerts.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Recent Dispatch Logs
                    </p>
                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {alerts.slice(0, 4).map((alert) => (
                        <div key={alert.id} className="py-2 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                          <div>
                            <span
                              className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                                alert.status === 'sent'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : alert.status === 'partial'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {alert.status}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-2">
                              {alert.recipients?.length || 1} recipients
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(alert.createdAt).toLocaleDateString()} {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Edit Device MAC Address Modal */}
      {editingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Update Device MAC Address</h3>
                  <p className="text-[11px] text-slate-500">Correct hardware identifier or device label</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-200 transition-colors"
                disabled={deviceEditLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateDevice} className="p-6 space-y-4">
              {deviceEditError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                  <span>{deviceEditError}</span>
                </div>
              )}

              {deviceEditSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                  <span>{deviceEditSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="editDeviceId" className="text-xs font-semibold text-slate-700">
                  Device MAC Address / Identifier *
                </Label>
                <Input
                  id="editDeviceId"
                  type="text"
                  placeholder="e.g. AA:BB:CC:DD:EE:FF or ESP32-WRIST-001"
                  value={deviceFormData.deviceId}
                  onChange={(e) => setDeviceFormData({ ...deviceFormData, deviceId: e.target.value })}
                  required
                  disabled={deviceEditLoading}
                  className="h-9 text-xs font-mono border-slate-200 focus-visible:ring-slate-900"
                />
                <p className="text-[11px] text-slate-400">
                  Update the 12-character MAC address if a mistake was made during initial pairing.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editDeviceName" className="text-xs font-semibold text-slate-700">
                  Device Nickname (Optional)
                </Label>
                <Input
                  id="editDeviceName"
                  type="text"
                  placeholder="e.g. Daily Wristband"
                  value={deviceFormData.deviceName}
                  onChange={(e) => setDeviceFormData({ ...deviceFormData, deviceName: e.target.value })}
                  disabled={deviceEditLoading}
                  className="h-9 text-xs border-slate-200 focus-visible:ring-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingDevice(null)}
                  disabled={deviceEditLoading}
                  className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={deviceEditLoading}
                  className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-8 min-w-[90px]"
                >
                  {deviceEditLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    'Update Device'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Patient Record</h3>
                <p className="text-xs text-slate-500">Update personal information and emergency responders</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 hover:bg-slate-200 transition-colors"
                disabled={editLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded-lg text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                  <span>{editSuccess}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="editFullName" className="text-xs font-semibold text-slate-700">
                    Full Name *
                  </Label>
                  <Input
                    id="editFullName"
                    type="text"
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    required
                    disabled={editLoading}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="editEmail" className="text-xs font-semibold text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="h-9 text-xs bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200"
                  />
                  <p className="text-[11px] text-slate-400">Account login email is permanent and cannot be modified.</p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="editPhone" className="text-xs font-semibold text-slate-700">
                    Phone Number *
                  </Label>
                  <Input
                    id="editPhone"
                    type="tel"
                    placeholder="e.g. 0201012020 or +233XXXXXXXXX"
                    value={editFormData.phoneNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: sanitizePhoneInput(e.target.value) })}
                    onKeyDown={handlePhoneKeyDown}
                    maxLength={16}
                    required
                    disabled={editLoading}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
              </div>

              {/* Emergency Contacts Section */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Emergency Contacts ({editFormData.emergencyContacts.length}/3)</h4>
                    <p className="text-[11px] text-slate-500">Will receive immediate SMS broadcast during an alert</p>
                  </div>
                  {editFormData.emergencyContacts.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddContact}
                      disabled={editLoading}
                      className="text-xs h-7 px-2 border-slate-300 text-slate-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Contact
                    </Button>
                  )}
                </div>

                {editFormData.emergencyContacts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No emergency contacts added yet. Click &quot;Add Contact&quot; to add one.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {editFormData.emergencyContacts.map((contact, index) => (
                      <div key={index} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-slate-700">
                            Emergency Contact #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(index)}
                            disabled={editLoading}
                            className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Remove contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-slate-600" htmlFor={`contact-name-${index}`}>
                              Name
                            </Label>
                            <Input
                              id={`contact-name-${index}`}
                              type="text"
                              placeholder="e.g. Jane Doe"
                              value={contact.name}
                              onChange={(e) => handleContactChange(index, 'name', e.target.value)}
                              disabled={editLoading}
                              className="h-8 text-xs border-slate-200 bg-white mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px] text-slate-600" htmlFor={`contact-phone-${index}`}>
                              Phone Number
                            </Label>
                            <Input
                              id={`contact-phone-${index}`}
                              type="tel"
                              placeholder="e.g. 0201012020 or +233XXXXXXXXX"
                              value={contact.phoneNumber}
                              onChange={(e) => handleContactChange(index, 'phoneNumber', sanitizePhoneInput(e.target.value))}
                              onKeyDown={handlePhoneKeyDown}
                              maxLength={16}
                              disabled={editLoading}
                              className="h-8 text-xs border-slate-200 bg-white mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editLoading}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={editLoading}
                  className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-9 min-w-[100px]"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
