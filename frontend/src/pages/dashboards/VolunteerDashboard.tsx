import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, MapPin, Award, CheckCircle, Clock, 
  Navigation, Leaf, Loader2, RefreshCw, Package, Star, HandHeart,
  Route, Compass, ArrowRight, CheckCircle2, MessageSquare, QrCode
} from 'lucide-react';
import { Sidebar } from '../../components/common/Sidebar';
import { AIAssistantModal } from '../../components/common/AIAssistantModal';
import { OrderChatDrawer } from '../../components/common/OrderChatDrawer';
import { QRCodeModal } from '../../components/common/QRCodeModal';
import { VoiceAlertWidget } from '../../components/common/VoiceAlertWidget';
import { soundManager } from '../../lib/soundAlert';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiRequest } from '../../services/api';
import { Donation, DonationStatus } from '../../types/donation';
import { cardHover } from '../../animations/variants';
import { optimizeMultiStopRoute, OptimizedRoute } from '../../lib/routeOptimizer';

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
  const [activeChatDonation, setActiveChatDonation] = useState<Donation | null>(null);
  const [activeQrDonation, setActiveQrDonation] = useState<{ donation: Donation; mode: 'display' | 'scan'; actionType: 'pickup' | 'delivery' } | null>(null);

  // Volunteer GPS Location state
  const [volLocation, setVolLocation] = useState<{ lat: number; lng: number } | null>({ lat: 28.6210, lng: 77.2100 });
  const [volAddress, setVolAddress] = useState<string>('Rajiv Chowk Metro, Delhi');
  const [isDetectingVolLoc, setIsDetectingVolLoc] = useState(false);

  const detectVolLocation = useCallback(() => {
    setIsDetectingVolLoc(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setVolLocation(loc);
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=14`);
            const data = await res.json();
            if (data.display_name) {
              setVolAddress(data.display_name.split(',').slice(0, 3).join(','));
            } else {
              setVolAddress(`${loc.lat.toFixed(4)}° N, ${loc.lng.toFixed(4)}° E`);
            }
          } catch {
            setVolAddress(`${loc.lat.toFixed(4)}° N, ${loc.lng.toFixed(4)}° E`);
          }
          setIsDetectingVolLoc(false);
        },
        () => {
          setIsDetectingVolLoc(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setIsDetectingVolLoc(false);
    }
  }, []);

  useEffect(() => {
    detectVolLocation();
  }, [detectVolLocation]);

const DUMMY_VOLUNTEER_DONATIONS: Donation[] = [
  {
    id: 'DON-9481',
    title: 'Gourmet Banquet Catering Surplus',
    description: 'Prepared organic hot meals from evening hotel conference. Insulated and temperature-controlled.',
    quantity: 140,
    itemType: 'Prepared Meals',
    status: 'claimed',
    pickupLocation: 'Grand Horizon Hotel, Mindspace Hitec City, Hyderabad (Geo: 17.4401° N, 78.3489° E)',
    latitude: 17.4401,
    longitude: 78.3489,
    dropoffLocation: 'Hope Haven Shelter, Madhapur, Hyderabad (Geo: 17.4482° N, 78.3915° E)',
    dropoffLat: 17.4482,
    dropoffLng: 78.3915,
    pickupWindowStart: new Date(Date.now() - 15 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 120 * 60000).toISOString(),
    expiryDateTime: new Date(Date.now() + 180 * 60000).toISOString(),
    donorName: 'Grand Horizon Hotel',
    donorPhone: '+91 98765 43210',
    claimedByNgoName: 'Hope Haven Community Shelter',
    volunteerName: 'Rahul V. (Driver #402)',
    photoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DON-9480',
    title: 'Fresh Artisan Bakery Breads & Croissants',
    description: 'Freshly baked whole wheat breads, muffins, and croissants. Sealed in eco-friendly paper bags.',
    quantity: 80,
    itemType: 'Bakery Items',
    status: 'picked_up',
    pickupLocation: 'Artisan Bakehouse, Jubilee Hills Rd #36, Hyderabad (Geo: 17.4325° N, 78.4071° E)',
    latitude: 17.4325,
    longitude: 78.4071,
    dropoffLocation: 'Youth Relief Center, Banjara Hills, Hyderabad (Geo: 17.4156° N, 78.4347° E)',
    dropoffLat: 17.4156,
    dropoffLng: 78.4347,
    pickupWindowStart: new Date(Date.now() - 45 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 60 * 60000).toISOString(),
    expiryDateTime: new Date(Date.now() + 240 * 60000).toISOString(),
    donorName: 'Artisan Bakehouse',
    donorPhone: '+91 98123 45678',
    claimedByNgoName: 'Youth Relief Center Foundation',
    volunteerName: 'Rahul V. (Driver #402)',
    photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: 'DON-9479',
    title: 'Organic Garden Salad Bar & Fresh Fruits',
    description: 'Crisp green salads, chopped vegetables, and fresh fruit bowls stored in chilled containers.',
    quantity: 65,
    itemType: 'Fresh Produce',
    status: 'delivered',
    pickupLocation: 'Green Bistro Kitchen, Gachibowli, Hyderabad (Geo: 17.4126° N, 78.3264° E)',
    latitude: 17.4126,
    longitude: 78.3264,
    dropoffLocation: 'City Care Shelter, Kondapur, Hyderabad (Geo: 17.4600° N, 78.3650° E)',
    dropoffLat: 17.4600,
    dropoffLng: 78.3650,
    pickupWindowStart: new Date(Date.now() - 180 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() - 120 * 60000).toISOString(),
    expiryDateTime: new Date(Date.now() + 120 * 60000).toISOString(),
    donorName: 'Green Bistro',
    donorPhone: '+91 97654 32109',
    claimedByNgoName: 'City Care Shelter',
    volunteerName: 'Rahul V. (Driver #402)',
    photoUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
    createdAt: new Date(Date.now() - 240 * 60000).toISOString(),
  }
];

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Donation[]>('/donations');
      setDonations(data && data.length > 0 ? data : DUMMY_VOLUNTEER_DONATIONS);
    } catch (err: any) {
      setDonations(DUMMY_VOLUNTEER_DONATIONS);
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
      const payload = volLocation ? {
        latitude: volLocation.lat,
        longitude: volLocation.lng,
        locationText: volAddress || `${volLocation.lat.toFixed(4)}° N, ${volLocation.lng.toFixed(4)}° E`
      } : undefined;

      await apiRequest<Donation>(`/donations/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload ? JSON.stringify(payload) : undefined
      });

      // Stream location update
      if (payload) {
        try {
          await apiRequest(`/donations/${id}/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch {
          // ignore
        }
      }

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
    return (
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {d.status === 'claimed' && (
          <>
            <button
              onClick={() => setActiveQrDonation({ donation: d, mode: 'scan', actionType: 'pickup' })}
              className="px-3.5 py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl border border-blue-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>Verify Pickup (QR/PIN)</span>
            </button>
            <button
              onClick={() => doAction(d.id, 'pickup', 'Pickup confirmed! Food is in your hands — deliver it now.')}
              disabled={actingId === d.id}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              {actingId === d.id ? 'Updating...' : 'Mark Picked Up'}
            </button>
          </>
        )}
        {d.status === 'picked_up' && (
          <>
            <button
              onClick={() => setActiveQrDonation({ donation: d, mode: 'display', actionType: 'delivery' })}
              className="px-3.5 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>Delivery QR & PIN</span>
            </button>
            <button
              onClick={() => doAction(d.id, 'complete', 'Delivery completed! Thank you for rescuing this food.')}
              disabled={actingId === d.id}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {actingId === d.id ? 'Updating...' : 'Complete Delivery'}
            </button>
          </>
        )}
        <button
          onClick={() => setActiveChatDonation(d)}
          className="px-3.5 py-2.5 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 rounded-xl border border-brand-500/20 flex items-center justify-center gap-1.5 transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Order Chat</span>
          {d.messages && d.messages.length > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-black bg-brand-600 text-white rounded-full">
              {d.messages.length}
            </span>
          )}
        </button>
      </div>
    );
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
  const optimizedRoute = React.useMemo(() => {
    return optimizeMultiStopRoute(
      volLocation || { lat: 28.6210, lng: 77.2100 },
      activeRoutes.length > 0 ? activeRoutes : donations
    );
  }, [volLocation, activeRoutes, donations]);

  const renderMultiStopRoutePlanner = () => {
    if (!optimizedRoute) return null;

    return (
      <div className="p-5 sm:p-6 rounded-3xl glass-card border border-blue-500/30 space-y-5 bg-gradient-to-br from-blue-500/5 via-brand-500/5 to-emerald-500/5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-500/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-glow shrink-0">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  AI Multi-Stop Route Optimizer
                </h3>
                <span className="px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  TSP Nearest-Neighbor Active
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Sequenced multi-pickup itinerary optimized for fast expiry urgency and fuel efficiency.
              </p>
            </div>
          </div>

          <a
            href={optimizedRoute.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-glow flex items-center justify-center gap-2 transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Launch Google Turn-by-Turn</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Route Key Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-0.5">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Total Trip Distance</span>
            <p className="text-base sm:text-lg font-black text-blue-700 dark:text-blue-300">{optimizedRoute.totalDistanceKm} km</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-0.5">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Est. Total Drive Time</span>
            <p className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300">~{optimizedRoute.totalMinutes} mins</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Total Meals Rescued</span>
            <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300">{optimizedRoute.totalPortions} Portions</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Est. Driver Payout</span>
            <p className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300">₹{optimizedRoute.totalDriverFare}</p>
          </div>
        </div>

        {/* Step-by-Step Waypoint Itinerary Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            Step-by-Step Sequenced Itinerary ({optimizedRoute.waypoints.length} Stops)
          </h4>

          <div className="space-y-2.5 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-blue-500/30">
            {optimizedRoute.waypoints.map((w, idx) => {
              const isStart = w.type === 'start';
              const isDrop = w.type === 'dropoff';
              const isPickup = w.type === 'pickup';

              return (
                <div
                  key={idx}
                  className={`relative pl-10 p-3.5 rounded-2xl border text-xs space-y-1.5 transition-all ${
                    isStart
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : isDrop
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-white dark:bg-gray-800/90 border-blue-500/20 shadow-xs'
                  }`}
                >
                  {/* Waypoint Number Badge Pin */}
                  <div className={`absolute left-2 top-3.5 w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shadow-md ${
                    isStart ? 'bg-blue-600 text-white' : isDrop ? 'bg-emerald-600 text-white' : 'bg-brand-600 text-white'
                  }`}>
                    {w.stepIndex}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">{w.title}</span>
                        {w.urgencyText && (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-md">
                            {w.urgencyText}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                        📍 {w.locationName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-blue-700 dark:text-blue-300 text-xs block">
                        +{w.distanceFromPrevKm} km
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold">
                        ~{w.estimatedMinutesFromPrev} mins
                      </span>
                    </div>
                  </div>

                  {w.portions && (
                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-gray-200 dark:border-gray-700 text-gray-500 font-semibold">
                      <span>{isPickup ? `📦 Pick up ${w.portions} portions` : `🏡 Deliver ${w.portions} portions`}</span>
                      <span>Cumulative: {w.cumulativeDistanceKm} km</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Multi-Stop Interactive Map Preview */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-blue-600" />
            Multi-Stop Visual Map Preview
          </label>
          <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-blue-500/20 shadow-inner bg-gray-100 dark:bg-gray-800">
            <iframe
              title="Multi-Stop Route Map"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src={`https://maps.google.com/maps?q=${volLocation?.lat || 28.6210},${volLocation?.lng || 77.2100}&z=14&output=embed`}
              className="w-full h-full filter contrast-105"
            />
            <div className="absolute top-2 left-2 bg-blue-900/90 text-white text-[10px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Multi-Stop Waypoint Sequence Active ({optimizedRoute.waypoints.length} Stops)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

        {/* Volunteer GPS Live Location Status Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-brand-500/5 to-emerald-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-glow shrink-0">
              <Navigation className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-900 dark:text-white">
                  Your Live Driver GPS Location
                </span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                  Auto-Streaming to NGO
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 font-mono mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                <span>{volAddress || 'Detecting driver coordinates...'}</span>
                {volLocation && (
                  <span className="text-[10px] text-gray-400">
                    ({volLocation.lat.toFixed(4)}°, {volLocation.lng.toFixed(4)}°)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={detectVolLocation}
            disabled={isDetectingVolLoc}
            className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl border border-blue-500/30 flex items-center justify-center gap-1.5 transition-all"
          >
            {isDetectingVolLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{isDetectingVolLoc ? 'Detecting...' : 'Update GPS'}</span>
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

            {/* Multi-Stop Route Optimizer Component */}
            {renderMultiStopRoutePlanner()}
          </>
        )}

        {/* ============ NEARBY ROUTES ============ */}
        {tab === 'routes' && (
          <div className="space-y-6">
            {renderMultiStopRoutePlanner()}

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

      {/* Floating AI Assistant for Volunteers */}
      <AIAssistantModal role="volunteer" />

      {/* Floating Voice & Audio Notification Controls */}
      <VoiceAlertWidget role="volunteer" />

      {/* Order Chat Drawer */}
      <AnimatePresence>
        {activeChatDonation && (
          <OrderChatDrawer
            donation={activeChatDonation}
            onClose={() => setActiveChatDonation(null)}
            onMessageSent={() => fetchDonations()}
          />
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {activeQrDonation && (
          <QRCodeModal
            donation={activeQrDonation.donation}
            mode={activeQrDonation.mode}
            actionType={activeQrDonation.actionType}
            onClose={() => setActiveQrDonation(null)}
            onVerified={() => fetchDonations()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};