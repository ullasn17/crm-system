'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Store,
  Layers,
  CheckCircle2,
  Key,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

const ROLES_INFO = [
  {
    role: 'Admin',
    email: 'admin@crmsystem.local',
    pass: 'AdminSecurePass123!',
    tag: 'Executive',
    badgeVariant: 'amber' as const,
    desc: 'Consolidated overview, store switcher, users & security audit logs.',
  },
  {
    role: 'Store Manager',
    email: 'manager@crmsystem.local',
    pass: 'DemoUser123!',
    tag: 'Branch Lead',
    badgeVariant: 'indigo' as const,
    desc: 'Branch inventory, returns approval & sales performance.',
  },
  {
    role: 'Staff',
    email: 'staff@crmsystem.local',
    pass: 'DemoUser123!',
    tag: 'Sales & CRM',
    badgeVariant: 'success' as const,
    desc: 'Customer onboarding, lead pipeline conversion & tasks.',
  },
  {
    role: 'Counter',
    email: 'counter@crmsystem.local',
    pass: 'DemoUser123!',
    tag: 'POS Cashier',
    badgeVariant: 'info' as const,
    desc: 'Fast barcode search, instant billing receipts & cash tally.',
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Retrieve & Reset Forgotten Password Modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password, rememberMe);
    setLoading(false);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  const handleRetrieveAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (forgotNewPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    setForgotLoading(true);
    try {
      // Step 1: Request reset token for the corporate email
      const forgotRes = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const forgotJson = await forgotRes.json();
      const token = forgotJson.data?.resetToken || forgotJson.data?.demoResetToken;

      if (!forgotJson.success || !token) {
        setForgotError(forgotJson.error || 'No registered employee account found with this email.');
        return;
      }

      // Step 2: Immediately apply the new password with the token
      const resetRes = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: forgotNewPassword }),
      });
      const resetJson = await resetRes.json();

      if (resetJson.success) {
        setForgotSuccess('Password updated successfully! Form updated. You can now sign in.');
        setEmail(forgotEmail.trim().toLowerCase());
        setPassword(forgotNewPassword);
        setTimeout(() => {
          setShowForgotModal(false);
        }, 1200);
      } else {
        setForgotError(resetJson.error || 'Failed to update password.');
      }
    } catch {
      setForgotError('Communication error retrieving password');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSelectRole = (r: typeof ROLES_INFO[0]) => {
    setSelectedRole(r.role);
    setEmail(r.email);
    setPassword(r.pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-white font-sans antialiased">
      {/* Top Header */}
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#222222] text-white flex items-center justify-center font-bold text-xs tracking-tight">
            SP
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-white">StorePulse CRM</span>
            <span className="text-[11px] text-[#888888] ml-2 hidden sm:inline">Enterprise Retail OS</span>
          </div>
        </div>

        <Link
          href="/branches"
          className="text-xs text-[#888888] hover:text-white font-medium transition flex items-center gap-1.5"
        >
          <span>Store Branches Network</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-5xl mx-auto my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Quick Role Presets & Architecture info */}
        <div className="lg:col-span-6 space-y-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141414] border border-[#222222] text-xs text-[#888888] mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span className="text-zinc-300">Multi-Tenant Production CRM v2.4</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-snug">
              Commercial Retail &amp; Enterprise Customer Relationship Management
            </h1>
            <p className="text-xs sm:text-sm text-[#888888] mt-2 leading-relaxed">
              Consolidated multi-branch operations, real-time inventory control, POS cashier billing, and strict 4-tier Role-Based Access Control.
            </p>
          </div>

          {/* Quick Demo Role Selectors */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#888888] uppercase tracking-wider">
                1-Click Role Accounts
              </span>
              <span className="text-[11px] text-[#888888]">Select to auto-populate credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLES_INFO.map((r) => {
                const isSelected = selectedRole === r.role || email === r.email;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleSelectRole(r)}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer bg-[#141414] ${
                      isSelected
                        ? 'border-white ring-1 ring-white shadow-xs'
                        : 'border-[#222222] hover:border-[#333333]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white">{r.role}</span>
                      <Badge variant={r.badgeVariant} size="sm">
                        {r.tag}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#888888] font-mono truncate">{r.email}</p>
                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Clean Enterprise Sign In Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-[#141414] rounded-2xl p-6 sm:p-7 border border-[#222222] shadow-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
              <p className="text-xs text-[#888888] mt-0.5">
                Enter your corporate credentials to access your designated workspace.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-400 flex items-start gap-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="name@crmsystem.local"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#444444] transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email || '');
                      setForgotNewPassword('');
                      setForgotConfirmPassword('');
                      setForgotError('');
                      setForgotSuccess('');
                      setShowForgotModal(true);
                    }}
                    className="text-xs text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-9 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#444444] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#2A2A2A] bg-[#181818] text-white focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Keep session active</span>
                </label>
                <span className="text-[11px] font-mono text-zinc-600">Argon2 / SHA-256</span>
              </div>

              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                className="w-full mt-2 text-white"
                size="md"
              >
                <span className="text-white font-semibold">Sign In to Workspace</span>
                <ArrowRight className="w-4 h-4 ml-1.5 text-white" />
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-[#222222] flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1 font-medium text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Encrypted RBAC Session</span>
              </span>
              <span>Next.js 16 App Router</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-6xl mx-auto py-3 text-center text-xs text-zinc-600">
        <span>StorePulse Enterprise CRM &copy; 2026 &bull; Professional Retail Operations Platform</span>
      </div>

      {/* RETRIEVE / RESET FORGOTTEN PASSWORD MODAL */}
      {showForgotModal && (
        <Modal
          isOpen={showForgotModal}
          onClose={() => {
            if (!forgotLoading) {
              setShowForgotModal(false);
              setForgotError('');
              setForgotSuccess('');
            }
          }}
          title="Retrieve & Reset Forgotten Password"
          description="Enter your registered employee email to set a new password and regain access to your workspace."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs text-white">
            {forgotSuccess && (
              <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotError && (
              <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{forgotError}</span>
              </div>
            )}

            <form onSubmit={handleRetrieveAndReset} className="space-y-3.5">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Registered Corporate Email *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. rahul@crmsystem.local or admin@crmsystem.local"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#444444]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">New Password (min 8 chars) *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#444444]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Confirm New Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#444444]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#222222]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  disabled={forgotLoading}
                  onClick={() => setShowForgotModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  loading={forgotLoading}
                >
                  Reset &amp; Sign In
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
