'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import {
  Package,
  Search,
  Plus,
  Tag,
  Barcode,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Boxes,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ProductsPage() {
  const { user, activeStoreId } = useAuth();

  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    description: '',
    price: 0,
    costPrice: 0,
    taxRate: 18,
    initialStock: 0,
    storeId: '',
  });

  const loadProducts = () => {
    setLoading(true);
    let url = '/api/products?';
    if (activeStoreId) url += `storeId=${activeStoreId}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (categoryFilter) url += `category=${encodeURIComponent(categoryFilter)}&`;

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProducts(json.data.products || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadCategories = () => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCategories(json.data.categories || []);
      })
      .catch(console.error);
  };

  const loadStores = () => {
    fetch('/api/stores')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStores(json.data.stores || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadStores();
  }, [activeStoreId, search, categoryFilter]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          costPrice: Number(formData.costPrice),
          taxRate: Number(formData.taxRate),
          initialStock: Number(formData.initialStock || 0),
          storeId: formData.storeId || activeStoreId || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          sku: '',
          barcode: '',
          category: '',
          description: '',
          price: 0,
          costPrice: 0,
          taxRate: 18,
          initialStock: 0,
          storeId: '',
        });
        loadProducts();
      } else {
        setError(json.error || 'Failed to create product');
      }
    } catch {
      setError('Communication error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/products/${editingProduct._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: Number(editingProduct.price),
          taxRate: Number(editingProduct.taxRate),
          isActive: editingProduct.isActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingProduct(null);
        loadProducts();
      } else {
        setError(json.error || 'Failed to update product');
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
        title="Products Master"
        description="Global SKU directory, standardized catalog, tax categorization, and branch stock inventory levels."
        actions={
          (user?.role === 'Admin' || user?.role === 'Store Manager') && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowCreateModal(true)}
            >
              Add Product
            </Button>
          )
        }
      />

      {/* Filter / Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, product name, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-slate-50 border border-[#E5E7EB] text-xs text-[#20242C] placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4F46E5] focus:bg-white"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs text-[#20242C] bg-slate-50 border border-[#E5E7EB] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#737B89]">Loading product catalog...</div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-5 h-5 text-slate-400" />}
            title="No products found"
            description="No items match your filter criteria or search query."
            action={
              (user?.role === 'Admin' || user?.role === 'Store Manager') ? (
                <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(true)}>
                  Create First Product
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[#737B89] uppercase text-[11px] font-medium border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-5 py-2.5">SKU / Barcode</th>
                  <th className="px-5 py-2.5">Product Title</th>
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-5 py-2.5 text-right">Selling Price</th>
                  <th className="px-5 py-2.5 text-right">Tax Rate</th>
                  <th className="px-5 py-2.5 text-right">Stock (Branch)</th>
                  <th className="px-5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {products.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-mono font-medium text-[#20242C] text-[11px]">{p.sku}</p>
                      {p.barcode && <p className="font-mono text-[10px] text-[#737B89]">{p.barcode}</p>}
                    </td>
                    <td className="px-5 py-3 font-medium text-[#20242C]">{p.name}</td>
                    <td className="px-5 py-3">
                      <Badge variant="neutral" size="sm">
                        {p.category}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[#20242C]">
                      ₹{p.price.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-[#737B89]">{p.taxRate}% GST</td>
                    <td className="px-5 py-3 text-right font-medium text-[#20242C]">
                      {p.stockQuantity ?? 0} units
                    </td>
                    <td className="px-5 py-3 text-right">
                      {(user?.role === 'Admin' || user?.role === 'Store Manager') && (
                        <Button
                          variant="secondary"
                          size="xs"
                          icon={<Edit2 className="w-3 h-3" />}
                          onClick={() => setEditingProduct(p)}
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PRODUCT MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Catalog Product"
        description="Register a new SKU with pricing, category, and tax rate."
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateProduct} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sony Bravia 55-inch 4K TV"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">SKU Code *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. SNY-TV-55"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Category *</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Electronics, Home, Apparel"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Barcode (Optional)</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="e.g. 8901234567890"
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Selling Price (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Cost Price (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Tax Rate (GST %)</label>
              <input
                type="number"
                min="0"
                max="28"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>
          </div>

          {/* Inventory & Initial Stock Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#20242C]">
              <Boxes className="w-4 h-4 text-[#4F46E5]" />
              <span>Starting Inventory & Stock Quantity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-[#20242C] mb-1">
                  Initial Stock to Add (Units) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.initialStock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      initialStock: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  placeholder="e.g. 50"
                  className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F46E5] bg-white"
                />
                <p className="text-[10px] text-[#737B89] mt-1">
                  Number of units immediately received into inventory
                </p>
              </div>

              <div>
                <label className="block font-medium text-[#20242C] mb-1">
                  Target Store / Branch
                </label>
                {user?.role === 'Admin' ? (
                  <select
                    value={formData.storeId || activeStoreId || ''}
                    onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5] bg-white"
                  >
                    {activeStoreId && <option value={activeStoreId}>Current Selected Branch</option>}
                    <option value="all">All Branches (Distribute stock to each)</option>
                    {stores.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={stores.find((s) => s._id === (activeStoreId || user?.storeId))?.name || 'Your Branch'}
                    className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-zinc-500 bg-zinc-100 text-xs"
                  />
                )}
                <p className="text-[10px] text-[#737B89] mt-1">
                  Branch where initial units will be received
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#20242C] mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product specs or notes..."
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
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1"
              loading={submitting}
            >
              Create Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <Modal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          title={`Edit ${editingProduct.name}`}
          description={`SKU: ${editingProduct.sku}`}
          maxWidth="md"
        >
          <form onSubmit={handleUpdatePrice} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-[#20242C] mb-1">Selling Price (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={editingProduct.price}
                onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#20242C] mb-1">Tax Rate (GST %)</label>
              <input
                type="number"
                min="0"
                max="28"
                value={editingProduct.taxRate}
                onChange={(e) => setEditingProduct({ ...editingProduct, taxRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-md border border-[#E5E7EB] text-[#20242C] text-xs focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editIsActive"
                checked={editingProduct.isActive}
                onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                className="rounded border-[#222222] accent-white"
              />
              <label htmlFor="editIsActive" className="font-medium text-[#20242C] cursor-pointer">
                Catalog Item Active for Billing
              </label>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setEditingProduct(null)}
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
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
