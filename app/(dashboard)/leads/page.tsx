'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Target,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  User,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function LeadsPage() {
  const { user, activeStoreId } = useAuth();

  const [leads, setLeads] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [storeList, setStoreList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueFilter, setOverdueFilter] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [updatingLead, setUpdatingLead] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'Website',
    interest: '',
    status: 'New',
    estimatedValue: '',
    followUpDate: '',
    assignedStaffId: '',
    storeId: '',
    note: '',
  });

  // Fetch Leads
  const loadLeads = () => {
    setLoading(true);
    let url = '/api/leads?';
    if (activeStoreId) url += `storeId=${activeStoreId}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (statusFilter) url += `status=${statusFilter}&`;
    if (overdueFilter) url += `overdue=true&`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setLeads(json.data.leads || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Fetch assignable staff
  const loadStaff = () => {
    let url = '/api/staff';
    if (user?.role !== 'Admin' && activeStoreId) {
      url += `?storeId=${activeStoreId}`;
    }
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStaffList(json.data.staff || []);
      })
      .catch(console.error);
  };

  // Fetch stores if Admin
  const loadStores = () => {
    if (user?.role === 'Admin') {
      fetch('/api/stores')
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setStoreList(json.data.stores || []);
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    loadLeads();
    loadStaff();
    loadStores();
  }, [activeStoreId, search, statusFilter, overdueFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const targetStore = formData.storeId || activeStoreId || user?.storeId;
      if (!targetStore) {
        setError('Please select a target store branch for this lead.');
        return;
      }

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || undefined,
          source: formData.source,
          interest: formData.interest || undefined,
          status: formData.status,
          estimatedValue: Number(formData.estimatedValue) || 0,
          followUpDate: formData.followUpDate || undefined,
          assignedStaffId: formData.assignedStaffId || null,
          storeId: targetStore,
          note: formData.note || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setSuccessMessage(`Lead "${formData.name}" created successfully.`);
        setFormData({
          name: '',
          phone: '',
          email: '',
          source: 'Website',
          interest: '',
          status: 'New',
          estimatedValue: '',
          followUpDate: '',
          assignedStaffId: '',
          storeId: '',
          note: '',
        });
        loadLeads();
      } else {
        setError(json.error || 'Failed to create lead');
      }
    } catch {
      setError('Communication error with server');
    }
  };

  // Reassign staff member
  const handleReassignStaff = async (leadId: string, newStaffId: string) => {
    try {
      setReassigningId(leadId);
      setError('');
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedStaffId: newStaffId || null }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMessage('Lead assigned successfully.');
        loadLeads();
        if (selectedLead && selectedLead._id === leadId) {
          setSelectedLead({ ...selectedLead, assignedStaffId: staffList.find((s) => s._id === newStaffId) || null });
        }
      } else {
        setError(json.error || 'Reassignment failed');
      }
    } catch {
      setError('Network communication failed');
    } finally {
      setReassigningId(null);
    }
  };

  // Convert Lead to Customer
  const handleConvertLead = async (leadId: string) => {
    setConvertingId(leadId);
    setError('');
    setSuccessMessage('');

    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMessage('Lead converted to Customer account successfully.');
        loadLeads();
        if (selectedLead && selectedLead._id === leadId) {
          setSelectedLead(null);
        }
      } else {
        setError(json.error || 'Conversion failed');
      }
    } catch {
      setError('Network communication failed');
    } finally {
      setConvertingId(null);
    }
  };

  // Add Follow-up Note / Update Status
  const handleUpdateLeadDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    setUpdatingLead(true);
    setError('');

    try {
      const res = await fetch(`/api/leads/${selectedLead._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedLead.status,
          followUpDate: selectedLead.followUpDate || undefined,
          newNote: newNoteText.trim() ? newNoteText.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMessage('Lead details updated successfully.');
        setNewNoteText('');
        setSelectedLead(json.data.lead);
        loadLeads();
      } else {
        setError(json.error || 'Update failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setUpdatingLead(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads Pipeline"
        description="Track prospects across conversion stages, schedule follow-ups, and convert leads into registered customer accounts."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setFormData({
                name: '',
                phone: '',
                email: '',
                source: 'Website',
                interest: '',
                status: 'New',
                estimatedValue: '',
                followUpDate: '',
                assignedStaffId: '',
                storeId: activeStoreId || user?.storeId || '',
                note: '',
              });
              setShowCreateModal(true);
              setError('');
              setSuccessMessage('');
            }}
          >
            New Lead
          </Button>
        }
      />

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads by name, phone, email, or interest..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-slate-50 border border-[#E5E7EB] text-xs text-[#20242C] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-40 text-xs text-[#20242C] bg-slate-50 border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Contacted">Contacted</option>
          <option value="Qualified">Qualified</option>
          <option value="Proposal">Proposal</option>
          <option value="Converted">Converted</option>
          <option value="Lost">Lost</option>
        </select>

        <Button
          type="button"
          variant={overdueFilter ? 'danger' : 'secondary'}
          size="sm"
          onClick={() => setOverdueFilter(!overdueFilter)}
        >
          {overdueFilter ? 'Overdue Only (Active)' : 'Filter Overdue'}
        </Button>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#737B89]">Loading leads records...</div>
        ) : leads.length === 0 ? (
          <EmptyState
            icon={<Target className="w-5 h-5 text-slate-400" />}
            title="No leads found"
            description="No active prospects match your filter criteria or search query."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCreateModal(true)}
              >
                Create New Lead
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-2.5">Prospect Name</th>
                  <th className="px-5 py-2.5">Assigned Staff</th>
                  <th className="px-5 py-2.5">Source & Value</th>
                  <th className="px-5 py-2.5">Next Follow-Up</th>
                  <th className="px-5 py-2.5">Pipeline Status</th>
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {leads.map((lead) => {
                  const isOverdue =
                    lead.followUpDate &&
                    new Date(lead.followUpDate) < new Date() &&
                    lead.status !== 'Converted' &&
                    lead.status !== 'Lost';

                  return (
                    <tr key={lead._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-[#20242C]">{lead.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-[#737B89] mt-0.5">
                          <span className="font-mono">{lead.phone}</span>
                          {lead.email && <span className="truncate max-w-[130px]">({lead.email})</span>}
                        </div>
                        {lead.interest && (
                          <p className="text-[11px] text-white truncate max-w-xs mt-0.5">
                            Interest: {lead.interest}
                          </p>
                        )}
                      </td>

                      {/* Staff Selector */}
                      <td className="px-5 py-3">
                        {user?.role === 'Admin' || user?.role === 'Store Manager' ? (
                          <select
                            value={lead.assignedStaffId?._id || ''}
                            onChange={(e) => handleReassignStaff(lead._id, e.target.value)}
                            disabled={reassigningId === lead._id || lead.status === 'Converted'}
                            className="text-xs bg-slate-50 border border-[#E5E7EB] rounded px-2 py-1 text-[#20242C] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                          >
                            <option value="">Unassigned Pool</option>
                            {staffList.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.name} ({s.role})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-[#737B89]">
                            {lead.assignedStaffId?.name || 'Unassigned'}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <span className="font-medium text-[#20242C]">{lead.source}</span>
                        {lead.estimatedValue > 0 && (
                          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                            ₹{lead.estimatedValue.toLocaleString('en-IN')}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        {lead.followUpDate ? (
                          <div className="flex items-center gap-1.5">
                            <span className={isOverdue ? 'text-rose-600 font-medium' : 'text-[#737B89]'}>
                              {new Date(lead.followUpDate).toLocaleDateString()}
                            </span>
                            {isOverdue && (
                              <Badge variant="error" size="sm">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">None set</span>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <Badge variant={getStatusVariant(lead.status)} size="sm">
                          {lead.status}
                        </Badge>
                      </td>

                      <td className="px-5 py-3 text-right space-x-1.5">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => {
                            setSelectedLead(lead);
                            setNewNoteText('');
                          }}
                        >
                          Notes
                        </Button>

                        {lead.status === 'Converted' ? (
                          <Badge variant="success" size="sm">
                            Converted
                          </Badge>
                        ) : (
                          <Button
                            variant="primary"
                            size="xs"
                            disabled={convertingId === lead._id}
                            loading={convertingId === lead._id}
                            onClick={() => handleConvertLead(lead._id)}
                          >
                            Convert
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE LEAD MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New Lead"
        description="Capture prospect contact info, product interest, and assign to team."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Prospect Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Vikram Joshi"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Email (Optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. vikram@example.com"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Lead Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="Walk-in">Walk-in (Showroom Visitor)</option>
                <option value="Website">Website Inquiry</option>
                <option value="Referral">Client Referral</option>
                <option value="Social Media">Social Media Campaign</option>
                <option value="Cold Call">Cold Outreach</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Pipeline Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="New">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal Submitted</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Assign Staff Member</label>
            <select
              value={formData.assignedStaffId}
              onChange={(e) => {
                const selectedStaffId = e.target.value;
                const selectedMember = staffList.find((s) => String(s._id) === String(selectedStaffId));
                let autoStoreId = formData.storeId;

                if (selectedMember && selectedMember.storeId) {
                  autoStoreId =
                    typeof selectedMember.storeId === 'object'
                      ? String(selectedMember.storeId._id)
                      : String(selectedMember.storeId);
                }

                setFormData((prev) => ({
                  ...prev,
                  assignedStaffId: selectedStaffId,
                  storeId: autoStoreId || prev.storeId,
                }));
              }}
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option value="">Unassigned (Branch Pool)</option>
              {staffList.map((s) => (
                <option key={s._id} value={String(s._id)}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          {user?.role === 'Admin' && (
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Target Store Branch *</label>
              <select
                value={formData.storeId || ''}
                onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="">Select Branch Outlet</option>
                {storeList.map((store) => (
                  <option key={store._id} value={String(store._id)}>
                    {store.name} ({store.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Product Interest</label>
              <input
                type="text"
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                placeholder="e.g. 55-inch OLED TV"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Follow-Up Date</label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Initial Discussion Note</label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="e.g. Client requested quotation with weekend delivery."
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" className="flex-1">
              Save Lead
            </Button>
          </div>
        </form>
      </Modal>

      {/* LEAD DETAILS & TIMELINE MODAL */}
      {selectedLead && (
        <Modal
          isOpen={Boolean(selectedLead)}
          onClose={() => setSelectedLead(null)}
          title={selectedLead.name}
          description={`${selectedLead.phone} ${selectedLead.email ? `• ${selectedLead.email}` : ''}`}
          maxWidth="md"
        >
          <form onSubmit={handleUpdateLeadDetails} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-slate-50 border border-[#E5E7EB]">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#737B89]">Assigned Staff</span>
                <p className="font-medium text-[#20242C] mt-0.5">
                  {selectedLead.assignedStaffId?.name || 'Unassigned'}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#737B89]">Estimated Value</span>
                <p className="font-semibold text-emerald-700 mt-0.5">
                  ₹{(selectedLead.estimatedValue || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] uppercase font-semibold text-[#737B89]">Product Interest</span>
                <p className="text-[#20242C] mt-0.5">
                  {selectedLead.interest || 'No specific interest recorded'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#20242C] mb-1">Update Status</label>
                <select
                  value={selectedLead.status}
                  onChange={(e) => setSelectedLead({ ...selectedLead, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Converted">Converted</option>
                  <option value="Lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-[#20242C] mb-1">Follow-Up Date</label>
                <input
                  type="date"
                  value={
                    selectedLead.followUpDate
                      ? new Date(selectedLead.followUpDate).toISOString().split('T')[0]
                      : ''
                  }
                  onChange={(e) => setSelectedLead({ ...selectedLead, followUpDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#20242C] mb-1">Add Follow-Up Note</label>
              <textarea
                rows={2}
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Log discussion details or next agreed steps..."
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            <div>
              <span className="block font-medium text-[#20242C] mb-1">
                Activity Timeline ({selectedLead.notes?.length || 0})
              </span>
              <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                {selectedLead.notes && selectedLead.notes.length > 0 ? (
                  selectedLead.notes.map((n: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-md bg-slate-50 border border-[#E5E7EB] text-[11px]">
                      <p className="text-[#20242C]">{n.text}</p>
                      <p className="text-[10px] text-[#737B89] mt-1 font-mono">
                        {new Date(n.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[#737B89] text-[11px] italic">No activity recorded yet.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setSelectedLead(null)}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="flex-1"
                loading={updatingLead}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
