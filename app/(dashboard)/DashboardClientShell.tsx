'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Users,
  Target,
  CheckSquare,
  Package,
  Boxes,
  Building2,
  UserCog,
  BarChart3,
  ShieldAlert,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Store as StoreIcon,
  ChevronRight,
  ExternalLink,
  PanelLeftClose,
  PanelLeft,
  Check,
  Info,
  CreditCard,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export default function DashboardClientShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout, activeStoreId, setActiveStoreId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [stores, setStores] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [showPrinciplesModal, setShowPrinciplesModal] = useState(false);
  const [todayTotal, setTodayTotal] = useState<string>('0.00');

  // Fetch stores if user is Admin
  useEffect(() => {
    if (user?.role === 'Admin') {
      fetch('/api/stores')
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setStores(json.data.stores || []);
        })
        .catch(console.error);
    }
  }, [user]);

  // Fetch notifications and quick balance/sales
  useEffect(() => {
    if (user) {
      fetch('/api/notifications')
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setNotifications(json.data.notifications || []);
            setUnreadCount(json.data.unreadCount || 0);
          }
        })
        .catch(console.error);

      fetch('/api/dashboard')
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data?.metrics?.todaySales !== undefined) {
            setTodayTotal(Number(json.data.metrics.todaySales).toLocaleString());
          }
        })
        .catch(console.error);
    }
  }, [user]);

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      window.location.replace('/login');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#222222] text-white flex items-center justify-center font-semibold text-sm">
            SP
          </div>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Navigation Items
  const navSections = [
    {
      title: 'Core',
      items: [
        {
          label: 'Overview',
          href: '/dashboard',
          icon: LayoutDashboard,
          visible: true,
        },
        {
          label: 'Point of Sale',
          href: '/billing',
          icon: ShoppingCart,
          visible: user.role === 'Admin' || user.role === 'Store Manager' || user.role === 'Counter',
        },
        {
          label: 'Sales Orders',
          href: '/sales',
          icon: Receipt,
          visible: user.role === 'Admin' || user.role === 'Store Manager' || user.role === 'Counter',
        },
        {
          label: 'Returns & Refunds',
          href: '/returns',
          icon: RotateCcw,
          visible: user.role === 'Admin' || user.role === 'Store Manager' || user.role === 'Counter',
        },
      ],
    },
    {
      title: 'CRM & Pipeline',
      items: [
        {
          label: 'Customers',
          href: '/customers',
          icon: Users,
          visible: true,
        },
        {
          label: 'Leads Pipeline',
          href: '/leads',
          icon: Target,
          visible: user.role !== 'Counter',
        },
        {
          label: 'Team Tasks',
          href: '/tasks',
          icon: CheckSquare,
          visible: user.role !== 'Counter',
        },
      ],
    },
    {
      title: 'Inventory & Outlets',
      items: [
        {
          label: 'Products Master',
          href: '/products',
          icon: Package,
          visible: user.role === 'Admin' || user.role === 'Store Manager',
        },
        {
          label: 'Store Inventory',
          href: '/inventory',
          icon: Boxes,
          visible: true,
        },
        {
          label: 'Branch Stores',
          href: '/stores',
          icon: Building2,
          visible: user.role === 'Admin' || user.role === 'Store Manager',
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        {
          label: 'Users & Access',
          href: '/users',
          icon: UserCog,
          visible: user.role === 'Admin' || user.role === 'Store Manager',
        },
        {
          label: 'Analytics & BI',
          href: '/reports',
          icon: BarChart3,
          visible: user.role === 'Admin' || user.role === 'Store Manager',
        },
        {
          label: 'Security & Audits',
          href: '/audit-logs',
          icon: ShieldAlert,
          visible: user.role === 'Admin',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white font-sans antialiased">
      {/* MOBILE DRAWER BACKDROP */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 1. TOP NAVIGATION BAR - EXACT MATCH TO SCREENSHOT */}
      <header className="h-13 bg-[#0A0A0A] border-b border-[#1A1A1A] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
        {/* Left Side: Brand Logo, Chevron, Org Pill, Chevron, Store Pill */}
        <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#181818] transition"
            aria-label="Open navigation"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Minimalist Logo Icon (Matching SI icon in screenshot) */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#222222] text-white flex items-center justify-center font-bold text-xs tracking-tight shadow-xs hover:border-[#333333] transition">
              <span className="font-mono text-[11px] tracking-tighter">SP</span>
            </div>
          </Link>

          {/* Breadcrumb Chevron */}
          <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />

          {/* Org / App Pill */}
          <div className="flex items-center gap-1.5 bg-[#141414] border border-[#222222] hover:border-[#333333] px-2.5 py-1 rounded-lg text-xs transition cursor-default shrink-0">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-medium text-white text-xs">StorePulse</span>
            <span className="bg-[#F59E0B]/15 text-[#FBBF24] border border-[#F59E0B]/30 px-1.5 py-0.2 rounded text-[10px] font-semibold ml-0.5">
              {user.role}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-500 ml-0.5" />
          </div>

          {/* Breadcrumb Chevron */}
          <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0 hidden sm:block" />

          {/* Store Selector Pill with Green Dot */}
          <div className="hidden sm:flex items-center gap-1.5 bg-[#141414] border border-[#222222] hover:border-[#333333] px-2.5 py-1 rounded-lg text-xs transition shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            {user.role === 'Admin' ? (
              <select
                value={activeStoreId || ''}
                onChange={(e) => setActiveStoreId(e.target.value || null)}
                className="bg-transparent font-medium text-white focus:outline-none cursor-pointer text-xs pr-1"
              >
                <option value="" className="bg-[#141414] text-white">All Stores (Consolidated)</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id} className="bg-[#141414] text-white">
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium text-white text-xs truncate max-w-[130px]">
                {user.store?.name || 'Local Store'}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </div>
        </div>

        {/* Right Side: Docs link, Feedback, Today Pill, User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/branches"
            target="_blank"
            className="text-xs text-zinc-400 hover:text-white transition hidden md:flex items-center gap-1"
          >
            <span>Docs</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          <button
            onClick={() => setShowPrinciplesModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#262626] text-xs text-zinc-200 transition cursor-pointer"
          >
            <span>Leave feedback</span>
          </button>

          {/* Balance / Today POS Gross pill (Matching $10.00 pill in screenshot) */}
          <Link
            href="/billing"
            className="flex items-center gap-2 bg-[#141414] hover:bg-[#1A1A1A] border border-[#222222] px-3 py-1.5 rounded-lg text-xs font-medium text-white transition"
          >
            <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
            <span>₹{todayTotal}</span>
          </Link>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#181818] transition cursor-pointer relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0A0A0A]" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#141414] border border-[#262626] shadow-2xl z-50 p-3.5 text-white">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222222]">
                  <span className="text-xs font-semibold text-white">Notifications</span>
                  <span className="text-[10px] font-medium text-zinc-300 bg-[#222222] px-2 py-0.5 rounded">
                    {unreadCount} unread
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs text-zinc-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div
                        key={n._id}
                        onClick={() => markNotificationRead(n._id)}
                        className={`p-2.5 rounded-lg text-xs transition cursor-pointer ${
                          n.isRead
                            ? 'bg-[#181818]/60 text-zinc-400 hover:bg-[#1C1C1C]'
                            : 'bg-[#1F1F1F] border border-[#2A2A2A] text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-xs text-white">{n.title}</span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar Pill (Matching avatar circle in screenshot) */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="w-7 h-7 rounded-full bg-[#181818] border border-[#2A2A2A] hover:border-zinc-400 text-zinc-200 flex items-center justify-center text-xs font-medium transition cursor-pointer"
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#141414] border border-[#262626] shadow-2xl z-50 p-1.5 text-xs text-white">
                <div className="px-3 py-2 border-b border-[#222222] mb-1">
                  <p className="font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                  <div className="mt-1.5">
                    <Badge variant="amber" size="sm">
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowPrinciplesModal(true);
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-[#1C1C1C] hover:text-white transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Design Principles</span>
                  </span>
                </button>

                <Link
                  href="/branches"
                  target="_blank"
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-[#1C1C1C] hover:text-white transition"
                >
                  <span>Public Showrooms</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                </Link>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/20 transition cursor-pointer mt-1"
                >
                  <span>Sign out</span>
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. SUB-NAVIGATION TABS (MATCHING Quickstart | Sessions | Settings IN SCREENSHOT) */}
      <div className="h-10 bg-[#0A0A0A] border-b border-[#1A1A1A] px-4 sm:px-6 flex items-center gap-6 text-xs select-none overflow-x-auto no-scrollbar">
        <Link
          href="/dashboard"
          className={`h-full flex items-center border-b-2 font-medium transition whitespace-nowrap ${
            pathname === '/dashboard' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Quickstart
        </Link>
        <Link
          href="/billing"
          className={`h-full flex items-center border-b-2 font-medium transition whitespace-nowrap ${
            pathname.startsWith('/billing') || pathname.startsWith('/sales')
              ? 'border-white text-white'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Sessions &amp; Sales
        </Link>
        <Link
          href="/customers"
          className={`h-full flex items-center border-b-2 font-medium transition whitespace-nowrap ${
            pathname.startsWith('/customers') || pathname.startsWith('/leads')
              ? 'border-white text-white'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Customers &amp; Pipeline
        </Link>
        <Link
          href="/inventory"
          className={`h-full flex items-center border-b-2 font-medium transition whitespace-nowrap ${
            pathname.startsWith('/inventory') || pathname.startsWith('/products')
              ? 'border-white text-white'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Inventory
        </Link>
        {(user.role === 'Admin' || user.role === 'Store Manager') && (
          <Link
            href="/stores"
            className={`h-full flex items-center border-b-2 font-medium transition whitespace-nowrap ${
              pathname.startsWith('/stores') || pathname.startsWith('/users') || pathname.startsWith('/audit-logs')
                ? 'border-white text-white'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Settings
          </Link>
        )}
      </div>

      {/* 3. MAIN WORKSPACE WITH SIDEBAR */}
      <div className="flex-1 flex min-w-0">
        {/* SIDEBAR NAVIGATION - MATCHING SCREENSHOT */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 bg-[#0A0A0A] text-zinc-300 flex flex-col justify-between border-r border-[#1A1A1A] transition-all duration-200 md:static ${
            desktopCollapsed ? 'md:w-[60px]' : 'md:w-56'
          } ${mobileMenuOpen ? 'w-60 translate-x-0 top-0 bottom-0 z-50' : '-translate-x-full md:translate-x-0'}`}
        >
          <div className="flex-1 flex flex-col min-h-0 pt-3">
            <nav className="flex-1 px-2.5 space-y-4 overflow-y-auto">
              {navSections.map((sec) => {
                const visibleItems = sec.items.filter((item) => item.visible);
                if (visibleItems.length === 0) return null;

                return (
                  <div key={sec.title} className="space-y-0.5">
                    {!desktopCollapsed && (
                      <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                        {sec.title}
                      </p>
                    )}
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        item.href === '/dashboard'
                          ? pathname === '/dashboard'
                          : pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          title={desktopCollapsed ? item.label : undefined}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-[#1C1C1C] text-white shadow-xs'
                              : 'text-zinc-400 hover:text-white hover:bg-[#141414]'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0 text-zinc-400" />
                          {!desktopCollapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Bottom Controls */}
          <div className="p-2.5 border-t border-[#1A1A1A] flex items-center justify-between">
            {!desktopCollapsed ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-[11px] text-zinc-500 font-mono">StorePulse v2.4</span>
                <button
                  onClick={() => setDesktopCollapsed(true)}
                  className="p-1 rounded text-zinc-500 hover:text-white hover:bg-[#141414] transition cursor-pointer"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDesktopCollapsed(false)}
                className="w-full flex items-center justify-center p-1 rounded text-zinc-500 hover:text-white hover:bg-[#141414] transition cursor-pointer"
                title="Expand sidebar"
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </aside>

        {/* 4. MAIN CONTENT VIEWPORT */}
        <main className="flex-1 p-5 sm:p-7 max-w-7xl w-full mx-auto min-w-0">
          {children}
        </main>
      </div>

      {/* DESIGN PRINCIPLES MODAL */}
      {showPrinciplesModal && (
        <Modal
          isOpen={showPrinciplesModal}
          onClose={() => setShowPrinciplesModal(false)}
          title="Enterprise Product Design Principles"
          description="The five foundational pillars governing this commercial CRM system."
          maxWidth="lg"
        >
          <div className="space-y-3 text-xs text-white">
            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222]">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Compact sidebar and consistent top navigation</span>
              </div>
              <p className="text-zinc-400 mt-1 pl-7 leading-relaxed">
                Avoids the oversized dashboard template look with a clean, collapsible deep-navy sidebar, persistent breadcrumbs, store switcher, and profile controls.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222]">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Professional data tables</span>
              </div>
              <p className="text-zinc-400 mt-1 pl-7 leading-relaxed">
                Customers, staff, inventory, and sales orders feel like real operational tools with compact headers, subtle row borders, status badges, and action menus.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222]">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Role-specific layouts</span>
              </div>
              <p className="text-zinc-400 mt-1 pl-7 leading-relaxed">
                Counter is optimized for checkout billing speed and receipts; Staff for tasks, leads, and customer interactions; Store Manager for branch alerts and return approvals; and Admin for system management and security logs.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222]">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">4</span>
                <span>Real data and meaningful empty states</span>
              </div>
              <p className="text-zinc-400 mt-1 pl-7 leading-relaxed">
                Zero fake statistics, decorative charts, or arbitrary numbers. All KPI blocks and charts are computed from MongoDB database records with actionable empty states.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#141414] border border-[#222222]">
              <div className="font-semibold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center text-[10px] font-bold">5</span>
                <span>Consistent spacing, typography and restrained colors</span>
              </div>
              <p className="text-zinc-400 mt-1 pl-7 leading-relaxed">
                The same design rules across every page: unified 4px/8px spacing grid, Inter/Geist typography scale, and a restrained black enterprise theme.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
