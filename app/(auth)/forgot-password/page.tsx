'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Store } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [tokenHint, setTokenHint] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitted(true);
        if (json.data?.demoResetToken) {
          setTokenHint(json.data.demoResetToken);
        }
      } else {
        setError(json.error || 'Failed to submit reset request');
      }
    } catch {
      setError('Network communication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-white font-sans antialiased">
      {/* Top Header */}
      <div className="w-full max-w-md mx-auto py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#222222] text-white flex items-center justify-center font-bold text-xs">
            SP
          </div>
          <span className="font-semibold text-xs tracking-tight text-white">StorePulse CRM</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="bg-[#141414] rounded-2xl p-6 sm:p-8 border border-[#222222] shadow-2xl">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition mb-5 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>

          <h1 className="text-xl font-semibold text-white mb-1">Reset your password</h1>
          <p className="text-xs text-[#888888] mb-6">
            Enter your registered corporate email to receive a password recovery token.
          </p>

          {submitted ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 flex items-start gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Reset request initiated</p>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">
                    If this email address exists in the directory, password reset instructions have been issued.
                  </p>
                </div>
              </div>

              {tokenHint && (
                <div className="p-3.5 rounded-xl bg-[#181818] border border-[#262626] text-xs">
                  <p className="text-zinc-400 font-medium mb-1">Development Demo Security Token:</p>
                  <code className="text-amber-400 break-all select-all font-mono text-[11px] bg-[#121212] px-2 py-1 rounded border border-[#282828] block">
                    {tokenHint}
                  </code>
                  <div className="mt-3">
                    <Link
                      href={`/reset-password?token=${tokenHint}`}
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition"
                    >
                      Proceed to Reset Form &rarr;
                    </Link>
                  </div>
                </div>
              )}
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
                  Corporate Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@crmsystem.local"
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
                Send Reset Authorization
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="w-full max-w-md mx-auto py-2 text-center text-xs text-zinc-600">
        <span>StorePulse Enterprise Security</span>
      </div>
    </div>
  );
}
