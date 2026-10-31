import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';
import DashboardClientShell from './DashboardClientShell';

export const dynamic = 'force-dynamic';


export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  try {
    await connectDB();
    const user = await User.findById(session.userId).lean();
    if (!user || !user.isActive) {
      redirect('/login');
    }
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
    redirect('/login');
  }

  return <DashboardClientShell>{children}</DashboardClientShell>;
}
