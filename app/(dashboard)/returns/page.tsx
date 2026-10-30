'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Package,
  Eye,
  Camera,
  ZoomIn,
} from 'lucide-react';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ReturnsPage() {
  const { user, activeStoreId } = useAuth();

  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Approval modal
  const [reviewingItem, setReviewingItem] = useState<any>(null);
  const [previewPhoto, setPreviewPhoto] = useState<{
    url: string;
    title: string;
    reason?: string;
    invoice?: string;
  } | null>(null);
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadReturns = () => {
    setLoading(true);
    let url = '/api/returns?';
    if (activeStoreId) url += `storeId=${activeStoreId}&`;
    if (statusFilter) url += `status=${statusFilter}&`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setReturns(json.data.returns || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReturns();
  }, [activeStoreId, statusFilter]);

  const handleReviewAction = async (action: 'Approved' | 'Rejected') => {
    if (!reviewingItem) return;
    setError('');
    setProcessing(true);

    try {
      const res = await fetch(`/api/returns/${reviewingItem._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comments }),
      });

      const json = await res.json();
      if (json.success) {
        setReviewingItem(null);
        setComments('');
        setSuccess(`Return request has been ${action.toLowerCase()}.`);
        loadReturns();
      } else {
        setError(json.error || `Failed to ${action.toLowerCase()} return`);
      }
    } catch {
      setError('Communication error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Returns & Refunds"
        description="Manager review queue for customer returns, restock reconciliation, and authorized refunds."
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

      {/* Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs text-[#20242C] bg-slate-50 border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Returns Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#737B89]">Loading returns queue...</div>
        ) : returns.length === 0 ? (
          <EmptyState
            icon={<RotateCcw className="w-5 h-5 text-slate-400" />}
            title="No return requests"
            description="There are currently no customer returns in this queue."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-2.5">Invoice #</th>
                  <th className="px-5 py-2.5">Items Returned</th>
                  <th className="px-5 py-2.5">Requested By</th>
                  <th className="px-5 py-2.5">Refund Amount</th>
                  <th className="px-5 py-2.5">Restock Policy</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {returns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-mono font-medium text-[#20242C] text-[11px]">{ret.invoiceNumber}</p>
                      <p className="text-[10px] text-[#737B89]">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      {ret.items?.map((item: any, idx: number) => {
                        const photo = item.productPhoto || ret.productPhoto;
                        return (
                          <div key={idx} className="flex items-start gap-2.5 py-1">
                            {photo ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewPhoto({
                                    url: photo,
                                    title: `${item.quantity}x ${item.name}`,
                                    reason: item.reason,
                                    invoice: ret.invoiceNumber,
                                  })
                                }
                                className="relative group shrink-0 w-10 h-10 rounded border border-[#222222] bg-black overflow-hidden hover:border-white transition-all cursor-pointer"
                                title="Click to view product condition photo"
                              >
                                <img
                                  src={photo}
                                  alt={item.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded border border-[#222222] bg-[#1a1a1a] flex items-center justify-center shrink-0 text-[#666666]">
                                <Package className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-[#20242C]">
                                {item.quantity}x {item.name}
                              </p>
                              <p className="text-[#737B89] font-normal italic text-[11px]">
                                &quot;{item.reason}&quot;
                              </p>
                              {photo && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> Photo Attached
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#20242C]">{ret.requestedBy?.name}</p>
                      <p className="text-[11px] text-[#737B89]">{ret.requestedBy?.role}</p>
                    </td>
                    <td className="px-5 py-3 font-semibold text-rose-600">
                      ₹{ret.totalRefundAmount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      {ret.restockItems ? (
                        <span className="text-emerald-700 font-medium text-[11px]">Restock to store</span>
                      ) : (
                        <span className="text-[#737B89] text-[11px]">No Restock</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={getStatusVariant(ret.status)} size="sm">
                        {ret.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {ret.status === 'Pending' ? (
                        user?.role === 'Admin' || user?.role === 'Store Manager' ? (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => {
                              setReviewingItem(ret);
                              setError('');
                            }}
                          >
                            Review & Decide
                          </Button>
                        ) : (
                          <span className="text-[#737B89] text-[11px]">Awaiting Manager</span>
                        )
                      ) : (
                        <span className="text-[#737B89] text-[11px]">
                          Reviewed by {ret.reviewedBy?.name || 'Manager'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVIEW & APPROVAL MODAL */}
      {reviewingItem && (
        <Modal
          isOpen={Boolean(reviewingItem)}
          onClose={() => setReviewingItem(null)}
          title="Review Return Request"
          description={`Invoice #${reviewingItem.invoiceNumber} • Refund: ₹${reviewingItem.totalRefundAmount.toLocaleString()}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-md bg-slate-50 border border-[#E5E7EB] space-y-2">
              <div className="flex justify-between font-semibold text-[#20242C]">
                <span>Invoice: {reviewingItem.invoiceNumber}</span>
                <span className="text-rose-600 font-mono">
                  ₹{reviewingItem.totalRefundAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-[#737B89] text-[11px]">
                Requested by: {reviewingItem.requestedBy?.name} ({reviewingItem.requestedBy?.role})
              </p>

              <div className="pt-2 border-t border-slate-200 mt-2 space-y-3">
                {reviewingItem.items?.map((i: any, idx: number) => {
                  const photo = i.productPhoto || reviewingItem.productPhoto;
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-start text-[#20242C]">
                        <div>
                          <p className="font-semibold">{i.quantity}x {i.name}</p>
                          <p className="text-[#737B89] mt-0.5">
                            Reason: <span className="text-white italic">&quot;{i.reason}&quot;</span>
                          </p>
                        </div>
                      </div>

                      {photo && (
                        <div className="rounded-lg border border-[#222222] bg-[#141414] p-2.5">
                          <p className="text-[10px] font-semibold text-[#737B89] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-emerald-400" /> Product Condition Photo
                          </p>
                          <div className="relative group rounded overflow-hidden border border-[#333333] max-h-48 bg-black flex items-center justify-center">
                            <img
                              src={photo}
                              alt="Product Condition"
                              className="w-full max-h-48 object-contain cursor-pointer"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: photo,
                                  title: `${i.quantity}x ${i.name}`,
                                  reason: i.reason,
                                  invoice: reviewingItem.invoiceNumber,
                                })
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewPhoto({
                                  url: photo,
                                  title: `${i.quantity}x ${i.name}`,
                                  reason: i.reason,
                                  invoice: reviewingItem.invoiceNumber,
                                })
                              }
                              className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 hover:bg-black text-white text-[10px] rounded border border-[#444444] flex items-center gap-1 opacity-90 hover:opacity-100 transition cursor-pointer"
                            >
                              <ZoomIn className="w-3 h-3" /> Full View
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#20242C] mb-1">
                Manager Review Decision Notes
              </label>
              <input
                type="text"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g. Verified product condition and photo, approved refund."
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="flex-1"
                disabled={processing}
                loading={processing}
                onClick={() => handleReviewAction('Rejected')}
              >
                Reject Request
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="flex-1"
                disabled={processing}
                loading={processing}
                onClick={() => handleReviewAction('Approved')}
              >
                Authorize Refund & Restock
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* FULL PHOTO LIGHTBOX MODAL */}
      {previewPhoto && (
        <Modal
          isOpen={Boolean(previewPhoto)}
          onClose={() => setPreviewPhoto(null)}
          title="Product Condition Photo"
          description={`Invoice #${previewPhoto.invoice || ''} • ${previewPhoto.title || ''}`}
          maxWidth="lg"
        >
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden border border-[#222222] bg-black flex items-center justify-center p-1">
              <img
                src={previewPhoto.url}
                alt="Product Full Resolution"
                className="max-h-[60vh] w-auto max-w-full object-contain mx-auto rounded"
              />
            </div>
            {previewPhoto.reason && (
              <div className="p-3 rounded-md bg-[#1a1a1a] border border-[#222222] text-xs">
                <span className="text-[#888888] font-medium">Stated Return Reason: </span>
                <span className="text-white font-medium italic">&quot;{previewPhoto.reason}&quot;</span>
              </div>
            )}
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewPhoto(null)}
              >
                Close Photo
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
