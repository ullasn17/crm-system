'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  ShieldCheck,
  Store as StoreIcon,
  LogIn,
  Users,
  Check,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';

interface StoreBranch {
  _id: string;
  name: string;
  code: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  settings?: {
    maxDiscountPercent?: number;
  };
}

export default function BranchesLandingPage() {
  const [stores, setStores] = useState<StoreBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');

  // Enquiry Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreBranch | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    storeId: '',
    interest: '',
    note: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Fetch active store branches
  const fetchStores = async () => {
    try {
      setLoading(true);
      let url = '/api/public/stores';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCity && selectedCity !== 'all') params.append('city', selectedCity);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setStores(json.data.stores || []);
      }
    } catch (err) {
      console.error('Failed to load stores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [search, selectedCity]);

  // Extract unique cities for filter pills
  const cities = Array.from(
    new Set(stores.map((s) => s.address?.city).filter((c): c is string => Boolean(c)))
  );

  const openEnquiryModal = (store?: StoreBranch) => {
    if (store) {
      setSelectedStore(store);
      setFormData((prev) => ({ ...prev, storeId: store._id }));
    } else if (stores.length > 0 && !formData.storeId) {
      setSelectedStore(stores[0]);
      setFormData((prev) => ({ ...prev, storeId: stores[0]._id }));
    }
    setSubmitError('');
    setSubmitSuccess(null);
    setIsModalOpen(true);
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(null);

    if (!formData.storeId) {
      setSubmitError('Please select a target store branch for your enquiry.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (json.success) {
        setSubmitSuccess(json.data.message || 'Your enquiry has been received!');
        setFormData({
          name: '',
          phone: '',
          email: '',
          storeId: selectedStore?._id || '',
          interest: '',
          note: '',
        });
      } else {
        setSubmitError(json.error || 'Failed to submit enquiry. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans text-white flex flex-col justify-between">
      <div>
        {/* Main Navbar */}
        <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#222222]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#181818] border border-[#2A2A2A] text-white flex items-center justify-center font-bold text-sm">
                <StoreIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-semibold text-sm tracking-tight text-white">
                  StorePulse Retail
                </span>
                <span className="text-[11px] text-[#888888] block -mt-0.5">
                  Showrooms &amp; Outlets Network
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openEnquiryModal()}
                className="hidden sm:inline-flex"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Make an Enquiry
              </Button>
              <Link href="/login">
                <Button variant="primary" size="sm">
                  <LogIn className="w-3.5 h-3.5 mr-1.5" />
                  Staff Sign In
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-[#0A0A0A] border-b border-[#222222] py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141414] border border-[#222222] text-xs font-medium text-[#888888] mb-4">
              <Building2 className="w-3.5 h-3.5 text-white" />
              <span>Official Retail Showroom Directory</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight">
              Locate a Branch &amp; Experience In-Store Demos
            </h1>

            <p className="mt-3 text-xs sm:text-sm text-[#888888] max-w-2xl mx-auto leading-relaxed">
              Explore our verified branch network, test products with certified product specialists, or submit an online enquiry to connect directly with branch leaders.
            </p>

            {/* Search & Filter Controls */}
            <div className="mt-6 max-w-2xl mx-auto bg-[#141414] p-3 rounded-2xl border border-[#222222] shadow-xl">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                <input
                  type="text"
                  placeholder="Search branch by name, city, address, or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#262626] text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-neutral-500"
                />
              </div>

              {/* City Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-[#222222] text-xs">
                <span className="font-medium text-[#666666] text-[11px] uppercase mr-1">City:</span>
                <button
                  onClick={() => setSelectedCity('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedCity === 'all'
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#1A1A1A] text-[#888888] border border-[#2A2A2A] hover:text-white'
                  }`}
                >
                  All Outlets ({stores.length})
                </button>
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      selectedCity === city
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#1A1A1A] text-[#888888] border border-[#2A2A2A] hover:text-white'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Store Branches Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-white">Retail Showrooms</h2>
              <p className="text-xs text-[#888888]">
                View branch hours, direct contacts, or request a localized product quote.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#22C55E] bg-[#22C55E]/10 px-3 py-1.5 rounded-lg border border-[#22C55E]/20 self-start sm:self-auto font-medium">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span>{stores.length} Active Showrooms</span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-[#888888]">Loading showroom catalog...</p>
            </div>
          ) : stores.length === 0 ? (
            <EmptyState
              title="No showrooms found"
              description="No retail store branches matched your search query or city filter."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearch('');
                    setSelectedCity('all');
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {stores.map((store) => (
                <div
                  key={store._id}
                  className="bg-[#141414] rounded-2xl border border-[#222222] p-5 shadow-xl hover:border-[#333333] transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header with Code & Status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-medium text-[#888888] bg-[#1A1A1A] px-2 py-0.5 rounded border border-[#2A2A2A]">
                        {store.code}
                      </span>
                      <Badge variant="success" size="sm">
                        Open Today
                      </Badge>
                    </div>

                    <h3 className="text-base font-semibold text-white">{store.name}</h3>

                    {/* Address */}
                    <div className="flex items-start gap-1.5 text-xs text-[#888888] mt-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#666666]" />
                      <span>
                        {store.address?.street ? `${store.address.street}, ` : ''}
                        {store.address?.city || ''}
                        {store.address?.state ? `, ${store.address.state}` : ''}
                        {store.address?.postalCode ? ` - ${store.address.postalCode}` : ''}
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1.5 mt-4 pt-3 border-t border-[#222222] text-xs">
                      {store.phone && (
                        <a
                          href={`tel:${store.phone}`}
                          className="flex items-center gap-1.5 text-[#D1D5DB] hover:text-white transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-[#666666]" />
                          <span>{store.phone}</span>
                        </a>
                      )}
                      {store.email && (
                        <a
                          href={`mailto:${store.email}`}
                          className="flex items-center gap-1.5 text-[#888888] hover:text-white transition truncate"
                        >
                          <Mail className="w-3.5 h-3.5 text-[#666666] shrink-0" />
                          <span className="truncate">{store.email}</span>
                        </a>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] text-[#888888]">
                        <Clock className="w-3.5 h-3.5 text-[#666666]" />
                        <span>Mon - Sun: 10:00 AM – 9:00 PM</span>
                      </div>
                    </div>

                    {/* Store Features */}
                    <div className="mt-3 pt-3 border-t border-[#222222] flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888]">
                        Live Demos
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#2A2A2A] text-[#888888]">
                        Express POS Billing
                      </span>
                      {store.settings?.maxDiscountPercent ? (
                        <span className="px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#FBBF24] border border-[#F59E0B]/20 font-medium">
                          Up to {store.settings.maxDiscountPercent}% Promo
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-[#222222] flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => openEnquiryModal(store)}
                      className="flex-1"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      Enquire Showroom
                    </Button>
                    {store.phone && (
                      <a
                        href={`tel:${store.phone}`}
                        className="p-2 rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] text-[#888888] hover:text-white transition flex items-center justify-center"
                        title="Call Showroom"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Value Proposition */}
        <section className="bg-[#0D0D0D] border-t border-[#222222] py-10 mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="p-5 rounded-2xl bg-[#141414] border border-[#222222]">
                <div className="w-8 h-8 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] text-white flex items-center justify-center mx-auto mb-2.5">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-xs text-white">Official Brand Warranty</h4>
                <p className="text-[11px] text-[#888888] mt-1 leading-relaxed">
                  All showroom inventory is 100% genuine and backed by comprehensive manufacturer coverage.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#141414] border border-[#222222]">
                <div className="w-8 h-8 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] text-white flex items-center justify-center mx-auto mb-2.5">
                  <Users className="w-4 h-4 text-white" />
                </div>
                <h4 className="font-semibold text-xs text-white">Dedicated Specialists</h4>
                <p className="text-[11px] text-[#888888] mt-1 leading-relaxed">
                  Branch managers and sales consultants guide your specifications and custom billing needs.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#141414] border border-[#222222]">
                <div className="w-8 h-8 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] text-[#22C55E] flex items-center justify-center mx-auto mb-2.5">
                  <Check className="w-4 h-4 text-[#22C55E]" />
                </div>
                <h4 className="font-semibold text-xs text-white">Immediate Counter Pickup</h4>
                <p className="text-[11px] text-[#888888] mt-1 leading-relaxed">
                  Submit an enquiry online and collect verified stock directly at your chosen branch counter.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-[#0A0A0A] border-t border-[#222222] py-6 text-xs text-[#888888]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#181818] border border-[#2A2A2A] text-white flex items-center justify-center font-bold text-xs">
              <StoreIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-white">StorePulse Retail CRM Network</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => openEnquiryModal()}
              className="text-[#888888] hover:text-white transition cursor-pointer"
            >
              Enquire
            </button>
            <Link
              href="/login"
              className="text-white hover:underline font-medium transition"
            >
              Staff Portal &rarr;
            </Link>
          </div>
        </div>
      </footer>

      {/* LEAD GENERATION ENQUIRY MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Showroom &amp; Product Enquiry"
        description="Connect directly with our branch manager and retail sales specialists."
        maxWidth="md"
      >
        {submitSuccess ? (
          <div className="p-4 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-white">Enquiry Received Successfully</h4>
            <p className="text-xs text-[#888888] max-w-sm mx-auto leading-relaxed">
              {submitSuccess}
            </p>
            <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#222222] text-[11px] text-[#888888]">
              A prospect lead has been logged into the store CRM pipeline. The branch manager will follow up shortly.
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  setSubmitSuccess(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleEnquirySubmit} className="space-y-3.5 text-xs">
            {submitError && (
              <div className="p-2.5 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                Target Store Branch *
              </label>
              <select
                required
                value={formData.storeId}
                onChange={(e) => {
                  const id = e.target.value;
                  setFormData({ ...formData, storeId: id });
                  const found = stores.find((s) => s._id === id);
                  setSelectedStore(found || null);
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white focus:outline-none focus:border-neutral-500"
              >
                <option value="">-- Choose a Showroom Branch --</option>
                {stores.map((s) => (
                  <option key={s._id} value={s._id} className="bg-[#141414] text-white">
                    {s.name} ({s.code}) {s.address?.city ? `— ${s.address.city}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Vikram Joshi"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-neutral-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                  Mobile Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white font-mono placeholder:text-[#666666] focus:outline-none focus:border-neutral-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                Corporate Email (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. vikram@example.com"
                className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                Product Interest / SKU Query *
              </label>
              <input
                type="text"
                required
                value={formData.interest}
                onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                placeholder="e.g. Looking for MacBook Pro M3 or 55-inch OLED display"
                className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#D1D5DB] mb-1">
                Special Request / Preferred Visit Date
              </label>
              <textarea
                rows={2}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="e.g. Planning visit this Saturday. Requesting price quotation with tax breakdown."
                className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-white placeholder:text-[#666666] focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={submitting}
                loading={submitting}
              >
                Submit Enquiry
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
