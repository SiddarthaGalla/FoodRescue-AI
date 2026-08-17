import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Package, Plus, Truck, 
  Leaf, Award, RefreshCw, MapPin, Clock, X, Receipt, Loader2
} from 'lucide-react';
import { Sidebar } from '../../components/common/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiRequest } from '../../services/api';
import { Donation, DonationStatus } from '../../types/donation';
import { cardHover } from '../../animations/variants';

type Tab = 'overview' | 'listings' | 'pickups' | 'tax';

const STATUS_STYLES: Record<DonationStatus, string> = {
  available: 'bg-brand-500/10 text-brand-700 dark:text-brand-400 border-brand-500/20',
  claimed: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  picked_up: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20',
};

const STATUS_LABELS: Record<DonationStatus, string> = {
  available: 'Available',
  claimed: 'Claimed',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const DonorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const tab: Tab = location.pathname.includes('/listings') ? 'listings'
    : location.pathname.includes('/pickups') ? 'pickups'
    : location.pathname.includes('/tax') ? 'tax'
    : 'overview';
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    quantity: '',
    itemType: '',
    expiryDateTime: '',
    pickupLocation: '',
    pickupWindowStart: '',
    pickupWindowEnd: '',
    estimatedValue: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Donation[]>('/donations');
      setDonations(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load your donations', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const active = donations.filter((d) => d.status !== 'cancelled');
  const pickups = donations.filter((d) => d.status === 'claimed' || d.status === 'picked_up');
  const delivered = donations.filter((d) => d.status === 'delivered');

  const totalPortions = active.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const deliveredPortions = delivered.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const co2Tons = (deliveredPortions * 1.1) / 1000;
  const taxValue = delivered.reduce(
    (sum, d) => sum + (d.quantity || 0) * (d.estimatedValue || 0),
    0
  );

  const stats = [
    { title: 'Total Donated Portions', value: totalPortions.toLocaleString(), change: `${active.length} listing${active.length === 1 ? '' : 's'}`, icon: Package },
    { title: 'Active Pickups', value: pickups.length.toLocaleString(), change: pickups.length ? 'In progress' : 'Awaiting claims', icon: Truck },
    { title: 'CO₂ Emissions Saved', value: co2Tons > 0 ? `${co2Tons.toFixed(1)} Tons` : '0 Tons', change: 'From delivered meals', icon: Leaf },
    { title: 'Tax Deductible Value', value: taxValue > 0 ? money(taxValue) : '$0', change: 'Delivered batches only', icon: Award },
  ];

  const updateField = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest<Donation>('/donations', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          quantity: parseInt(form.quantity, 10),
          itemType: form.itemType || null,
          expiryDateTime: form.expiryDateTime ? new Date(form.expiryDateTime).toISOString() : null,
          pickupLocation: form.pickupLocation,
          pickupWindowStart: new Date(form.pickupWindowStart).toISOString(),
          pickupWindowEnd: new Date(form.pickupWindowEnd).toISOString(),
          estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : null,
        }),
      });
      showToast('Food surplus posted to the matching engine!', 'success');
      setShowModal(false);
      setForm({
        title: '', description: '', quantity: '', itemType: '', expiryDateTime: '',
        pickupLocation: '', pickupWindowStart: '', pickupWindowEnd: '', estimatedValue: '',
      });
      fetchDonations();
    } catch (err: any) {
      showToast(err.message || 'Failed to post donation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await apiRequest<Donation>(`/donations/${id}/cancel`, { method: 'POST' });
      showToast('Listing cancelled', 'success');
      fetchDonations();
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel listing', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const openModal = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    const toLocal = (d: Date) => {
      const off = d.getTimezoneOffset();
      return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
    };
    setForm((f) => ({
      ...f,
      pickupWindowStart: toLocal(now),
      pickupWindowEnd: toLocal(end),
    }));
    setShowModal(true);
  };

  const shortId = (id: string) => `DON-${id.slice(0, 6).toUpperCase()}`;

  const statusBadge = (status: DonationStatus) => (
    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-5rem)] bg-mesh-light dark:bg-mesh-dark">
      <Sidebar role="donor" />

      <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase rounded-md bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-500/20">
                Donor Portal
              </span>
              <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
                Welcome back, {user?.name || 'Partner Kitchen'}
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
                Manage your food surplus posts, track pickups, and view tax deductions.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={fetchDonations}
                className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 glass-card rounded-2xl flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={openModal}
                className="flex-1 sm:flex-none px-5 py-3 text-xs font-bold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Post Food Surplus</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* ============ OVERVIEW ============ */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {stats.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.div key={idx} whileHover="hover" variants={cardHover} className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-glow">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-brand-700 dark:text-brand-400">{s.change}</span>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">{s.value}</h3>
                      <p className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{s.title}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Recent Activity */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Recent Batches</h3>
                <Link to="/dashboard/donor/listings" className="text-[10px] font-black text-brand-600 dark:text-brand-400 hover:underline">
                  View all →
                </Link>
              </div>
              {loading ? (
                <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </p>
              ) : donations.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                  No batches yet. Tap "Post Food Surplus" to create your first listing.
                </p>
              ) : (
                <div className="space-y-2">
                  {donations.slice(0, 4).map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{d.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {d.quantity} portions • {shortId(d.id)}
                        </p>
                      </div>
                      {statusBadge(d.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ MY LISTINGS ============ */}
        {tab === 'listings' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">My Food Rescue Batches</h3>
              <span className="text-[10px] font-bold text-gray-500">{donations.length} total</span>
            </div>

            {/* Phone: card list */}
            <div className="space-y-2 sm:hidden">
              {loading && (
                <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </p>
              )}
              {!loading && donations.length === 0 && (
                <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                  No batches yet. Post your first food surplus to get started.
                </p>
              )}
              {donations.map((item) => (
                <div key={item.id} className="p-3.5 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{item.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">{shortId(item.id)}</p>
                    </div>
                    {statusBadge(item.status)}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">{item.quantity} portions</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {item.assignedVolunteerName || item.claimedByName || 'Awaiting claim'}
                    </span>
                  </div>
                  {(item.status === 'available' || item.status === 'claimed') && (
                    <button
                      onClick={() => handleCancel(item.id)}
                      disabled={cancellingId === item.id}
                      className="w-full py-2 text-[10px] font-extrabold uppercase rounded-xl text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      {cancellingId === item.id ? 'Cancelling...' : 'Cancel Listing'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-bold">
                    <th className="pb-3">ID</th>
                    <th className="pb-3">Surplus Item</th>
                    <th className="pb-3">Quantity</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Assigned Logistics</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-500 dark:text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading your batches...
                      </td>
                    </tr>
                  )}
                  {!loading && donations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No batches yet. Post your first food surplus to get started.
                      </td>
                    </tr>
                  )}
                  {donations.map((item) => (
                    <tr key={item.id} className="hover:bg-brand-500/5 transition-colors">
                      <td className="py-3.5 font-mono font-bold text-brand-700 dark:text-brand-400">{shortId(item.id)}</td>
                      <td className="py-3.5 font-bold text-gray-900 dark:text-white">{item.title}</td>
                      <td className="py-3.5 text-gray-700 dark:text-gray-300 font-medium">{item.quantity} portions</td>
                      <td className="py-3.5">{statusBadge(item.status)}</td>
                      <td className="py-3.5 font-semibold text-gray-700 dark:text-gray-300">
                        {item.assignedVolunteerName || item.claimedByName || '—'}
                      </td>
                      <td className="py-3.5">
                        {(item.status === 'available' || item.status === 'claimed') && (
                          <button
                            onClick={() => handleCancel(item.id)}
                            disabled={cancellingId === item.id}
                            className="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded-full text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {cancellingId === item.id ? '...' : 'Cancel'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ ACTIVE PICKUPS ============ */}
        {tab === 'pickups' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Active Pickups</h3>
            {loading ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </p>
            ) : pickups.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No pickups in progress. When an NGO claims your batch and a volunteer starts the route, it shows up here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pickups.map((p) => (
                  <div key={p.id} className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 dark:text-white text-xs truncate">{p.title}</span>
                      {statusBadge(p.status)}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
                      <MapPin className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                      <span className="truncate">{p.pickupLocation}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Truck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{p.assignedVolunteerName || p.claimedByName || 'Awaiting volunteer'}</span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(p.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ TAX & IMPACT ============ */}
        {tab === 'tax' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" /> Tax Deductions & Impact
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{money(taxValue)} deductible</span>
            </div>
            {loading ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </p>
            ) : delivered.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No delivered batches yet. Completed deliveries will appear here with their estimated tax deduction and CO₂ impact.
              </p>
            ) : (
              <div className="space-y-2">
                {delivered.map((d) => {
                  const value = (d.quantity || 0) * (d.estimatedValue || 0);
                  return (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{d.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {d.quantity} portions delivered{d.estimatedValue ? ` at ${money(d.estimatedValue)}/portion` : ''}
                        </p>
                      </div>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                        {d.estimatedValue ? money(value) : '—'}
                      </span>
                    </div>
                  );
                })}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 pt-3 border-t border-emerald-500/10 text-xs font-black text-gray-900 dark:text-white">
                  <span className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-emerald-500" />
                    Estimated CO₂ saved: {co2Tons.toFixed(2)} tons
                  </span>
                  <span>Total deduction: {money(taxValue)}</span>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Post Donation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-lg p-5 sm:p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Post New Food Surplus Batch</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg glass-card">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateDonation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Food Item Name *</label>
                <input type="text" required value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g., Prepared Hot Meals (Pasta & Salad)" className="w-full px-3 py-2.5 rounded-xl glass-input" />
              </div>
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Description</label>
                <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={2} placeholder="e.g., Freshly cooked banquet leftovers, sealed and refrigerated" className="w-full px-3 py-2.5 rounded-xl glass-input resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Quantity (Portions) *</label>
                  <input type="number" min={1} required value={form.quantity} onChange={(e) => updateField('quantity', e.target.value)} placeholder="120" className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Item Type</label>
                  <input type="text" value={form.itemType} onChange={(e) => updateField('itemType', e.target.value)} placeholder="e.g., Cooked Meals, Bakery, Produce" className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Pickup Location *</label>
                <input type="text" required value={form.pickupLocation} onChange={(e) => updateField('pickupLocation', e.target.value)} placeholder="e.g., Kitchen Loading Dock, 123 Main St" className="w-full px-3 py-2.5 rounded-xl glass-input" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Expiry Date & Time</label>
                  <input type="datetime-local" value={form.expiryDateTime} onChange={(e) => updateField('expiryDateTime', e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Estimated Value ($/portion)</label>
                  <input type="number" min={0} step="0.01" value={form.estimatedValue} onChange={(e) => updateField('estimatedValue', e.target.value)} placeholder="5.00" className="w-full px-3 py-2.5 rounded-xl glass-input" />
                  <p className="text-[10px] text-gray-500 mt-1">Used to calculate your tax deduction when delivered.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Pickup Window Start *</label>
                  <input type="datetime-local" required value={form.pickupWindowStart} onChange={(e) => updateField('pickupWindowStart', e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Pickup Window End *</label>
                  <input type="datetime-local" required value={form.pickupWindowEnd} onChange={(e) => updateField('pickupWindowEnd', e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl glass-card font-bold">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold shadow-glow disabled:opacity-50">
                  {submitting ? 'Posting...' : 'Post Listing'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};