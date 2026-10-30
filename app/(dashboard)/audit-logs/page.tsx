'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Search,
  Filter,
  Lock,
  User,
  Clock,
  Eye,
  X,
  FileText,
  Copy,
  Check,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function AuditLogsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const loadLogs = () => {
    setLoading(true);
    let url = '/api/audit-logs?';
    if (moduleFilter) url += `module=${moduleFilter}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setLogs(json.data.logs || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.push('/unauthorized');
      return;
    }
    loadLogs();
  }, [user, moduleFilter, search]);

  const copyPayload = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.details || {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getModuleVariant = (mod: string) => {
    switch (mod) {
      case 'Auth':
        return 'info';
      case 'Users':
        return 'indigo';
      case 'Inventory':
        return 'warning';
      case 'Sales':
        return 'success';
      case 'Refunds':
        return 'error';
      case 'Stores':
        return 'indigo';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Security & Audit Logs"
        description="Immutable compliance event stream, authorization decisions, price adjustments, and administrative operations."
        breadcrumbs={[
          { label: 'Admin Console', href: '/dashboard' },
          { label: 'Security & Audit Logs' },
        ]}
      />

      {/* Filter / Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737B89]" />
          <input
            type="text"
            placeholder="Search by action, email, or user name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-[#F7F8FA] border border-[#E5E7EB] text-xs text-[#20242C] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:bg-white placeholder:text-[#737B89]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#737B89] font-medium">Module:</label>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="text-xs text-[#20242C] bg-[#F7F8FA] border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          >
            <option value="">All Modules</option>
            <option value="Auth">Auth & Sessions</option>
            <option value="Users">User Management</option>
            <option value="Sales">Sales & Billing</option>
            <option value="Inventory">Inventory Movements</option>
            <option value="Refunds">Refunds & Returns</option>
            <option value="Stores">Store Settings</option>
            <option value="System">System Bootstrap</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#737B89]">
            <div className="w-5 h-5 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading audit event stream...
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No audit log events found"
            description="No system security or audit events matched your search query or module filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F8FA] border-b border-[#E5E7EB] text-[#737B89] uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Timestamp (Local)</th>
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Module</th>
                  <th className="py-2.5 px-3 font-semibold">Performed By</th>
                  <th className="py-2.5 px-3 font-semibold">Origin IP</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-[#F7F8FA] transition-colors">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#737B89] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-[#20242C]">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={getModuleVariant(log.module)} size="sm">
                        {log.module}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-[#20242C]">{log.performedByName || 'System'}</div>
                      {log.performedByEmail && (
                        <div className="text-[11px] text-[#737B89] truncate max-w-[180px]">
                          {log.performedByEmail}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#737B89]">
                      {log.ipAddress || 'Internal'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="text-white hover:text-neutral-300"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Details Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Event Details"
          description={`Log Entry ID: ${selectedLog._id}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button size="sm" variant="outline" onClick={copyPayload}>
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#15803D] mr-1" />
                    Copied Payload
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy Payload
                  </>
                )}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-md bg-[#F7F8FA] border border-[#E5E7EB]">
                <div className="text-[10px] uppercase font-semibold text-[#737B89]">Action</div>
                <div className="font-mono font-medium text-[#20242C] mt-0.5">{selectedLog.action}</div>
              </div>
              <div className="p-2.5 rounded-md bg-[#F7F8FA] border border-[#E5E7EB]">
                <div className="text-[10px] uppercase font-semibold text-[#737B89]">Module</div>
                <div className="font-medium text-[#20242C] mt-0.5">{selectedLog.module}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-md bg-[#F7F8FA] border border-[#E5E7EB]">
                <div className="text-[10px] uppercase font-semibold text-[#737B89]">Actor</div>
                <div className="font-medium text-[#20242C] mt-0.5">
                  {selectedLog.performedByName} ({selectedLog.performedByEmail || 'N/A'})
                </div>
              </div>
              <div className="p-2.5 rounded-md bg-[#F7F8FA] border border-[#E5E7EB]">
                <div className="text-[10px] uppercase font-semibold text-[#737B89]">Timestamp</div>
                <div className="font-mono text-[11px] text-[#20242C] mt-0.5">
                  {new Date(selectedLog.createdAt).toISOString()}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-[#737B89] mb-1">
                Context Payload &amp; Mutation Metadata
              </div>
              <pre className="p-3 rounded-md bg-[#171B26] text-slate-200 font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed border border-[#E5E7EB]/20">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
