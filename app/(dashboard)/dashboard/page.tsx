'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Users,
  Store as StoreIcon,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Receipt,
  RotateCcw,
  Package,
  Calendar,
  CheckSquare,
  ShoppingCart,
  Target,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Building2,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { KPIBlock } from '@/components/ui/KPIBlock';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardPage() {
  const { user, activeStoreId } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = '/api/dashboard';
    if (activeStoreId) {
      url += `?storeId=${activeStoreId}`;
    }
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeStoreId, user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <svg
          className="animate-spin h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-xs text-[#737B89]">Loading workspace metrics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-8 text-center max-w-md mx-auto my-12">
        <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-[#20242C]">Failed to load dashboard metrics</h3>
        <p className="text-xs text-[#737B89] mt-1 mb-4">
          Please check the network connection or refresh the page.
        </p>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </div>
    );
  }

  // 1. ADMIN DASHBOARD
  if (user?.role === 'Admin' && (!activeStoreId || data.role === 'Admin')) {
    const { metrics, salesTrend, storeComparison, recentActivity } = data;

    return (
      <div className="space-y-6">
        <PageHeader
          title="Executive Overview"
          description="Check and manage your consolidated revenue, store performance, and credit balance."
          actions={
            <div className="flex items-center gap-2">
              <Link href="/reports">
                <Button variant="secondary" size="sm">
                  Manage reports ↗
                </Button>
              </Link>
              <Link href="/billing">
                <Button variant="primary" size="sm" className="text-white">
                  <span className="text-white font-semibold">New Sale (POS)</span>
                </Button>
              </Link>
              <Button variant="amber" size="sm" icon={<Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />}>
                Launch plan ⇅
              </Button>
            </div>
          }
        />

        {/* Section Heading matching screenshot */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          <div>
            <h2 className="text-base font-semibold text-white">Store performance and budget</h2>
            <p className="text-xs text-[#888888]">Check your remaining store allocations and revenue balance</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/stores">
              <Button variant="secondary" size="sm">
                Redeem coupon
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="secondary" size="sm">
                Edit usage limits
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Grid matching screenshot cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <KPIBlock
            title="Activity"
            value={`₹${(metrics.todaySales || 0).toLocaleString()}`}
            subtitle="Average sales volume per active day"
            showActivityGrid={true}
            badge={<Badge variant="success" size="sm">Live</Badge>}
          />

          <KPIBlock
            title="Current balance"
            value={`₹${(metrics.monthlyRevenue || 0).toLocaleString()}`}
            subtitle="Month-to-date consolidated branch gross revenue"
            progressPercent={Math.min(100, Math.round(((metrics.todaySales || 0) / (metrics.monthlyRevenue || 1)) * 100))}
            progressLabel="Purchased store quota"
            progressValue={`₹${(metrics.todaySales || 0).toLocaleString()} / ₹${(metrics.monthlyRevenue || 1).toLocaleString()}`}
          />
        </div>

        {/* Supporting Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPIBlock
            title="Active Stores & Team"
            value={`${metrics.activeStores || 0} Outlets`}
            subtitle={
              <span>
                <strong className="text-white">{metrics.totalUsers || 0}</strong> active personnel
              </span>
            }
            icon={<StoreIcon className="w-4 h-4 text-zinc-400" />}
          />

          <KPIBlock
            title="Orders Processed"
            value={`${(metrics.monthlyTransactions || 0).toLocaleString()}`}
            subtitle="Recorded sales receipts this month"
            icon={<Receipt className="w-4 h-4 text-zinc-400" />}
          />

          <KPIBlock
            title="Inventory Watch"
            value={`${metrics.lowStockProducts || 0} SKUs`}
            subtitle={
              <span>
                <strong className="text-white">{metrics.pendingApprovals || 0}</strong> returns pending
              </span>
            }
            icon={<AlertTriangle className="w-4 h-4 text-[#FACC15]" />}
            badge={
              metrics.lowStockProducts > 0 ? (
                <Badge variant="warning" size="sm">Attention</Badge>
              ) : (
                <Badge variant="success" size="sm">Optimal</Badge>
              )
            }
          />

          <KPIBlock
            title="System Security"
            value="100% RBAC"
            subtitle="Zero-Trust server access enforcement"
            icon={<ShieldAlert className="w-4 h-4 text-emerald-400" />}
            badge={<Badge variant="success" size="sm">Protected</Badge>}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Sales Trend Chart */}
          <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Revenue Trajectory</h3>
                <p className="text-xs text-[#888888]">Rolling 7-day sales curve</p>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium bg-[#1C1C1C] border border-[#282828] px-2 py-0.5 rounded-lg">
                7 Days
              </span>
            </div>

            <div className="h-60 w-full">
              {salesTrend && salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1C1C" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#888888' }}
                      axisLine={{ stroke: '#222222' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#888888' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161616',
                        borderColor: '#2A2A2A',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#FFFFFF',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                      }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Sales']}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No sales data available" description="Sales data will populate as transactions are closed." />
              )}
            </div>
          </div>

          {/* Store Revenue Comparison */}
          <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Outlet Revenue Distribution</h3>
                <p className="text-xs text-[#888888]">Month-to-date performance by store</p>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium bg-[#1C1C1C] border border-[#282828] px-2 py-0.5 rounded-lg">
                MTD
              </span>
            </div>

            <div className="h-60 w-full">
              {storeComparison && storeComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storeComparison} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1C1C" />
                    <XAxis
                      dataKey="storeCode"
                      tick={{ fontSize: 11, fill: '#888888' }}
                      axisLine={{ stroke: '#222222' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#888888' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161616',
                        borderColor: '#2A2A2A',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#FFFFFF',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                      }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#FACC15" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No store comparison data" description="Store revenue data will show as sales are processed." />
              )}
            </div>
          </div>
        </div>

        {/* Recent Security Audits Table */}
        <div className="bg-[#141414] border border-[#222222] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1C1C1C] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">System Activity &amp; Audit Trail</h3>
              <p className="text-xs text-[#888888]">Latest immutable action logs</p>
            </div>
            <Link
              href="/audit-logs"
              className="text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1 transition"
            >
              <span>View all logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#101010] text-[#71717A] uppercase text-[11px] font-medium border-b border-[#1C1C1C]">
                <tr>
                  <th className="px-6 py-2.5">Action</th>
                  <th className="px-6 py-2.5">User</th>
                  <th className="px-6 py-2.5">Module</th>
                  <th className="px-6 py-2.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((log: any, idx: number) => (
                    <tr key={log._id || idx} className="hover:bg-[#181818] transition-colors">
                      <td className="px-6 py-3 font-mono text-[11px] font-medium text-white">
                        {log.action}
                      </td>
                      <td className="px-6 py-3 font-medium text-white">
                        {log.performedByName || 'System Automated'}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="neutral" size="sm">
                          {log.module}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right text-[#888888] font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-[#737B89]">
                      No recorded audit logs
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. STORE MANAGER DASHBOARD
  if (user?.role === 'Store Manager' || data.role === 'Store Manager') {
    const { metrics, lowStockItems, pendingTasks, pendingApprovals, recentTransactions } = data;

    return (
      <div className="space-y-6">
        <PageHeader
          title={`${user?.store?.name || 'Branch'} Operations`}
          description="Manage daily branch sales, inventory replenishment alerts, pending returns approval, and staff tasks."
          actions={
            <Link href="/billing">
              <Button variant="primary" size="sm" icon={<ShoppingCart className="w-3.5 h-3.5" />}>
                Counter POS
              </Button>
            </Link>
          }
        />

        {/* Operational KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPIBlock
            title="Today Branch Sales"
            value={`₹${(metrics.todaySales || 0).toLocaleString()}`}
            subtitle={
              <span>
                <strong className="text-white">{metrics.todayTransactions || 0}</strong> orders today
              </span>
            }
            icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
          />

          <KPIBlock
            title="Month Branch Revenue"
            value={`₹${(metrics.monthlyRevenue || 0).toLocaleString()}`}
            subtitle={
              <span>
                <strong className="text-white">{metrics.monthlyTransactions || 0}</strong> orders closed
              </span>
            }
            icon={<Receipt className="w-4 h-4 text-zinc-400" />}
          />

          <KPIBlock
            title="Store Stock Valuation"
            value={`₹${(metrics.inventoryValuation || 0).toLocaleString()}`}
            subtitle={
              <span>
                <strong className="text-white">{metrics.inventoryUnits || 0}</strong> physical units
              </span>
            }
            icon={<Package className="w-4 h-4 text-white" />}
          />

          <KPIBlock
            title="Active Customers"
            value={metrics.storeCustomers || 0}
            subtitle={
              <span>
                <strong className="text-white">{metrics.pendingTasksCount || 0}</strong> open team tasks
              </span>
            }
            icon={<Users className="w-4 h-4 text-zinc-400" />}
          />
        </div>

        {/* Two-Column Operational Queues */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pending Returns Needing Approval */}
          <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Returns Awaiting Approval</h3>
                <p className="text-xs text-[#888888]">Manager sign-off required</p>
              </div>
              <Link href="/returns" className="text-xs font-medium text-white hover:underline">
                View all ({pendingApprovals?.length || 0})
              </Link>
            </div>

            <div className="space-y-2">
              {pendingApprovals && pendingApprovals.length > 0 ? (
                pendingApprovals.map((item: any, idx: number) => (
                  <div
                    key={item._id || idx}
                    className="p-3.5 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white font-mono">{item.invoiceNumber}</p>
                      <p className="text-[#888888] text-[11px]">
                        Cashier: {item.requestedBy?.name || 'Staff'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-rose-400">
                        ₹{(item.totalRefundAmount || 0).toLocaleString()}
                      </p>
                      <Link
                        href="/returns"
                        className="text-[11px] font-medium text-zinc-300 hover:text-white hover:underline"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No pending returns"
                  description="All customer returns have been reviewed and processed."
                  className="py-6"
                />
              )}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Inventory Threshold Alerts</h3>
                <p className="text-xs text-[#888888]">Items at or below reorder level</p>
              </div>
              <Link href="/inventory" className="text-xs font-medium text-white hover:underline">
                Reorder Stock
              </Link>
            </div>

            <div className="space-y-2">
              {lowStockItems && lowStockItems.length > 0 ? (
                lowStockItems.map((item: any, idx: number) => (
                  <div
                    key={item._id || idx}
                    className="p-3.5 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-medium text-white">{item.productId?.name}</p>
                      <p className="text-[#888888] font-mono text-[11px]">
                        SKU: {item.productId?.sku}
                      </p>
                    </div>
                    <Badge variant="warning" size="sm">
                      {item.quantity} units left
                    </Badge>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Inventory healthy"
                  description="All product quantities are above their designated reorder thresholds."
                  className="py-6"
                />
              )}
            </div>
          </div>
        </div>

        {/* Recent Branch Transactions */}
        <div className="bg-[#141414] border border-[#222222] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1C1C1C] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Branch Invoices</h3>
              <p className="text-xs text-[#888888]">Live store checkout feed</p>
            </div>
            <Link
              href="/sales"
              className="text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1"
            >
              <span>View all sales</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#101010] text-[#71717A] uppercase text-[11px] font-medium border-b border-[#1C1C1C]">
                <tr>
                  <th className="px-6 py-2.5">Invoice #</th>
                  <th className="px-6 py-2.5">Customer</th>
                  <th className="px-6 py-2.5">Payment Method</th>
                  <th className="px-6 py-2.5 text-right">Grand Total</th>
                  <th className="px-6 py-2.5 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {recentTransactions && recentTransactions.length > 0 ? (
                  recentTransactions.map((sale: any, idx: number) => (
                    <tr key={sale._id || idx} className="hover:bg-[#181818] transition-colors">
                      <td className="px-6 py-3 font-mono font-medium text-white">
                        {sale.invoiceNumber}
                      </td>
                      <td className="px-6 py-3 font-medium text-white">
                        {sale.customerName || 'Walk-in Customer'}
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="neutral" size="sm">
                          {sale.paymentMethod}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-white">
                        ₹{sale.grandTotal.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-[#888888] font-mono text-[11px]">
                        {new Date(sale.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-[#737B89]">
                      No transactions recorded yet today
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 3. STAFF DASHBOARD
  if (user?.role === 'Staff' || data.role === 'Staff') {
    const { metrics, assignedTasks, pendingFollowUps, myLeads } = data;

    return (
      <div className="space-y-6">
        <PageHeader
          title="Staff Workspace"
          description="Personal task queue, lead follow-ups, and scheduled client outreach."
          actions={
            <Link href="/leads">
              <Button variant="primary" size="sm" icon={<Target className="w-3.5 h-3.5" />}>
                Capture Lead
              </Button>
            </Link>
          }
        />

        {/* Staff KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPIBlock
            title="Pending Tasks"
            value={metrics.assignedTasksCount || 0}
            subtitle={<span>Requires your attention</span>}
            icon={<CheckSquare className="w-4 h-4 text-zinc-400" />}
          />

          <KPIBlock
            title="Completed Tasks"
            value={metrics.completedTasksCount || 0}
            subtitle={<span>Successfully closed</span>}
            icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
          />

          <KPIBlock
            title="Follow-Ups Due"
            value={metrics.pendingFollowUpsCount || 0}
            subtitle={<span>Due within 24 hours</span>}
            icon={<Clock className="w-4 h-4 text-amber-400" />}
            badge={
              metrics.pendingFollowUpsCount > 0 ? (
                <Badge variant="warning" size="sm">Due</Badge>
              ) : null
            }
          />

          <KPIBlock
            title="My Active Leads"
            value={metrics.myLeadsCount || 0}
            subtitle={<span>In sales pipeline</span>}
            icon={<Target className="w-4 h-4 text-white" />}
          />
        </div>

        {/* Two-Column Tasks & Follow-ups */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Priority Tasks */}
          <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Priority Assigned Tasks</h3>
                <p className="text-xs text-[#888888]">Immediate action items</p>
              </div>
              <Link href="/tasks" className="text-xs font-medium text-white hover:underline">
                View all ({assignedTasks?.length || 0})
              </Link>
            </div>

            <div className="space-y-2">
              {assignedTasks && assignedTasks.length > 0 ? (
                assignedTasks.map((t: any, idx: number) => (
                  <div
                    key={t._id || idx}
                    className="p-3.5 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{t.title}</p>
                      <p className="text-[#888888] text-[11px] mt-0.5">
                        Due: {new Date(t.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={t.priority === 'High' ? 'error' : 'neutral'} size="sm">
                      {t.priority}
                    </Badge>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="All tasks completed"
                  description="You have no open tasks assigned to you right now."
                  className="py-6"
                />
              )}
            </div>
          </div>

          {/* Upcoming Follow-Ups */}
          <div className="bg-[#141414] border border-[#222222] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Lead Follow-Ups Due</h3>
                <p className="text-xs text-[#888888]">Outreach queue</p>
              </div>
              <Link href="/leads" className="text-xs font-medium text-white hover:underline">
                Go to Leads
              </Link>
            </div>

            <div className="space-y-2">
              {pendingFollowUps && pendingFollowUps.length > 0 ? (
                pendingFollowUps.map((lead: any, idx: number) => (
                  <div
                    key={lead._id || idx}
                    className="p-3.5 rounded-xl bg-[#181818] border border-[#262626] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{lead.name}</p>
                      <p className="text-[#888888] text-[11px] mt-0.5">
                        {lead.phone} {lead.interest ? `• ${lead.interest}` : ''}
                      </p>
                    </div>
                    <Link href="/leads">
                      <Button variant="secondary" size="xs">
                        Follow Up
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No urgent follow-ups"
                  description="No lead outreach deadlines are due today."
                  className="py-6"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. COUNTER DASHBOARD
  const { metrics, recentSales } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="POS Cashier Terminal"
        description={`Point of sale station for ${user?.store?.name || 'Assigned Branch'}. Create bills, register payments, and reprint receipts.`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/returns">
              <Button variant="secondary" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />}>
                Process Return
              </Button>
            </Link>
            <Link href="/billing">
              <Button
                variant="primary"
                size="sm"
                icon={<ShoppingCart className="w-3.5 h-3.5 text-white" />}
                className="text-white"
              >
                <span className="text-white font-semibold">New Sale (POS)</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Counter KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIBlock
          title="My Shift Sales"
          value={`₹${(metrics.myTodaySales || 0).toLocaleString()}`}
          subtitle={
            <span>
              <strong className="text-white">{metrics.myTodayCount || 0}</strong> bills closed by you
            </span>
          }
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
        />

        <KPIBlock
          title="Branch Total Today"
          value={`₹${(metrics.storeTodaySales || 0).toLocaleString()}`}
          subtitle={
            <span>
              <strong className="text-white">{metrics.storeTodayCount || 0}</strong> store transactions
            </span>
          }
          icon={<TrendingUp className="w-4 h-4 text-zinc-400" />}
        />

        <KPIBlock
          title="Pending Payments"
          value={metrics.pendingPaymentsCount || 0}
          subtitle={<span>Incomplete draft orders</span>}
          icon={<Clock className="w-4 h-4 text-amber-400" />}
          badge={
            metrics.pendingPaymentsCount > 0 ? (
              <Badge variant="warning" size="sm">Pending</Badge>
            ) : null
          }
        />

        <div className="bg-[#141414] border border-[#222222] rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[#888888]">
            Quick POS Actions
          </span>
          <div className="flex gap-2 mt-2">
            <Link href="/billing" className="flex-1">
              <Button variant="primary" size="sm" className="w-full text-white">
                <span className="text-white font-semibold">New Sale</span>
              </Button>
            </Link>
            <Link href="/returns" className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">
                Refund
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Terminal Receipts Table */}
      <div className="bg-[#141414] border border-[#222222] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1C1C1C] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Today's Terminal Receipts</h3>
            <p className="text-xs text-[#888888]">Recent checkout transactions</p>
          </div>
          <Link
            href="/sales"
            className="text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1"
          >
            <span>All sales</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#101010] text-[#71717A] uppercase text-[11px] font-medium border-b border-[#1C1C1C]">
              <tr>
                <th className="px-6 py-2.5">Invoice #</th>
                <th className="px-6 py-2.5">Customer</th>
                <th className="px-6 py-2.5">Payment Method</th>
                <th className="px-6 py-2.5">Payment Status</th>
                <th className="px-6 py-2.5 text-right">Grand Total</th>
                <th className="px-6 py-2.5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C1C]">
              {recentSales && recentSales.length > 0 ? (
                recentSales.map((sale: any, idx: number) => (
                  <tr key={sale._id || idx} className="hover:bg-[#181818] transition-colors">
                    <td className="px-6 py-3 font-mono font-medium text-white">
                      {sale.invoiceNumber}
                    </td>
                    <td className="px-6 py-3 font-medium text-white">
                      {sale.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant="neutral" size="sm">
                        {sale.paymentMethod}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge variant={getStatusVariant(sale.paymentStatus)} size="sm">
                        {sale.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-white">
                      ₹{sale.grandTotal.toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-[#888888] font-mono text-[11px]">
                      {new Date(sale.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[#737B89]">
                    No transactions registered yet today
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}