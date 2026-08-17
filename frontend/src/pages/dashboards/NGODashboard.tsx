import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building2, Package, MapPin, CheckCircle, Clock, 
  Users, ArrowUpRight, HandHeart, Leaf, Loader2, RefreshCw, Truck
} from 'lucide-react';
import { Sidebar } from '../../components/common/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiRequest } from '../../services/api';
import { Donation, DonationStatus } from '../../types/donation';
import { cardHover } from '../../animations/variants';

type Tab = 'overview' | 'available' | 'deliveries' | 'impact';

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

export const NGODashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const tab: Tab = location.pathname.includes('/available') ? 'available'
    : location.pathname.includes('/deliveries') ? 'deliveries'
    : location.pathname.includes('/impact') ? 'impact'
    : 'overview';

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Donation[]>('/donations');
      setDonations(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load food feed', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const available = donations.filter((d) => d.status === 'available');
  const mine = donations.filter((d) => d.claimedBy === user?.id || d.claimedByName === user?.name);
  const inProgress = mine.filter((d) => d.status === 'claimed' || d.status === 'picked_up');
  const completed = mine.filter((d) => d.status === 'delivered');

  const receivedPortions = mine.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const deliveredPortions = completed.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const co2Tons = (deliveredPortions * 1.1) / 1000;

  const stats = [
    { title: 'Meals Received', value: receivedPortions.toLocaleString(), change: `${mine.length} batch${mine.length === 1 ? '' : 'es'}`, icon: Building2 },
    { title: 'Active Deliveries Inbound', value: inProgress.length.toLocaleString(), change: inProgress.length ? 'In transit' : 'Awaiting claims', icon: Package },
    { title: 'Deliveries Completed', value: completed.length.toLocaleString(), change: 'Delivered batches', icon: CheckCircle },
    { title: 'CO₂ Emissions Saved', value: co2Tons > 0 ? `${co2Tons.toFixed(1)} Tons` : '0 Tons', change: 'From delivered meals', icon: Leaf },
  ];

  const statusBadge = (status: DonationStatus) => (
    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );

  const handleClaim = async (id: string) => {
    setClaimingId(id);
    try {
      await apiRequest<Donation>(`/donations/${id}/claim`, { method: 'POST' });
      showToast('Batch claimed! A volunteer can now be assigned to pick it up.', 'success');
      fetchDonations();
    } catch (err: any) {
      showToast(err.message || 'Failed to claim batch', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  const loadingState = (
    <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
    </p>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-5rem)] bg-mesh-light dark:bg-mesh-dark">
      <Sidebar role="ngo" />

      <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Shelter NGO Command Center
            </span>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
              {user?.name || 'Shelter NGO'}
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
              Claim available surplus food, coordinate volunteer drops, and track your impact.
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
            <Link
              to="/dashboard/ngo/available"
              className="flex-1 sm:flex-none px-5 py-3 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 via-brand-500 to-emerald-500 rounded-2xl shadow-glow flex items-center justify-center gap-2"
            >
              <HandHeart className="w-4 h-4" />
              <span>Browse Available Food</span>
            </Link>
          </div>
        </div>

        {/* ============ OVERVIEW ============ */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {stats.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.div key={idx} whileHover="hover" variants={cardHover} className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-emerald-500/20 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-glow">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">{s.change}</span>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">{s.value}</h3>
                      <p className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{s.title}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Recently Available */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Newly Available Food</h3>
                <Link to="/dashboard/ngo/available" className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline">
                  View all →
                </Link>
              </div>
              {loading ? loadingState : available.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                  No surplus available right now. New donations appear here automatically.
                </p>
              ) : (
                <div className="space-y-2">
                  {available.slice(0, 4).map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate">{d.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {d.quantity} portions • {d.donorName || 'Donor'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleClaim(d.id)}
                        disabled={claimingId === d.id}
                        className="shrink-0 px-3 py-1.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg disabled:opacity-50"
                      >
                        {claimingId === d.id ? '...' : 'Claim'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ AVAILABLE FOOD ============ */}
        {tab === 'available' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Available Surplus Food</h3>
              <span className="text-[10px] font-bold text-gray-500">{available.length} available</span>
            </div>
            {loading ? loadingState : available.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No surplus available right now. Donors' postings will show up here the moment they're published.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {available.map((f) => (
                  <div key={f.id} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{f.title}</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {f.donorName || 'Anonymous Donor'}{f.itemType ? ` • ${f.itemType}` : ''}
                        </p>
                      </div>
                      {statusBadge(f.status)}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-300">
                      <span>Quantity: <strong className="text-gray-900 dark:text-white">{f.quantity} portions</strong></span>
                      {f.estimatedValue && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ${f.estimatedValue}/portion
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{f.pickupLocation}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Pickup window: {new Date(f.pickupWindowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(f.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleClaim(f.id)}
                      disabled={claimingId === f.id}
                      className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <HandHeart className="w-4 h-4" />
                      {claimingId === f.id ? 'Claiming...' : 'Claim Food Batch'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ DELIVERIES ============ */}
        {tab === 'deliveries' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">My Deliveries</h3>
            {loading ? loadingState : mine.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                You haven't claimed any batches yet. Head to Available Food to claim surplus for your shelter.
              </p>
            ) : (
              <div className="space-y-2">
                {mine.map((d) => (
                  <div key={d.id} className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{d.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {d.quantity} portions • {d.donorName || 'Donor'}
                        </p>
                      </div>
                      {statusBadge(d.status)}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Truck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{d.assignedVolunteerName || 'Awaiting volunteer'}</span>
                      </span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {d.status === 'delivered' ? 'Delivered' : `By ${new Date(d.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ IMPACT ============ */}
        {tab === 'impact' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-emerald-500/20 space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Leaf className="w-4 h-4 text-emerald-500" /> Impact Report
            </h3>
            {loading ? loadingState : completed.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No completed deliveries yet. Once batches are delivered, your impact report will build up here.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{deliveredPortions.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mt-1">Meals Delivered</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{co2Tons.toFixed(2)}</p>
                    <p className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mt-1">Tons CO₂ Saved</p>
                  </div>
                </div>
                {completed.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white truncate">{d.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {d.quantity} portions • {d.donorName || 'Donor'}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black shrink-0">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Delivered
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};