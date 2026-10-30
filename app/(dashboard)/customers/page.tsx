'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  ShoppingBag,
  X,
  AlertCircle,
  Eye,
  Clock,
} from 'lucide-react';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CustomersPage() {
  const { user, activeStoreId } = useAuth();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Panels
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    status: 'Active',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [interactionNote, setInteractionNote] = useState('');
  const [interactionType, setInteractionType] = useState('Note');
  const [error, setError] = useState('');

  const loadCustomers = () => {
    setLoading(true);
    let url = `/api/customers?page=${page}&limit=20`;
    if (activeStoreId) url += `&storeId=${activeStoreId}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (statusFilter) url += `&status=${statusFilter}`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setCustomers(json.data.customers || []);
          setTotalPages(json.data.pagination?.pages || 1);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, [activeStoreId, search, statusFilter, page]);

  // Load customer full profile with purchase history
  const openCustomerProfile = async (customer: any) => {
    setSelectedCustomer(customer);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/customers/${customer._id}`);
      const json = await res.json();
      if (json.success) {
        setCustomerDetails(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Submit New Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          storeId: activeStoreId || user?.storeId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setFormData({ name: '', phone: '', email: '', address: '', status: 'Active', notes: '' });
        loadCustomers();
      } else {
        setError(json.error || 'Failed to create customer');
      }
    } catch {
      setError('Communication failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Add interaction note
  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interactionNote.trim() || !selectedCustomer) return;

    try {
      const res = await fetch(`/api/customers/${selectedCustomer._id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: interactionNote, type: interactionType }),
      });
      const json = await res.json();
      if (json.success) {
        setInteractionNote('');
        openCustomerProfile(selectedCustomer); // refresh
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Directory of registered store patrons, loyalty accounts, purchase records, and staff interactions."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Customer
          </Button>
        }
      />

      {/* Filter / Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-slate-50 border border-[#E5E7EB] text-xs text-[#20242C] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-44 text-xs text-[#20242C] bg-slate-50 border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Lead">Lead</option>
        </select>
      </div>

      {/* Customer Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#737B89]">Loading customer directory...</div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-5 h-5 text-slate-400" />}
            title="No customers found"
            description="No customer records match your filter criteria or search query."
            action={
              <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(true)}>
                Add First Customer
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-2.5">Customer Name</th>
                  <th className="px-5 py-2.5">Phone Number</th>
                  <th className="px-5 py-2.5">Store Branch</th>
                  <th className="px-5 py-2.5">Assigned Staff</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#20242C]">{c.name}</p>
                      {c.email && <p className="text-[11px] text-[#737B89]">{c.email}</p>}
                    </td>
                    <td className="px-5 py-3 font-mono text-[#20242C] text-[11px]">{c.phone}</td>
                    <td className="px-5 py-3 text-[#737B89]">{c.storeId?.name || 'Local Outlet'}</td>
                    <td className="px-5 py-3 text-[#737B89]">{c.assignedStaffId?.name || 'Unassigned'}</td>
                    <td className="px-5 py-3">
                      <Badge variant={getStatusVariant(c.status)} size="sm">
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() => openCustomerProfile(c)}
                      >
                        Profile & History
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* CREATE CUSTOMER MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Customer"
        description="Create a client record with contact details and branch association."
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateCustomer} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#20242C] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ananya Sen"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Mobile Phone Number</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98000 00000"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Email (Optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="customer@example.com"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Billing / Delivery Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street, City, Postal Code"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1"
              loading={submitting}
            >
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>

      {/* CUSTOMER PROFILE & INTERACTIONS DRAWER */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-[#171B26]/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-xl flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] mb-5">
                <div>
                  <h3 className="font-semibold text-[#20242C] text-base">{selectedCustomer.name}</h3>
                  <p className="text-xs text-[#737B89] font-mono mt-0.5">{selectedCustomer.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingDetails ? (
                <div className="py-12 text-center text-xs text-[#737B89]">Loading customer profile...</div>
              ) : customerDetails ? (
                <div className="space-y-5 text-xs">
                  {/* Info Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-md bg-slate-50 border border-[#E5E7EB]">
                      <span className="text-[10px] text-[#737B89] uppercase font-semibold">Email</span>
                      <p className="font-medium text-[#20242C] truncate mt-0.5">
                        {customerDetails.customer?.email || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-slate-50 border border-[#E5E7EB]">
                      <span className="text-[10px] text-[#737B89] uppercase font-semibold">Store Branch</span>
                      <p className="font-medium text-[#20242C] mt-0.5">
                        {customerDetails.customer?.storeId?.name || 'Local Store'}
                      </p>
                    </div>
                  </div>

                  {/* Purchase History */}
                  <div>
                    <h4 className="font-semibold text-[#20242C] mb-2 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-white" />
                      <span>Past Store Purchases ({customerDetails.purchases?.length || 0})</span>
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {customerDetails.purchases?.length > 0 ? (
                        customerDetails.purchases.map((p: any) => (
                          <div
                            key={p._id}
                            className="p-2.5 rounded-md bg-slate-50 border border-[#E5E7EB] flex items-center justify-between"
                          >
                            <div>
                              <p className="font-mono font-medium text-[#20242C]">{p.invoiceNumber}</p>
                              <p className="text-[10px] text-[#737B89]">{new Date(p.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-[#20242C]">₹{p.grandTotal.toLocaleString()}</p>
                              <Badge variant="neutral" size="sm">
                                {p.paymentMethod}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[#737B89] text-[11px] py-3 text-center">No purchases recorded yet.</p>
                      )}
                    </div>
                  </div>

                  {/* CRM Interaction Log */}
                  <div>
                    <h4 className="font-semibold text-[#20242C] mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-white" />
                      <span>CRM Interaction History</span>
                    </h4>

                    {/* Add Interaction Form */}
                    <form onSubmit={handleAddInteraction} className="mb-3 space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={interactionType}
                          onChange={(e) => setInteractionType(e.target.value)}
                          className="w-28 px-2 py-1.5 rounded-md bg-slate-50 border border-[#E5E7EB] text-xs"
                        >
                          <option value="Note">Note</option>
                          <option value="Call">Call</option>
                          <option value="Meeting">Meeting</option>
                          <option value="Store Visit">Store Visit</option>
                          <option value="Email">Email</option>
                        </select>
                        <input
                          type="text"
                          required
                          value={interactionNote}
                          onChange={(e) => setInteractionNote(e.target.value)}
                          placeholder="Log interaction notes or discussion summary..."
                          className="flex-1 px-3 py-1.5 rounded-md border border-[#E5E7EB] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                        />
                        <Button type="submit" variant="primary" size="sm">
                          Log
                        </Button>
                      </div>
                    </form>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {customerDetails.customer?.interactions?.map((item: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-md bg-slate-50 border border-[#E5E7EB]">
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="indigo" size="sm">
                              {item.type}
                            </Badge>
                            <span className="text-[10px] text-[#737B89]">
                              {new Date(item.date).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[#20242C] text-[11px] leading-relaxed">{item.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-[#E5E7EB]">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setSelectedCustomer(null)}
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
