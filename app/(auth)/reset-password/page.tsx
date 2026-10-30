'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, Store } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const json = await res.json();

      if (json.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(json.error || 'Failed to reset password');
      }
    } catch {
      setError('Failed to connect to reset service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#141414] rounded-2xl p-6 sm:p-8 border border-[#222222] shadow-2xl">
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition mb-5 font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to sign in</span>
      </Link>

      <h1 className="text-xl font-semibold text-white mb-1">Create new password</h1>
      <p className="text-xs text-[#888888] mb-6">
        Enter your authorization security token and specify your new password.
      </p>

      {success ? (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 flex items-start gap-3 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Password updated successfully</p>
            <p className="text-[11px] text-emerald-400/80 mt-0.5">Redirecting to sign-in portal...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Reset Security Token
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste security token here"
              className="w-full px-3 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-[#444444] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              New Password (minimum 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#444444] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#444444] transition"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full"
            size="md"
          >
            Save New Password
          </Button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-white font-sans antialiased">
      <div className="w-full max-w-md mx-auto py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#222222] text-white flex items-center justify-center font-bold text-xs">
            SP
          </div>
          <span className="font-semibold text-xs tracking-tight text-white">StorePulse CRM</span>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto my-auto">
        <Suspense fallback={<div className="text-center text-xs text-zinc-500">Loading reset form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>

      <div className="w-full max-w-md mx-auto py-2 text-center text-xs text-zinc-600">
        <span>StorePulse Enterprise Security</span>
      </div>
    </div>
  );
}
