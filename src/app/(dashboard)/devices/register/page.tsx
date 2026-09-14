'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthHeaders, isAuthenticated, removeAuthToken } from '@/lib/client-auth';
import { Activity, ArrowLeft, Cpu, Tag, Box, Layers, AlertCircle, Info } from 'lucide-react';

export default function RegisterDevicePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    deviceId: '',
    deviceName: '',
    model: '',
    firmwareVersion: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check authentication on mount and verify with server
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetch('/api/user/profile', { headers: getAuthHeaders() }).then((res) => {
      if (res.status === 401) {
        removeAuthToken();
        router.push('/login');
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      deviceId: formData.deviceId.trim(),
      deviceName: formData.deviceName.trim() || undefined,
      metadata: {
        model: formData.model.trim() || undefined,
        firmwareVersion: formData.firmwareVersion.trim() || undefined,
      },
    };

    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 401) {
        removeAuthToken();
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Device registration failed');
      }

      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during device registration');
    } finally {
      setLoading(false);
    }
  };

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

            {/* Back to Dashboard Action */}
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Dashboard</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Registration Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-slate-200/80 bg-white shadow-xs">
          <CardHeader className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">Pair Wearable Hardware</CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Register your ESP32 wristband MAC address to link your hardware device with this patient record
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="pt-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-3 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Device ID */}
              <div className="space-y-1.5">
                <Label htmlFor="deviceId" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-slate-500" />
                  Device Identifier (MAC Address or Serial) *
                </Label>
                <Input
                  id="deviceId"
                  type="text"
                  placeholder="e.g. AA:BB:CC:DD:EE:FF or ESP32-WRIST-001"
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  required
                  disabled={loading}
                  className="h-9 text-xs font-mono border-slate-200 focus-visible:ring-slate-900"
                />
                <p className="text-[11px] text-slate-400">
                  Enter the unique MAC address (e.g. AA:BB:CC:DD:EE:FF) printed on your ESP32 wristband hardware
                </p>
              </div>

              {/* Device Friendly Name */}
              <div className="space-y-1.5">
                <Label htmlFor="deviceName" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  Device Nickname (Optional)
                </Label>
                <Input
                  id="deviceName"
                  type="text"
                  placeholder="e.g. Daily Wristband"
                  value={formData.deviceName}
                  onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                  disabled={loading}
                  className="h-9 text-xs border-slate-200 focus-visible:ring-slate-900"
                />
                <p className="text-[11px] text-slate-400">
                  A recognizable label to identify this device in your patient dashboard
                </p>
              </div>

              {/* Model & Firmware Version */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="model" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-slate-500" />
                    Hardware Model (Optional)
                  </Label>
                  <Input
                    id="model"
                    type="text"
                    placeholder="ESP32-WROOM-32"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    disabled={loading}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="firmwareVersion" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    Firmware Version (Optional)
                  </Label>
                  <Input
                    id="firmwareVersion"
                    type="text"
                    placeholder="v1.0.0"
                    value={formData.firmwareVersion}
                    onChange={(e) => setFormData({ ...formData, firmwareVersion: e.target.value })}
                    disabled={loading}
                    className="h-9 text-xs border-slate-200 focus-visible:ring-slate-900"
                  />
                </div>
              </div>

              {/* Clinical Hardware Pairing Instructions */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 text-xs font-semibold">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Hardware Pairing Instructions</span>
                </div>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside pl-1">
                  <li>Power on the ESP32 wristband device and verify battery level</li>
                  <li>Locate the 12-character MAC address displayed on the device startup screen</li>
                  <li>Input the MAC address in the field above exactly as shown</li>
                  <li>Click &quot;Pair Device&quot; to link the wristband to your emergency response profile</li>
                </ol>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2 pb-6 border-t border-slate-100">
              <div className="flex gap-3 w-full">
                <Link href="/dashboard" className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-xs h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs h-9"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Pairing Device...
                    </span>
                  ) : (
                    'Pair Device'
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Note: Each patient profile connects to one active wrist-wearable. You can unpair and pair a new device anytime.
              </p>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  );
}
