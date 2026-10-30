'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Receipt,
  Search,
  RotateCcw,
  Printer,
  X,
  AlertCircle,
  CheckCircle2,
  Calendar,
  XCircle,
  ShoppingCart,
  Eye,
  Camera,
  Trash2,
} from 'lucide-react';
import { Badge, getStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function SalesPage() {
  const { user, activeStoreId } = useAuth();

  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showReturnModal, setShowReturnModal] = useState<any>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnPhoto, setReturnPhoto] = useState('');
  const [returnPhotoName, setReturnPhotoName] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Product photo must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReturnPhoto(reader.result);
        setReturnPhotoName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const loadSales = () => {
    setLoading(true);
    let url = '/api/sales?';
    if (activeStoreId) url += `storeId=${activeStoreId}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (paymentMethodFilter) url += `paymentMethod=${paymentMethodFilter}&`;
    if (statusFilter) url += `paymentStatus=${statusFilter}&`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSales(json.data.sales || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSales();
  }, [activeStoreId, search, paymentMethodFilter, statusFilter]);

  const handleCancelSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCancelModal) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/sales/${showCancelModal._id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason, restockItems: true }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCancelModal(null);
        setCancelReason('');
        setSuccess('Sale transaction cancelled and inventory returned to stock.');
        loadSales();
      } else {
        setError(json.error || 'Failed to cancel sale');
      }
    } catch {
      setError('Communication error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReturnModal) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: showReturnModal._id,
          productPhoto: returnPhoto,
          items: showReturnModal.items.map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            reason: returnReason,
            productPhoto: returnPhoto,
          })),
          restockItems: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowReturnModal(null);
        setReturnReason('');
        setReturnPhoto('');
        setReturnPhotoName('');
        setSuccess('Return request submitted for Store Manager approval.');
      } else {
        setError(json.error || 'Failed to request return');
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
        title="Sales Orders"
        description="Comprehensive transactional ledger, tax invoice generation, cancellation audits, and customer refunds."
        actions={
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

      {/* Filter / Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-slate-50 border border-[#E5E7EB] text-xs text-[#20242C] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:bg-white"
          />
        </div>
        <select
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value)}
          className="text-xs text-[#20242C] bg-slate-50 border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="">All Payment Modes</option>
          <option value="Cash">Cash</option>
          <option value="Online">Online</option>
          <option value="UPI">UPI</option>
          <option value="Card">Card</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs text-[#20242C] bg-slate-50 border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Pending">Pending</option>
          <option value="Refunded">Refunded</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#737B89]">Loading transactions...</div>
        ) : sales.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-5 h-5 text-slate-400" />}
            title="No transactions found"
            description="No sales orders match your search query or filter selection."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-2.5">Invoice #</th>
                  <th className="px-5 py-2.5">Customer</th>
                  <th className="px-5 py-2.5">Branch & Cashier</th>
                  <th className="px-5 py-2.5">Payment Mode</th>
                  <th className="px-5 py-2.5 text-right">Grand Total</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-mono font-medium text-white text-[11px]">
                        {sale.invoiceNumber}
                      </p>
                      <p className="text-[10px] text-[#737B89]">
                        {new Date(sale.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-[#20242C]">{sale.customerName}</p>
                      {sale.customerPhone && (
                        <p className="text-[11px] text-[#737B89] font-mono">{sale.customerPhone}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-[#20242C] font-medium">{sale.storeId?.name || 'Local Store'}</p>
                      <p className="text-[11px] text-[#737B89]">Cashier: {sale.cashierId?.name || 'Staff'}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant="neutral" size="sm">
                        {sale.paymentMethod}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[#20242C]">
                      ₹{sale.grandTotal.toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={getStatusVariant(sale.paymentStatus)} size="sm">
                        {sale.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right space-x-1.5">
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={<Eye className="w-3 h-3" />}
                        onClick={() => setSelectedSale(sale)}
                      >
                        Receipt
                      </Button>
                      {sale.paymentStatus === 'Paid' && (
                        <>
                          <Button
                            variant="secondary"
                            size="xs"
                            icon={<RotateCcw className="w-3 h-3" />}
                            onClick={() => setShowReturnModal(sale)}
                          >
                            Return
                          </Button>
                          {(user?.role === 'Admin' || user?.role === 'Store Manager') && (
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={() => setShowCancelModal(sale)}
                            >
                              Cancel
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INVOICE VIEW MODAL */}
      {selectedSale && (
        <Modal
          isOpen={Boolean(selectedSale)}
          onClose={() => setSelectedSale(null)}
          title={`Invoice ${selectedSale.invoiceNumber}`}
          description={new Date(selectedSale.createdAt).toLocaleString()}
          maxWidth="md"
          footer={
            <div className="flex gap-2 w-full justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => window.print()}
              >
                Print Invoice
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setSelectedSale(null)}
              >
                Close
              </Button>
            </div>
          }
        >
          <div
            id="printable-receipt"
            className="p-4 rounded-md bg-slate-50 border border-[#E5E7EB] text-xs font-mono space-y-3"
          >
            <div className="text-center pb-2 border-b border-slate-200">
              <h2 className="font-bold text-sm tracking-tight text-[#20242C]">STOREPULSE TAX INVOICE</h2>
              <p className="text-[10px] text-[#737B89]">{selectedSale.storeId?.name || 'Retail Branch'}</p>
              <p className="text-[10px] text-[#737B89] mt-0.5">Invoice: {selectedSale.invoiceNumber}</p>
              <p className="text-[10px] text-[#737B89]">{new Date(selectedSale.createdAt).toLocaleString()}</p>
            </div>

            <div>
              <p className="font-semibold text-[#20242C]">Customer: {selectedSale.customerName}</p>
              {selectedSale.customerPhone && (
                <p className="text-[10px] text-[#737B89]">Phone: {selectedSale.customerPhone}</p>
              )}
            </div>

            <div className="border-t border-b border-slate-200 py-2 space-y-1">
              {selectedSale.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span className="truncate pr-2">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-semibold">₹{item.total?.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between text-[#737B89]">
                <span>Subtotal:</span>
                <span className="text-[#20242C]">₹{selectedSale.subtotal?.toLocaleString()}</span>
              </div>
              {selectedSale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span>-₹{selectedSale.discountTotal?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-[#737B89]">
                <span>GST Tax:</span>
                <span className="text-[#20242C]">₹{selectedSale.taxTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-xs pt-1 border-t border-slate-200 text-[#20242C]">
                <span>Grand Total:</span>
                <span>₹{selectedSale.grandTotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] text-[#737B89] pt-1">
                <span>Payment Mode:</span>
                <span className="font-semibold text-[#20242C]">{selectedSale.paymentMethod} ({selectedSale.paymentStatus})</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && (
        <Modal
          isOpen={Boolean(showCancelModal)}
          onClose={() => setShowCancelModal(null)}
          title="Cancel Transaction"
          description={`Invoice #${showCancelModal.invoiceNumber} will be marked as cancelled and items returned to branch inventory.`}
          maxWidth="sm"
        >
          <form onSubmit={handleCancelSale} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Reason for Cancellation *</label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer billing error / Order annulled"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setShowCancelModal(null)}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                className="flex-1"
                loading={submitting}
              >
                Confirm Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* RETURN REQUEST MODAL */}
      {showReturnModal && (
        <Modal
          isOpen={Boolean(showReturnModal)}
          onClose={() => {
            setShowReturnModal(null);
            setReturnReason('');
            setReturnPhoto('');
            setReturnPhotoName('');
          }}
          title="Initiate Return Request"
          description={`Request refund for invoice #${showReturnModal.invoiceNumber} (₹${showReturnModal.grandTotal.toLocaleString()}).`}
          maxWidth="md"
        >
          <form onSubmit={handleRequestReturn} className="space-y-4 text-xs">
            {/* Products Being Returned */}
            <div className="p-3 rounded-md bg-slate-50 border border-[#E5E7EB] space-y-1.5">
              <p className="text-[11px] font-semibold text-[#737B89] uppercase tracking-wider">
                Returning Products
              </p>
              {showReturnModal.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[#20242C] text-xs">
                  <span className="font-medium">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-mono text-[#737B89]">₹{item.total?.toLocaleString()}</span>
                </div>
              ))}
            </div>

            {/* Return Reason */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-[#20242C]">Reason for Return *</label>
                <span className="text-[10px] text-[#737B89]">Required for manager review</span>
              </div>
              <input
                type="text"
                required
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="e.g. Defective unit, customer exchange, damaged in transit"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
              {/* Quick reason suggestions */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  'Defective / Damaged product',
                  'Wrong item delivered',
                  'Customer exchange request',
                  'Quality issue / Malfunction',
                ].map((reasonSuggestion) => (
                  <button
                    key={reasonSuggestion}
                    type="button"
                    onClick={() => setReturnReason(reasonSuggestion)}
                    className="text-[10px] px-2 py-0.5 rounded border border-[#222222] bg-[#1a1a1a] text-[#888888] hover:text-white hover:border-[#444444] transition-colors"
                  >
                    + {reasonSuggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo of Product */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-[#20242C]">Photo of Product (with Reason)</label>
                <span className="text-[10px] text-emerald-400 font-medium">Visual proof</span>
              </div>
              <p className="text-[11px] text-[#737B89] mb-2">
                Upload a photo showing the product condition, defect, or damage alongside the reason.
              </p>

              {returnPhoto ? (
                <div className="relative rounded-lg border border-[#222222] bg-[#141414] p-3 flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-md overflow-hidden border border-[#333333] shrink-0 bg-black flex items-center justify-center">
                    <img
                      src={returnPhoto}
                      alt="Product Condition Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">
                      {returnPhotoName || 'Product Condition Photo'}
                    </p>
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Photo attached with return reason
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReturnPhoto('');
                      setReturnPhotoName('');
                    }}
                    className="p-1.5 rounded-md hover:bg-[#222222] text-[#888888] hover:text-rose-400 transition"
                    title="Remove photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-[#222222] hover:border-[#444444] rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-[#141414] hover:bg-[#181818] transition group">
                  <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#888888] group-hover:text-white mb-2 transition">
                    <Camera className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-medium text-white">Click to upload photo of product</p>
                  <p className="text-[10px] text-[#737B89] mt-0.5">PNG, JPG, WEBP up to 5MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setShowReturnModal(null);
                  setReturnReason('');
                  setReturnPhoto('');
                  setReturnPhotoName('');
                }}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="flex-1"
                loading={submitting}
              >
                Submit Return Order
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
