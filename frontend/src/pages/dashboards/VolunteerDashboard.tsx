import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Truck, MapPin, Award, CheckCircle, Clock, 
  Navigation, Leaf, Loader2, RefreshCw, Package, Star, HandHeart
} from 'lucide-react';
import { Sidebar } from '../../components/common/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiRequest } from '../../services/api';
import { Donation, DonationStatus } from '../../types/donation';
import { cardHover } from '../../animations/variants';

type Tab = 'overview' | 'routes' | 'history';

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

export const VolunteerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const tab: Tab = location.pathname.includes('/routes') ? 'routes'
    : location.pathname.includes('/history') ? 'history'
    : 'overview';

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Donation[]>('/donations');
      setDonations(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load your routes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const activeRoutes = donations.filter((d) => d.status === 'claimed' || d.status === 'picked_up');
  const completed = donations.filter((d) => d.status === 'delivered');
  const nextRoute = activeRoutes[0] || null;

  const completedCount = completed.length;
  const deliveredPortions = completed.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const co2Tons = (deliveredPortions * 1.1) / 1000;
  const onTime = completedCount > 0 ? `${Math.round((completedCount / Math.max(donations.length, 1)) * 100)}%` : '—';

  const stats = [
    { title: 'Total Deliveries Completed', value: completedCount.toLocaleString(), change: completedCount ? 'Great work!' : 'Awaiting routes', icon: Truck },
    { title: 'Meals Delivered', value: deliveredPortions.toLocaleString(), change: 'Direct impact', icon: Award },
    { title: 'Completion Rate', value: onTime, change: 'Of all assigned', icon: Star },
    { title: 'CO₂ Emissions Saved', value: co2Tons > 0 ? `${co2Tons.toFixed(1)} Tons` : '0 Tons', change: 'From delivered meals', icon: Leaf },
  ];

  const statusBadge = (status: DonationStatus) => (
    <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );

  const doAction = async (id: string, action: 'pickup' | 'complete', successMsg: string) => {
    setActingId(id);
    try {
      await apiRequest<Donation>(`/donations/${id}/${action}`, { method: 'POST' });
      showToast(successMsg, 'success');
      fetchDonations();
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActingId(null);
    }
  };

  const loadingState = (
    <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading...
    </p>
  );

  const renderActions = (d: Donation) => {
    if (d.status === 'claimed') {
      return (
        <button
          onClick={() => doAction(d.id, 'pickup', 'Pickup confirmed! Food is in your hands — deliver it now.')}
          disabled={actingId === d.id}
          className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Package className="w-4 h-4" />
          {actingId === d.id ? 'Updating...' : 'Mark Picked Up'}
        </button>
      );
    }
    if (d.status === 'picked_up') {
      return (
        <button
          onClick={() => doAction(d.id, 'complete', 'Delivery completed! Thank you for rescuing this food.')}
          disabled={actingId === d.id}
          className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {actingId === d.id ? 'Updating...' : 'Complete Delivery'}
        </button>
      );
    }
    return null;
  };

  const routeDetails = (d: Donation) => (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-900 dark:text-white">
        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="truncate">Pickup: {d.pickupLocation}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-900 dark:text-white">
        <HandHeart className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="truncate">Dropoff: {d.claimedByName || 'Shelter NGO'}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-brand-500/10">
        <span>{d.quantity} portions</span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Window ends {new Date(d.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-5rem)] bg-mesh-light dark:bg-mesh-dark">
      <Sidebar role="volunteer" />

      <main className="flex-1 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto w-full">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold uppercase rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Volunteer Hero Hub
            </span>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
              Welcome back, {user?.name || 'Volunteer Hero'}
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-700 dark:text-gray-300">
              Pick up surplus food, complete deliveries, and watch your impact grow.
            </p>
          </div>

          <button
            onClick={fetchDonations}
            className="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 glass-card rounded-2xl flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* ============ OVERVIEW ============ */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {stats.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <motion.div key={idx} whileHover="hover" variants={cardHover} className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-blue-500/20 space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-glow">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-extrabold text-blue-600 dark:text-blue-400">{s.change}</span>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white">{s.value}</h3>
                      <p className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300">{s.title}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Next Rescue Dispatch */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Next Assigned Rescue Dispatch</h3>
                {nextRoute && statusBadge(nextRoute.status)}
              </div>
              {loading ? loadingState : !nextRoute ? (
                <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                  No route assigned yet. When an NGO assigns you a rescue, it appears here with pickup and dropoff details.
                </p>
              ) : (
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 dark:text-white truncate">{nextRoute.title}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{nextRoute.donorName || 'Donor'} • {nextRoute.quantity} portions</p>
                  </div>
                  {routeDetails(nextRoute)}
                  {renderActions(nextRoute)}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ NEARBY ROUTES ============ */}
        {tab === 'routes' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">My Assigned Routes</h3>
              <span className="text-[10px] font-bold text-gray-500">{activeRoutes.length} active</span>
            </div>
            {loading ? loadingState : activeRoutes.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No active routes right now. Assigned rescues show up here the moment an NGO dispatches you.
              </p>
            ) : (
              <div className="space-y-3">
                {activeRoutes.map((d) => (
                  <div key={d.id} className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-900 dark:text-white truncate">{d.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {d.donorName || 'Donor'} • {d.quantity} portions
                        </p>
                      </div>
                      {statusBadge(d.status)}
                    </div>
                    {routeDetails(d)}
                    {renderActions(d)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ HISTORY ============ */}
        {tab === 'history' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-emerald-500/20 space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" /> Delivery History
            </h3>
            {loading ? loadingState : completed.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No completed deliveries yet. Finish your first route and it will appear here.
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
                        {d.quantity} portions • {d.claimedByName || 'Shelter NGO'}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black shrink-0">
                      <CheckCircle className="w-3.5 h-3.5" /> Delivered
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