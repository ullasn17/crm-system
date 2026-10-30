'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  CreditCard,
  Boxes,
  Users,
  Target,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { KPIBlock } from '@/components/ui/KPIBlock';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ReportsPage() {
  const { user, activeStoreId } = useAuth();

  const [range, setRange] = useState('30d');
  const [salesReport, setSalesReport] = useState<any>(null);
  const [inventoryReport, setInventoryReport] = useState<any>(null);
  const [performanceReport, setPerformanceReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let storeQuery = activeStoreId ? `&storeId=${activeStoreId}` : '';

    Promise.all([
      fetch(`/api/reports/sales?range=${range}${storeQuery}`).then((r) => r.json()),
      fetch(`/api/reports/inventory?${storeQuery}`).then((r) => r.json()),
      fetch(`/api/reports/performance?${storeQuery}`).then((r) => r.json()),
    ])
      .then(([salesRes, invRes, perfRes]) => {
        if (salesRes.success) setSalesReport(salesRes.data);
        if (invRes.success) setInventoryReport(invRes.data);
        if (perfRes.success) setPerformanceReport(perfRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range, activeStoreId]);

  const handleExportCSV = () => {
    let url = `/api/reports/sales?range=${range}&format=csv`;
    if (activeStoreId) url += `&storeId=${activeStoreId}`;
    window.open(url, '_blank');
  };

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#0284c7'];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & BI"
        description="Consolidated revenue analytics, transaction metrics, inventory valuation, and team sales contributions."
        actions={
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="text-xs text-[#20242C] bg-white border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="365d">Full Year</option>
            </select>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="py-24 text-center text-xs text-[#737B89]">
          Executing database aggregation pipeline...
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPIBlock
              title="Total Sales Revenue"
              value={`₹${(salesReport?.summary?.totalRevenue || 0).toLocaleString()}`}
              subtitle={
                <span>
                  <strong className="text-[#20242C]">{salesReport?.summary?.totalTransactions || 0}</strong> completed orders
                </span>
              }
              icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
            />

            <KPIBlock
              title="Avg Order Value (AOV)"
              value={`₹${Math.round(salesReport?.summary?.avgOrderValue || 0).toLocaleString()}`}
              subtitle={<span>Per transaction ticket</span>}
              icon={<BarChart3 className="w-4 h-4 text-white" />}
            />

            <KPIBlock
              title="Inventory Valuation"
              value={`₹${(inventoryReport?.valuation?.totalValuationRetail || 0).toLocaleString()}`}
              subtitle={
                <span>
                  <strong className="text-white">{inventoryReport?.valuation?.totalItemsCount || 0}</strong> total stock units
                </span>
              }
              icon={<Boxes className="w-4 h-4 text-white" />}
            />

            <KPIBlock
              title="Tax (GST) Collected"
              value={`₹${(salesReport?.summary?.totalTax || 0).toLocaleString()}`}
              subtitle={<span>Compliant tax accounting</span>}
              icon={<CreditCard className="w-4 h-4 text-amber-600" />}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Daily Trend Chart (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#20242C]">Sales Revenue Curve</h3>
                  <p className="text-xs text-[#737B89]">Aggregated daily gross revenue</p>
                </div>
                <span className="text-[11px] font-medium text-[#737B89] bg-slate-50 border border-[#E5E7EB] px-2 py-0.5 rounded">
                  Daily
                </span>
              </div>

              <div className="h-64">
                {salesReport?.dailyTrend && salesReport.dailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={salesReport?.dailyTrend || []}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#737B89' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#737B89' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E5E7EB',
                          borderRadius: '6px',
                          color: '#20242C',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                        }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#4F46E5"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#revenueFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState title="No sales data in selected range" description="Select a longer time frame." />
                )}
              </div>
            </div>

            {/* Payment Method Breakdown (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-lg p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#20242C]">Payment Modes</h3>
                <p className="text-xs text-[#737B89] mb-4">Volume breakdown across channels</p>
                <div className="space-y-2">
                  {salesReport?.paymentBreakdown?.map((pb: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-md bg-slate-50 border border-[#E5E7EB] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="font-medium text-[#20242C]">{pb.method}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[#20242C]">₹{pb.total.toLocaleString()}</p>
                        <p className="text-[10px] text-[#737B89]">{pb.count} sales</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 text-[#737B89] text-[11px] text-center">
                Live database aggregation
              </div>
            </div>
          </div>

          {/* Staff Performance Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="px-5 py-4 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#20242C]">Team Operational Contributions</h3>
              <p className="text-xs text-[#737B89]">Task execution, CRM conversions, and attributed sales</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                  <tr>
                    <th className="px-5 py-2.5">Staff Member</th>
                    <th className="px-5 py-2.5">Role</th>
                    <th className="px-5 py-2.5">Tasks Completed</th>
                    <th className="px-5 py-2.5">Leads Converted</th>
                    <th className="px-5 py-2.5">Conversion Rate</th>
                    <th className="px-5 py-2.5 text-right">Attributed Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {performanceReport?.employeeMetrics?.map((emp: any) => (
                    <tr key={emp.userId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#20242C]">{emp.name}</p>
                        <p className="text-[11px] text-[#737B89]">{emp.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="neutral" size="sm">
                          {emp.role}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-medium text-[#20242C]">
                        {emp.tasks.completed} / {emp.tasks.total}
                        <span className="text-[11px] text-[#737B89] ml-1">({emp.tasks.rate}%)</span>
                      </td>
                      <td className="px-5 py-3 font-medium text-[#20242C]">
                        {emp.leads.converted} of {emp.leads.total}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={emp.leads.conversionRate > 25 ? 'success' : 'neutral'} size="sm">
                          {emp.leads.conversionRate}%
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-[#20242C]">
                        ₹{emp.sales.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
