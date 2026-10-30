import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { connectDB } from '@/lib/db/mongodb';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';


export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Ensure user actually exists in the database
  try {
    await connectDB();
    const userDoc = await User.findById(session.userId).lean();
    if (!userDoc || !userDoc.isActive) {
      redirect('/login');
    }
  } catch {
    redirect('/login');
  }

  redirect('/dashboard');
}
