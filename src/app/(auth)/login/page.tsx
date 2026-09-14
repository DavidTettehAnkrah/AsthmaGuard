'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setAuthToken, removeAuthToken } from '@/lib/client-auth';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clear any existing session token when visiting login page
  useEffect(() => {
    removeAuthToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      const token = data.data?.token;
      if (token) {
        setAuthToken(token);
      } else {
        throw new Error('No authentication token received');
      }

      const userRole = data.data?.user?.role;
      const destination = userRole === 'admin' ? '/admin' : '/dashboard';

      setSuccess(`Login successful! Redirecting to ${userRole === 'admin' ? 'admin portal' : 'dashboard'}...`);

      setTimeout(() => {
        router.push(destination);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
      {/* Top Brand Logo & Title */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-xs mb-3">
          <Activity className="w-6 h-6" />
        </div>
        <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-slate-900 text-center">
          Sign into <span className="font-semibold">AsthmaGuard</span>
        </h1>
        <p className="text-sm text-slate-500 font-normal mt-1">
          to continue to Patient Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-md text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded-md text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-normal text-slate-800">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
              className="h-9 px-3 text-sm rounded-md border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="password" className="text-sm font-normal text-slate-800">
                Password
              </Label>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={loading}
                className="h-9 px-3 pr-10 text-sm rounded-md border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                disabled={loading}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-9 bg-[#2da44e] hover:bg-[#2c974b] text-white font-medium text-sm rounded-md shadow-xs transition-colors mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </div>

      {/* Secondary Card / Link */}
      <div className="w-full max-w-sm border border-slate-200 rounded-lg p-4 text-center text-sm bg-white mt-4 shadow-xs text-slate-700">
        New to AsthmaGuard?{' '}
        <Link href="/register" className="text-emerald-700 hover:underline font-semibold">
          Create an account
        </Link>
      </div>
    </div>
  );
}
