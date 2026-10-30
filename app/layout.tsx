import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'StorePulse - Omni-Retail Operations & Intelligent POS System',
  description: 'Enterprise multi-store retail CRM, POS counter billing with Stripe Card & UPI QR payments, live inventory sync, and RBAC.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col bg-[#F7F8FA] text-[#20242C]`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
