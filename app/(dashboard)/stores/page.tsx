'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function StoresPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    maxDiscountPercent: 20,
    refundRequiresApproval: true,
  });

  const loadStores = () => {
    setLoading(true);
    fetch('/api/stores')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStores(json.data.stores || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user && user.role !== 'Admin') {
      router.push('/unauthorized');
      return;
    }
    loadStores();
  }, [user]);

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code.toUpperCase(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            postalCode: formData.postalCode,
          },
          settings: {
            maxDiscountPercent: Number(formData.maxDiscountPercent),
            refundRequiresApproval: formData.refundRequiresApproval,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          code: '',
          phone: '',
          email: '',
          street: '',
          city: '',
          state: '',
          postalCode: '',
          maxDiscountPercent: 20,
          refundRequiresApproval: true,
        });
        setSuccess('New store branch successfully initialized.');
        loadStores();
      } else {
        setError(json.error || 'Failed to create store');
      }
    } catch {
      setError('Communication error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Branch Stores"
        description="Multi-store physical retail locations, assigned branch manager rules, and POS cashier limits."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Branch
          </Button>
        }
      />

      {success && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-[#737B89]">Loading stores...</div>
        ) : stores.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<Building2 className="w-5 h-5 text-slate-400" />}
              title="No stores found"
              description="No physical branch locations configured yet."
              action={
                <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(true)}>
                  Add First Store
                </Button>
              }
            />
          </div>
        ) : (
          stores.map((s) => (
            <div
              key={s._id}
              className="p-5 rounded-lg bg-white border border-[#E5E7EB] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-semibold text-white bg-[#1A1A1A] border border-[#2A2A2A] px-2 py-0.5 rounded">
                    {s.code}
                  </span>
                  <Badge variant={s.isActive ? 'success' : 'neutral'} size="sm">
                    {s.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <h3 className="font-semibold text-[#20242C] text-sm mb-1">{s.name}</h3>
                <p className="text-xs text-[#737B89] flex items-center gap-1.5 mt-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span>
                    {s.address?.city || 'City'}, {s.address?.state || 'State'}
                  </span>
                </p>
                {s.phone && (
                  <p className="text-xs text-[#737B89] flex items-center gap-1.5 mt-1 font-mono">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>{s.phone}</span>
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-[#737B89]">
                <div className="flex justify-between">
                  <span>Max Cashier Discount:</span>
                  <span className="font-medium text-[#20242C]">{s.settings?.maxDiscountPercent || 20}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Refund Approvals:</span>
                  <span className="font-medium text-[#20242C]">
                    {s.settings?.refundRequiresApproval ? 'Requires Manager' : 'Automated'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE STORE MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Store Branch"
        description="Establish a new retail outlet with location parameters and cashier limits."
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateStore} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Branch Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Indiranagar Showroom"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Store Code *</label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. BLR-IND"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 80 1234 5678"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="branch@storepulse.local"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Street Address</label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              placeholder="e.g. 100 Feet Road"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Bengaluru"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Karnataka"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Postal Code</label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="560038"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Max Cashier Discount (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                value={formData.maxDiscountPercent}
                onChange={(e) => setFormData({ ...formData, maxDiscountPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="reqApproval"
                checked={formData.refundRequiresApproval}
                onChange={(e) => setFormData({ ...formData, refundRequiresApproval: e.target.checked })}
                className="rounded border-[#222222] accent-white"
              />
              <label htmlFor="reqApproval" className="font-medium text-[#20242C] cursor-pointer">
                Refunds Require Manager Approval
              </label>
            </div>
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
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1"
              loading={submitting}
            >
              Create Branch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
