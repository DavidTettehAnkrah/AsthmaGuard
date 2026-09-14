'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sanitizePhoneInput, handlePhoneKeyDown, formatPhoneNumberForStorage } from '@/lib/phone';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'user' | 'admin',
    adminSecretCode: '',
    emergencyContact1Name: '',
    emergencyContact1Phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate admin access code if registering as administrator
    if (formData.role === 'admin' && !formData.adminSecretCode.trim()) {
      setError('Admin access code is required for administrator registration');
      setLoading(false);
      return;
    }

    // Format phone number for storage and SMS messages
    const formattedPhone = formatPhoneNumberForStorage(formData.phoneNumber);
    if (!formattedPhone || formattedPhone.length < 10) {
      setError('Please provide a valid phone number with at least 10 digits.');
      setLoading(false);
      return;
    }

    // Prepare emergency contacts (only applicable for patient user accounts)
    const emergencyContacts = [];
    if (formData.role === 'user' && formData.emergencyContact1Name && formData.emergencyContact1Phone) {
      emergencyContacts.push({
        name: formData.emergencyContact1Name.trim(),
        phoneNumber: formatPhoneNumberForStorage(formData.emergencyContact1Phone),
      });
    }

    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phoneNumber: formattedPhone,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      role: formData.role,
      adminSecretCode: formData.role === 'admin' ? formData.adminSecretCode.trim() : undefined,
      emergencyContacts,
    };

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccess('Account created successfully! Redirecting to login...');

      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration');
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
          Join <span className="font-semibold">AsthmaGuard</span>
        </h1>
        <p className="text-sm text-slate-500 font-normal mt-1">
          {formData.role === 'admin' ? 'Create an administrator account' : 'Create your patient monitoring account'}
        </p>
      </div>

      {/* Main Register Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
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

          {/* Account Type Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Account Type</Label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-md border border-slate-200">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'user', adminSecretCode: '' })}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded transition-all ${
                  formData.role === 'user'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Patient / User
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'admin' })}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium rounded transition-all ${
                  formData.role === 'admin'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrator
              </button>
            </div>
          </div>

          {/* Admin Secret Access Code (Only when Administrator is selected) */}
          {formData.role === 'admin' && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-md space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="adminSecretCode" className="text-xs font-medium text-amber-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Admin Secret Access Code *
                </Label>
                <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Security Key</span>
              </div>
              <div className="relative">
                <Input
                  id="adminSecretCode"
                  type={showAdminCode ? 'text' : 'password'}
                  placeholder="Enter admin registration secret code"
                  value={formData.adminSecretCode}
                  onChange={(e) => setFormData({ ...formData, adminSecretCode: e.target.value })}
                  required
                  disabled={loading}
                  className="h-9 px-3 pr-9 text-xs rounded-md border-amber-300 bg-white focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminCode(!showAdminCode)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  disabled={loading}
                  tabIndex={-1}
                  title={showAdminCode ? 'Hide code' : 'Show code'}
                >
                  {showAdminCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-amber-800/80 leading-relaxed">
                Requires the authorized administrative access code configured on the server.
              </p>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-normal text-slate-800">
              Full name *
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="e.g. Jane Doe"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              disabled={loading}
              className="h-9 px-3 text-sm rounded-md border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-normal text-slate-800">
              Email address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
              className="h-9 px-3 text-sm rounded-md border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber" className="text-sm font-normal text-slate-800">
              Phone number *
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="e.g. 0201012020 or +233XXXXXXXXX"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: sanitizePhoneInput(e.target.value) })}
              onKeyDown={handlePhoneKeyDown}
              maxLength={16}
              required
              disabled={loading}
              className="h-9 px-3 text-sm rounded-md border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
            />
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-normal text-slate-800">
                Password *
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  className="h-9 px-3 pr-9 text-sm rounded-md border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  disabled={loading}
                  tabIndex={-1}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-normal text-slate-800">
                Confirm *
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={loading}
                  className="h-9 px-3 pr-9 text-sm rounded-md border-slate-300 bg-white focus-visible:ring-1 focus-visible:ring-emerald-600 focus-visible:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  disabled={loading}
                  tabIndex={-1}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Min 8 characters with uppercase, lowercase, and number.
          </p>

          {/* Optional Emergency Contact (Only for Patient / User accounts) */}
          {formData.role === 'user' && (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Initial Emergency Contact (Optional)</p>
                <p className="text-[11px] text-slate-400">Will receive alert SMS notifications during emergencies.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="emergencyContact1Name" className="text-xs text-slate-600">
                    Contact Name
                  </Label>
                  <Input
                    id="emergencyContact1Name"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={formData.emergencyContact1Name}
                    onChange={(e) => setFormData({ ...formData, emergencyContact1Name: e.target.value })}
                    disabled={loading}
                    className="h-8 px-2.5 text-xs rounded-md border-slate-300 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="emergencyContact1Phone" className="text-xs text-slate-600">
                    Contact Phone
                  </Label>
                  <Input
                    id="emergencyContact1Phone"
                    type="tel"
                    placeholder="e.g. 0201012020 or +233XXXXXXXXX"
                    value={formData.emergencyContact1Phone}
                    onChange={(e) => setFormData({ ...formData, emergencyContact1Phone: sanitizePhoneInput(e.target.value) })}
                    onKeyDown={handlePhoneKeyDown}
                    maxLength={16}
                    disabled={loading}
                    className="h-8 px-2.5 text-xs rounded-md border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-9 bg-[#2da44e] hover:bg-[#2c974b] text-white font-medium text-sm rounded-md shadow-xs transition-colors mt-2"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              'Create account'
            )}
          </Button>
        </form>
      </div>

      {/* Secondary Card / Link */}
      <div className="w-full max-w-md border border-slate-200 rounded-lg p-4 text-center text-sm bg-white mt-4 shadow-xs text-slate-700">
        Already have an account?{' '}
        <Link href="/login" className="text-emerald-700 hover:underline font-semibold">
          Sign in
        </Link>
      </div>
    </div>
  );
}
