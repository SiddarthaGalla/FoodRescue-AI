import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building2, Package, MapPin, CheckCircle, Clock, 
  Users, ArrowUpRight, HandHeart, Leaf, Loader2, RefreshCw, Truck,
  Camera, X as XIcon, MapPin as MapPinIcon, RotateCcw, AlertCircle, CheckCircle2, Eye, UserPlus, Shield, Mail, Phone, Filter
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

  // NGO Preferences state
  const [preferences, setPreferences] = useState<{
    mealTypes: string[];
    minPortions: number;
    maxPortions: number;
    urgencyOnly: boolean;
  }>({
    mealTypes: [],
    minPortions: 1,
    maxPortions: 1000,
    urgencyOnly: false,
  });

  const loadingState = (
    <div className="py-8 flex items-center justify-center gap-2 text-xs text-gray-500">
      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
      <span>Loading surplus food feed...</span>
    </div>
  );

  // Detail modal state
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Assign volunteer state
  const [showAssignVolunteer, setShowAssignVolunteer] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [volunteerForm, setVolunteerForm] = useState({
    name: '', email: '', phone: '', photoUrl: '', address: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [assigningVolunteer, setAssigningVolunteer] = useState(false);
  const [showAssignCamera, setShowAssignCamera] = useState(false);
  const [assignCameraStream, setAssignCameraStream] = useState<MediaStream | null>(null);
  const [assignPhotoLocation, setAssignPhotoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [assignPhotoAddress, setAssignPhotoAddress] = useState<string>('');
  const [showAssignMapPicker, setShowAssignMapPicker] = useState(false);
  const [assignMapCenter, setAssignMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [assignSelectedLocation, setAssignSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const assignMapRef = useRef<any>(null);

  const [showDetailCamera, setShowDetailCamera] = useState(false);
  const [detailCameraStream, setDetailCameraStream] = useState<MediaStream | null>(null);

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

  // Filter available donations based on NGO preferences
  const filteredAvailable = useMemo(() => {
    let filtered = available;

    // Filter by meal types
    if (preferences.mealTypes.length > 0) {
      filtered = filtered.filter(d => 
        d.itemType && preferences.mealTypes.some(t => 
          d.itemType!.toLowerCase().includes(t.toLowerCase())
        )
      );
    }

    // Filter by portion range
    filtered = filtered.filter(d => 
      (d.quantity || 0) >= preferences.minPortions && 
      (d.quantity || 0) <= preferences.maxPortions
    );

    // Sort by priority: urgency (expiry soon) first, then by expiry time
    filtered.sort((a, b) => {
      const now = new Date();
      const expiryA = new Date(a.expiryDateTime || 0).getTime();
      const expiryB = new Date(b.expiryDateTime || 0).getTime();
      const timeA = expiryA - Date.now();
      const timeB = expiryB - Date.now();
      
      // Urgent first (expiring soon)
      const urgentA = timeA < 2 * 60 * 60 * 1000; // 2 hours
      const urgentB = timeB < 2 * 60 * 60 * 1000;
      
      if (urgentA && !urgentB) return -1;
      if (!urgentA && urgentB) return 1;
      
      // Then by expiry time (soonest first)
      return timeA - timeB;
    });

    return filtered;
  }, [available, preferences]);
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

  // Detail modal
  const openDetail = (donation: Donation) => {
    setSelectedDonation(donation);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedDonation(null);
    setShowDetailCamera(false);
  };

  // Detail camera
  const openDetailCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setDetailCameraStream(stream);
      setShowDetailCamera(true);
    } catch (e) {
      showToast('Camera access required', 'error');
    }
  };

  const closeDetailCamera = () => {
    if (detailCameraStream) {
      detailCameraStream.getTracks().forEach((t) => t.stop());
      setDetailCameraStream(null);
    }
    setShowDetailCamera(false);
  };

  // Assign volunteer flow
  const openAssignVolunteer = (id: string) => {
    setAssigningId(id);
    setShowAssignVolunteer(true);
    setVolunteerForm({ name: '', email: '', phone: '', photoUrl: '', address: '', latitude: undefined, longitude: undefined });
  };

  const closeAssignVolunteer = () => {
    setShowAssignVolunteer(false);
    setAssigningId(null);
    setVolunteerForm({ name: '', email: '', phone: '', photoUrl: '', address: '', latitude: undefined, longitude: undefined });
    setShowAssignCamera(false);
    setShowAssignMapPicker(false);
  };

  // Camera for volunteer photo
  const openAssignCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setAssignCameraStream(stream);
      setShowAssignCamera(true);
    } catch (e) {
      showToast('Camera access required', 'error');
    }
  };

  const closeAssignCamera = () => {
    if (assignCameraStream) {
      assignCameraStream.getTracks().forEach((t) => t.stop());
      setAssignCameraStream(null);
    }
    setShowAssignCamera(false);
  };

  const captureAssignPhoto = () => {
    if (!assignCameraStream) return;
    const video = document.createElement('video');
    video.srcObject = assignCameraStream;
    video.play();
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Add overlay
      const now = new Date();
      const timestamp = now.toLocaleString();
      const gpsText = assignPhotoAddress || (assignPhotoLocation
        ? `${assignPhotoLocation.lat.toFixed(4)}, ${assignPhotoLocation.lng.toFixed(4)}`
        : 'Location unavailable');
      const note = 'Volunteer for food pickup';

      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      const padding = 12;
      const lineHeight = 28;
      let y = canvas.height - padding - lineHeight * 3;
      ctx.fillRect(0, y - 4, canvas.width, lineHeight * 3 + 8);
      ctx.fillStyle = 'white';
      ctx.fillText(`Captured: ${timestamp}`, padding, y);
      y += lineHeight;
      ctx.fillText(gpsText, padding, y);
      y += lineHeight;
      ctx.fillText(note, padding, y);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setVolunteerForm((f) => ({ ...f, photoUrl: dataUrl }));
      closeAssignCamera();
    };
  };

  // Location for volunteer
  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.display_name) return data.display_name;
      const addr = data.address || {};
      const parts = [
        addr.road, addr.suburb, addr.city, addr.town, addr.village,
        addr.county, addr.state, addr.country
      ].filter(Boolean);
      return parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const openAssignCameraWithLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      setAssignPhotoLocation(loc);
      const address = await reverseGeocode(loc.lat, loc.lng);
      setAssignPhotoAddress(address);
    } catch (e) {
      showToast('Location access required', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setAssignCameraStream(stream);
      setShowAssignCamera(true);
    } catch (e) {
      showToast('Camera access required', 'error');
    }
  };

  const closeAssignCameraWithLocation = () => {
    if (assignCameraStream) {
      assignCameraStream.getTracks().forEach((t) => t.stop());
      setAssignCameraStream(null);
    }
    setShowAssignCamera(false);
    setAssignPhotoLocation(null);
    setAssignPhotoAddress('');
  };

  // Map picker for volunteer
  const handleAssignMapClick = (e: any) => {
    const { lat, lng } = e.latlng;
    setAssignSelectedLocation({ lat, lng });
  };

  useEffect(() => {
    if (showAssignMapPicker && assignMapRef.current && assignMapRef.current.leafletElement) {
      const map = assignMapRef.current.leafletElement;
      map.on('click', handleAssignMapClick);
      return () => {
        map.off('click', handleAssignMapClick);
      };
    }
  }, [showAssignMapPicker, handleAssignMapClick]);

  const openAssignMapPicker = async () => {
    try {
      const loc = await getCurrentLocation();
      setAssignMapCenter(loc);
      setAssignSelectedLocation(loc);
    } catch {
      setAssignMapCenter({ lat: 28.6139, lng: 77.2090 });
      setAssignSelectedLocation({ lat: 28.6139, lng: 77.2090 });
    }
    setShowAssignMapPicker(true);
  };

  const confirmAssignMapLocation = async () => {
    if (!assignSelectedLocation) return;
    const address = await reverseGeocode(assignSelectedLocation.lat, assignSelectedLocation.lng);
    setVolunteerForm((f) => ({ ...f, address, latitude: assignSelectedLocation!.lat, longitude: assignSelectedLocation!.lng }));
    setShowAssignMapPicker(false);
    setAssignSelectedLocation(null);
    setAssignMapCenter(null);
  };

  const closeAssignMapPicker = () => {
    setShowAssignMapPicker(false);
    setAssignSelectedLocation(null);
    setAssignMapCenter(null);
  };

  const handleAssignVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningId) return;
    if (!volunteerForm.name.trim() || !volunteerForm.email.trim() || !volunteerForm.phone.trim()) {
      showToast('Please fill in name, email, and phone', 'error');
      return;
    }
    setAssigningVolunteer(true);
    try {
      await apiRequest<Donation>(`/donations/${assigningId}/assign-volunteer`, {
        method: 'POST',
        body: JSON.stringify(volunteerForm),
      });
      showToast('Volunteer created and assigned successfully!', 'success');
      closeAssignVolunteer();
      fetchDonations();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign volunteer', 'error');
    } finally {
      setAssigningVolunteer(false);
    }
  };

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
          <div className="space-y-6">
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
          </div>
        )}

        {/* ============ AVAILABLE FOOD ============ */}
        {tab === 'available' && (
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-4">
            {/* Preferences Panel */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  Meal Preferences & Filters
                </h3>
                <button
                  onClick={() => setPreferences({ mealTypes: [], minPortions: 1, maxPortions: 1000, urgencyOnly: false })}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Reset Filters
                </button>
              </div>

              {/* Meal Types */}
              <div>
                <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-2">Meal Types</label>
                <div className="flex flex-wrap gap-2">
                  {['Cooked Meals', 'Bakery', 'Produce', 'Dairy', 'Packaged', 'Beverages', 'Desserts', 'Other'].map((type) => (
                    <label key={type} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      preferences.mealTypes.includes(type)
                        ? 'bg-emerald-600 text-white shadow-glow'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-500/10'
                    }`}>
                      <input
                        type="checkbox"
                        checked={preferences.mealTypes.includes(type)}
                        onChange={(e) => setPreferences(p => ({ ...p, mealTypes: e.target.checked ? [...p.mealTypes, type] : p.mealTypes.filter(t => t !== type) }))}
                        className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Portion Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">Min Portions</label>
                  <input
                    type="number"
                    min="1"
                    value={preferences.minPortions}
                    onChange={(e) => setPreferences(p => ({ ...p, minPortions: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">Max Portions</label>
                  <input
                    type="number"
                    min="1"
                    value={preferences.maxPortions}
                    onChange={(e) => setPreferences(p => ({ ...p, maxPortions: Math.max(p.minPortions, parseInt(e.target.value) || 1000) }))}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                    placeholder="1000"
                  />
                </div>
              </div>

              {/* Urgency Only Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.urgencyOnly}
                  onChange={(e) => setPreferences(p => ({ ...p, urgencyOnly: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  Show only urgent (expiring &lt; 2 hours)
                </span>
              </label>

              {/* Active Filters Summary */}
              {(preferences.mealTypes.length > 0 || preferences.minPortions > 1 || preferences.maxPortions < 1000 || preferences.urgencyOnly) && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">Active Filters:</p>
                  <div className="flex flex-wrap gap-1">
                    {preferences.mealTypes.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px]">
                        {t}
                      </span>
                    ))}
                    {preferences.minPortions > 1 && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[10px]">
                        Min: {preferences.minPortions}
                      </span>
                    )}
                    {preferences.maxPortions < 1000 && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[10px]">
                        Max: {preferences.maxPortions}
                      </span>
                    )}
                    {preferences.urgencyOnly && (
                      <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-[10px]">
                        Urgent Only
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Available Surplus Food</h3>
              <span className="text-[10px] font-bold text-gray-500">{filteredAvailable.length} of {available.length} available</span>
            </div>
            {loading ? loadingState : filteredAvailable.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No surplus matches your preferences. Try adjusting filters or check back later.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAvailable.map((f: Donation) => (
                  <div key={f.id} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-2.5 cursor-pointer hover:bg-emerald-500/10 transition-colors" onClick={() => openDetail(f)}>
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
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-500/10">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Click to view details</span>
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                    </div>
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

      {/* Detail Modal */}
      {showDetail && selectedDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl p-4 sm:p-6 rounded-3xl glass-card border border-emerald-500/30 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-emerald-600" />
                Food Batch Details
              </h3>
              <button onClick={() => { setShowDetail(false); setSelectedDonation(null); }} className="p-1.5 rounded-lg glass-card">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${STATUS_STYLES[selectedDonation!.status]}`}>
                  {STATUS_LABELS[selectedDonation!.status]}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">From {selectedDonation!.donorName || 'Donor'}</span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedDonation!.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">{selectedDonation!.description || 'No description'}</p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{selectedDonation!.quantity} portions</p>
                  <p className="text-gray-500 dark:text-gray-400">Quantity</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{selectedDonation!.itemType || '—'}</p>
                  <p className="text-gray-500 dark:text-gray-400">Type</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{selectedDonation!.pickupLocation}</p>
                  <p className="text-gray-500 dark:text-gray-400">Pickup Location</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">
                    {new Date(selectedDonation!.pickupWindowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    –
                    {new Date(selectedDonation!.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">Pickup Window</p>
                </div>
              </div>

{/* Fare Display */}
              {selectedDonation!.fare && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Estimated Driver Fare</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">₹{selectedDonation!.fare}</span>
                  </div>
                  {selectedDonation!.fareBreakdown && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 space-y-0.5">
                      <div className="flex justify-between"><span>Base fare</span><span>₹{selectedDonation!.fareBreakdown.base_fare}</span></div>
                      <div className="flex justify-between"><span>Distance ({selectedDonation!.fareBreakdown.distance_km} km)</span><span>₹{selectedDonation!.fareBreakdown.distance_fare}</span></div>
                      <div className="flex justify-between"><span>Quantity ({selectedDonation!.fareBreakdown.quantity} × ₹{selectedDonation!.fareBreakdown.per_portion_rate})</span><span>₹{selectedDonation!.fareBreakdown.quantity_fare}</span></div>
                      <div className="flex justify-between"><span>Time multiplier</span><span>×{selectedDonation!.fareBreakdown.time_multiplier}</span></div>
                      <div className="flex justify-between"><span>Urgency</span><span>×{selectedDonation!.fareBreakdown.urgency_multiplier}</span></div>
                      <div className="flex justify-between border-t border-amber-500/30 pt-1"><span>Platform fee ({selectedDonation!.fareBreakdown.platform_fee_percent}%)</span><span>-₹{selectedDonation!.fareBreakdown.platform_fee}</span></div>
                      <div className="flex justify-between font-bold"><span>Total</span><span>₹{selectedDonation!.fare}</span></div>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block font-bold mb-2 text-gray-900 dark:text-white">Food Photo (with geotag)</label>
                {selectedDonation!.photoUrl ? (
                  <div className="relative">
                    <img src={selectedDonation!.photoUrl} alt="Food photo" className="w-full max-h-64 rounded-xl object-cover" />
                    {(selectedDonation as any).address && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/80 text-white px-3 py-2 rounded-lg text-xs text-center">
                        📍 {(selectedDonation as any).address}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800/50 text-center text-xs text-gray-500 dark:text-gray-400">
                    No photo available
                  </div>
                )}
              </div>

              {/* Assign Volunteer button */}
              {selectedDonation!.status === 'claimed' && !selectedDonation!.assignedVolunteerId && (
                <button
                  onClick={() => { setAssigningId(selectedDonation!.id); setShowAssignVolunteer(true); setShowDetail(false); }}
                  className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl shadow-glow flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign Volunteer to Pick Up
                </button>
              )}

              {selectedDonation!.assignedVolunteerName && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Volunteer Assigned</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedDonation!.assignedVolunteerName}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Will pick up the food</p>
                </div>
              )}

</div>
          </motion.div>
        </div>
      )}

      {/* Assign Volunteer Modal */}
      {showAssignVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-4 sm:p-6 rounded-3xl glass-card border border-emerald-500/30 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                Assign Volunteer to Pick Up
              </h3>
              <button onClick={() => { setShowAssignVolunteer(false); setAssigningId(null); setVolunteerForm({ name: '', email: '', phone: '', photoUrl: '', address: '', latitude: undefined, longitude: undefined }); }} className="p-1.5 rounded-lg glass-card">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              Fill in volunteer details. They will receive the pickup location and food details.
            </p>

            {selectedDonation && (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 space-y-1 mb-2">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Estimated Driver Fare</p>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Base fare + Distance + Quantity</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">~₹{(50 + 15 * 5 + 2 * (selectedDonation?.quantity || 0)).toFixed(0)}</span>
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">Final fare calculated with distance, time & urgency multipliers</p>
              </div>
            )}

            <form onSubmit={handleAssignVolunteer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Full Name *</label>
                <div className="relative">
                  <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    required
                    value={volunteerForm.name}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, name: e.target.value })}
                    placeholder="e.g., Rajesh Kumar"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={volunteerForm.email}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, email: e.target.value })}
                    placeholder="volunteer@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    required
                    value={volunteerForm.phone}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
              </div>

              {/* Photo with location */}
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Volunteer Photo (with live location)</label>
                {volunteerForm.photoUrl ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img src={volunteerForm.photoUrl} alt="Volunteer photo" className="w-full max-h-64 rounded-xl object-cover" />
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button type="button" onClick={() => setVolunteerForm({ ...volunteerForm, photoUrl: '' })} className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-xl shadow-glow flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          Retake
                        </button>
                        <button type="button" onClick={openAssignCameraWithLocation} className="px-3 py-1.5 text-xs font-bold text-white bg-brand-600 rounded-xl shadow-glow flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          Add Another
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Photo includes timestamp, GPS location, and verification note.</p>
                  </div>
                ) : (
                  <button type="button" onClick={openAssignCameraWithLocation} className="w-full py-3 px-4 rounded-xl glass-card border border-gray-300 dark:border-gray-700 hover:border-emerald-500 text-xs font-black text-gray-900 dark:text-gray-100 flex items-center justify-center gap-3 transition-all shadow-sm">
                    <Camera className="w-5 h-5 text-emerald-600" />
                    <span>Capture Photo with Camera (timestamp, GPS location, verification note)</span>
                  </button>
                )}
              </div>

              {/* Location picker */}
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Pickup Location</label>
                <div className="flex gap-2">
                  <input type="text" required value={volunteerForm.address} onChange={(e) => setVolunteerForm({ ...volunteerForm, address: e.target.value })} placeholder="" className="flex-1 px-3 py-2.5 rounded-xl glass-input text-xs" />
                  <button
                    type="button"
                    onClick={openAssignMapPicker}
                    className="px-3 py-2.5 rounded-xl glass-card border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-1.5"
                    title="Select from Map"
                  >
                    <MapPinIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAssignVolunteer(false); setAssigningId(null); setVolunteerForm({ name: '', email: '', phone: '', photoUrl: '', address: '', latitude: undefined, longitude: undefined }); }}
                  className="flex-1 py-3 rounded-xl glass-card font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningVolunteer}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {assigningVolunteer ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  {assigningVolunteer ? 'Assigning...' : 'Create & Assign Volunteer'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};