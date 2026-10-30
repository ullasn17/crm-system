'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home, Store } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-between p-4 sm:p-6 lg:p-8 text-white">
      {/* Top Header */}
      <div className="w-full max-w-lg mx-auto py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#181818] border border-[#2A2A2A] text-white flex items-center justify-center font-bold text-xs">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-xs tracking-tight text-white">StorePulse CRM</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-lg mx-auto my-auto">
        <div className="bg-[#141414] rounded-2xl p-6 sm:p-8 border border-[#222222] shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#FBBF24] mx-auto flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <h1 className="text-xl font-semibold text-white mb-1">Access Restricted (403)</h1>
          <p className="text-xs text-[#888888] mb-5 max-w-sm mx-auto leading-relaxed">
            Your current active role (<strong className="text-white font-semibold">{user?.role || 'Guest'}</strong>) does not possess server-side authorization to access this module or target branch.
          </p>

          <div className="p-4 rounded-xl bg-[#0D0D0D] border border-[#222222] text-left text-xs space-y-2 mb-6">
            <p className="text-xs font-semibold text-white">Role Authorization Scope Matrix:</p>
            <ul className="text-[12px] text-[#888888] space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-white">Admin:</strong> Global consolidated analytics, user provisioning, store policies, security audit trail
              </li>
              <li>
                <strong className="text-white">Store Manager:</strong> Branch sales, local inventory movements &amp; return authorizations
              </li>
              <li>
                <strong className="text-white">Staff:</strong> Customer directory, prospect leads pipeline &amp; assigned operational tasks
              </li>
              <li>
                <strong className="text-white">Counter:</strong> Point-of-Sale billing, product lookup, payment processing &amp; thermal receipts
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button size="sm" variant="primary">
                <Home className="w-3.5 h-3.5 mr-1.5" />
                Return to Dashboard
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" variant="secondary">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Switch Account
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto py-2 text-center text-xs text-[#666666]">
        <span>StorePulse Zero-Trust RBAC Gate</span>
      </div>
    </div>
  );
}
