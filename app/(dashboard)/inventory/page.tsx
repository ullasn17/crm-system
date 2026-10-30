'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Boxes,
  ArrowDownLeft,
  Sliders,
  History,
  AlertTriangle,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function InventoryPage() {
  const { user, activeStoreId } = useAuth();

  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
  const [inventory, setInventory] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receive Form
  const [receiveData, setReceiveData] = useState({
    productId: '',
    quantity: 10,
    reason: 'Replenishment order receipt',
    referenceId: '',
  });

  // Adjust Form
  const [adjustData, setAdjustData] = useState({
    productId: '',
    change: 0,
    reason: 'Physical count audit reconciliation',
  });

  const loadInventory = () => {
    setLoading(true);
    let url = '/api/inventory?';
    if (activeStoreId) url += `storeId=${activeStoreId}&`;
    if (lowStockFilter) url += `lowStock=true&`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setInventory(json.data.inventory || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadMovements = () => {
    let url = '/api/inventory/movements?';
    if (activeStoreId) url += `storeId=${activeStoreId}&`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setMovements(json.data.movements || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadInventory();
    loadMovements();
  }, [activeStoreId, lowStockFilter]);

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/inventory/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...receiveData,
          quantity: Number(receiveData.quantity),
          storeId: activeStoreId || user?.storeId,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowReceiveModal(false);
        setSuccessMessage('Stock successfully received and added to branch inventory.');
        loadInventory();
        loadMovements();
      } else {
        setError(json.error || 'Failed to receive stock');
      }
    } catch {
      setError('Communication error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...adjustData,
          change: Number(adjustData.change),
          storeId: activeStoreId || user?.storeId,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowAdjustModal(false);
        setSuccessMessage('Stock adjustment applied successfully.');
        loadInventory();
        loadMovements();
      } else {
        setError(json.error || 'Failed to adjust stock');
      }
    } catch {
      setError('Communication error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const name = item.productId?.name?.toLowerCase() || '';
    const sku = item.productId?.sku?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || sku.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Store Inventory"
        description="Live physical branch stock balances, threshold reorder warnings, replenishment receipts, and stock ledger."
        actions={
          (user?.role === 'Admin' || user?.role === 'Store Manager') && (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowDownLeft className="w-3.5 h-3.5" />}
                onClick={() => {
                  setShowReceiveModal(true);
                  setError('');
                }}
              >
                Receive Stock
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Sliders className="w-3.5 h-3.5" />}
                onClick={() => {
                  setShowAdjustModal(true);
                  setError('');
                }}
              >
                Adjust Stock
              </Button>
            </div>
          )
        }
      />

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

      {/* Tabs */}
      <div className="flex border-b border-[#E5E7EB] text-xs font-medium gap-6">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-2.5 transition border-b-2 cursor-pointer ${
            activeTab === 'stock'
              ? 'border-white text-white font-semibold'
              : 'border-transparent text-[#737B89] hover:text-[#20242C]'
          }`}
        >
          Branch Stock Balances
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-2.5 transition border-b-2 cursor-pointer ${
            activeTab === 'movements'
              ? 'border-white text-white font-semibold'
              : 'border-transparent text-[#737B89] hover:text-[#20242C]'
          }`}
        >
          Stock Movement Log ({movements.length})
        </button>
      </div>

      {activeTab === 'stock' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory by SKU or product name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-slate-50 border border-[#E5E7EB] text-xs text-[#20242C] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:bg-white"
              />
            </div>
            <Button
              type="button"
              variant={lowStockFilter ? 'danger' : 'secondary'}
              size="sm"
              onClick={() => setLowStockFilter(!lowStockFilter)}
            >
              {lowStockFilter ? 'Low Stock Filter Active' : 'Filter Low Stock'}
            </Button>
          </div>

          {/* Stock Table */}
          <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {loading ? (
              <div className="py-16 text-center text-xs text-[#737B89]">Loading stock levels...</div>
            ) : filteredInventory.length === 0 ? (
              <EmptyState
                icon={<Boxes className="w-5 h-5 text-slate-400" />}
                title="No inventory records found"
                description="No products match your search or low-stock filter."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                    <tr>
                      <th className="px-5 py-2.5">SKU</th>
                      <th className="px-5 py-2.5">Product Title</th>
                      <th className="px-5 py-2.5">Store Branch</th>
                      <th className="px-5 py-2.5">Available Stock</th>
                      <th className="px-5 py-2.5">Reorder Alert</th>
                      <th className="px-5 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {filteredInventory.map((item) => {
                      const isLow = item.quantity <= item.reorderThreshold;

                      return (
                        <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 font-mono font-medium text-[#20242C] text-[11px]">
                            {item.productId?.sku}
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-[#20242C]">{item.productId?.name}</p>
                            <p className="text-[11px] text-[#737B89]">
                              ₹{item.productId?.price?.toLocaleString()}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-[#737B89]">
                            {item.storeId?.name || 'Assigned Store'}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`font-semibold ${
                                isLow ? 'text-amber-800' : 'text-emerald-700'
                              }`}
                            >
                              {item.quantity} units
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            {isLow ? (
                              <Badge variant="warning" size="sm" dot>
                                Threshold: {item.reorderThreshold}
                              </Badge>
                            ) : (
                              <span className="text-[#737B89] text-[11px]">
                                Threshold: {item.reorderThreshold}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {(user?.role === 'Admin' || user?.role === 'Store Manager') && (
                              <Button
                                variant="secondary"
                                size="xs"
                                onClick={() => {
                                  setAdjustData({ productId: item.productId?._id, change: 0, reason: '' });
                                  setShowAdjustModal(true);
                                }}
                              >
                                Adjust
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
        </div>
      ) : (
        /* Stock Movements Log Table */
        <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-2.5">Timestamp</th>
                  <th className="px-5 py-2.5">Product</th>
                  <th className="px-5 py-2.5">Movement Type</th>
                  <th className="px-5 py-2.5">Qty Delta</th>
                  <th className="px-5 py-2.5">Reason / Reference</th>
                  <th className="px-5 py-2.5 text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {movements.map((m) => (
                  <tr key={m._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-[#737B89] text-[11px]">
                      {new Date(m.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 font-medium text-[#20242C]">{m.productId?.name || 'Product'}</td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={
                          m.movementType === 'Receive'
                            ? 'success'
                            : m.movementType === 'Sale'
                            ? 'info'
                            : m.movementType === 'Return'
                            ? 'indigo'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {m.movementType}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-semibold">
                      <span className={m.change > 0 ? 'text-emerald-700' : 'text-[#20242C]'}>
                        {m.change > 0 ? `+${m.change}` : m.change}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#20242C]">
                      <span>{m.reason}</span>
                      {m.referenceId && (
                        <span className="font-mono text-[10px] text-[#737B89] block">{m.referenceId}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-[#737B89]">
                      {m.performedBy?.name || 'System Automated'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECEIVE STOCK MODAL */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Receive Stock Batch"
        description="Record incoming shipment intake directly into store inventory."
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleReceiveStock} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#20242C] mb-1">Select Product *</label>
            <select
              required
              value={receiveData.productId}
              onChange={(e) => setReceiveData({ ...receiveData, productId: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option value="">Select product to receive...</option>
              {inventory.map((inv) => (
                <option key={inv.productId?._id} value={inv.productId?._id}>
                  {inv.productId?.name} ({inv.productId?.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Quantity Received</label>
            <input
              type="number"
              required
              min="1"
              value={receiveData.quantity}
              onChange={(e) => setReceiveData({ ...receiveData, quantity: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Purchase Order / Delivery Note</label>
            <input
              type="text"
              required
              value={receiveData.reason}
              onChange={(e) => setReceiveData({ ...receiveData, reason: e.target.value })}
              placeholder="e.g. PO-2026-089 Vendor Replenishment"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowReceiveModal(false)}
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
              Confirm Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* ADJUST STOCK MODAL */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Stock Level Adjustment"
        description="Reconcile inventory count discrepancy, write-offs, or damaged units."
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdjustStock} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-[#20242C] mb-1">Select Product *</label>
            <select
              required
              value={adjustData.productId}
              onChange={(e) => setAdjustData({ ...adjustData, productId: e.target.value })}
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            >
              <option value="">Select product...</option>
              {inventory.map((inv) => (
                <option key={inv.productId?._id} value={inv.productId?._id}>
                  {inv.productId?.name} (Current: {inv.quantity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">
              Quantity Delta (+ to increase, - to write off)
            </label>
            <input
              type="number"
              required
              value={adjustData.change}
              onChange={(e) => setAdjustData({ ...adjustData, change: Number(e.target.value) })}
              placeholder="-2 or +5"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Reason for Adjustment</label>
            <input
              type="text"
              required
              value={adjustData.reason}
              onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
              placeholder="e.g. Audit reconciliation or damaged package write-off"
              className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setShowAdjustModal(false)}
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
              Apply Adjustment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
