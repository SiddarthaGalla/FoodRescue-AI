import { useEffect, useRef, useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Plus, Truck, 
  Leaf, Award, RefreshCw, MapPin, Clock, X, Receipt, Loader2, LifeBuoy,
  Camera, X as XIcon, RotateCcw, AlertCircle, CheckCircle2, MapPin as MapPinIcon, MessageSquare,
  Sparkles, Wand2, AlertTriangle, QrCode, Calendar, Repeat, Volume2, Thermometer, ShieldCheck, Trophy
} from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Sidebar } from '../../components/common/Sidebar';
import { AIAssistantModal } from '../../components/common/AIAssistantModal';
import { OrderChatDrawer } from '../../components/common/OrderChatDrawer';
import { QRCodeModal } from '../../components/common/QRCodeModal';
import { VoiceAlertWidget } from '../../components/common/VoiceAlertWidget';
import { FoodSafetyModal } from '../../components/common/FoodSafetyModal';
import { RescuerLeaderboardModal } from '../../components/common/RescuerLeaderboardModal';
import { ShelfLifeCalculatorModal } from '../../components/common/ShelfLifeCalculatorModal';
import { generateTaxReceiptPDF } from '../../lib/pdfReceiptGenerator';
import { inspectGeotagPhoto, FoodDetectionResult } from '../../lib/foodDetector';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiRequest } from '../../services/api';
import { Donation, DonationStatus } from '../../types/donation';
import { cardHover } from '../../animations/variants';

type Tab = 'overview' | 'listings' | 'pickups';

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
    
    : 'overview';
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeChatDonation, setActiveChatDonation] = useState<Donation | null>(null);
  const [activeQrDonation, setActiveQrDonation] = useState<{ donation: Donation; mode: 'display' | 'scan'; actionType: 'pickup' | 'delivery' } | null>(null);
  const [activeSafetyDonation, setActiveSafetyDonation] = useState<Donation | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  const handleSendSupportRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) {
      showToast('Please enter both subject and message', 'error');
      return;
    }
    setIsSendingSupport(true);
    try {
      await apiRequest('/support', {
        method: 'POST',
        body: JSON.stringify({
          subject: supportSubject.trim(),
          message: supportMessage.trim(),
        }),
      });
      showToast('Support ticket sent directly to Admin Dashboard inbox!', 'success');
      setSupportSubject('');
      setSupportMessage('');
      setShowSupportModal(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit support request', 'error');
    } finally {
      setIsSendingSupport(false);
    }
  };

  // NLP Smart Natural Language State
  const [nlpInput, setNlpInput] = useState('');
  const [nlpExtracting, setNlpExtracting] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Recurring Schedules State
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isRecurringForm, setIsRecurringForm] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('daily');

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await apiRequest<any[]>('/donations/schedules');
      setSchedules(res || []);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const handleToggleSchedule = async (id: string) => {
    try {
      await apiRequest(`/donations/schedules/${id}/toggle`, { method: 'PATCH' });
      fetchSchedules();
      showToast('Recurring surplus schedule updated!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to toggle schedule', 'error');
    }
  };

  const [form, setForm] = useState({
    title: '',
    description: '',
    quantity: '',
    itemType: '',
    expiryDateTime: '',
    pickupLocation: '',
    pickupWindowStart: '',
    pickupWindowEnd: '',
    photoUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleNlpExtract = async (textToParse?: string) => {
    const text = (textToParse || nlpInput).trim();
    if (!text || nlpExtracting) return;

    setNlpExtracting(true);
    try {
      const res = await apiRequest<{
        title?: string;
        description?: string;
        quantity?: number;
        itemType?: string;
        pickupLocation?: string;
        expiryDateTime?: string;
        pickupWindowStart?: string;
        pickupWindowEnd?: string;
        missingFields: string[];
      }>('/donations/extract-nlp', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });

      setForm((prev) => ({
        ...prev,
        title: res.title || prev.title,
        description: res.description || prev.description,
        quantity: res.quantity ? res.quantity.toString() : prev.quantity,
        itemType: res.itemType || prev.itemType,
        pickupLocation: res.pickupLocation || prev.pickupLocation,
        expiryDateTime: res.expiryDateTime ? new Date(res.expiryDateTime).toISOString().slice(0, 16) : prev.expiryDateTime,
        pickupWindowStart: res.pickupWindowStart ? new Date(res.pickupWindowStart).toISOString().slice(0, 16) : prev.pickupWindowStart,
        pickupWindowEnd: res.pickupWindowEnd ? new Date(res.pickupWindowEnd).toISOString().slice(0, 16) : prev.pickupWindowEnd,
      }));

      setMissingFields(res.missingFields || []);
      showToast('AI extracted surplus details and auto-filled the form!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to parse text with AI', 'error');
    } finally {
      setNlpExtracting(false);
    }
  };
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoLocation, setPhotoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photoAddress, setPhotoAddress] = useState<string>('');
  const [aiFoodInspection, setAiFoodInspection] = useState<FoodDetectionResult | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

  const runFoodInspection = async (photoUrl: string) => {
    if (!photoUrl) return;
    setIsAnalyzingPhoto(true);
    try {
      const res = await inspectGeotagPhoto(photoUrl);
      setAiFoodInspection(res);
      if (!res.foodDetected) {
        showToast(res.note, 'error');
      } else {
        showToast('AI Food Inspection Verified: Food items detected in photo!', 'success');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<any>(null);

const DUMMY_DONATIONS: Donation[] = [
  {
    id: 'DON-MAA-01',
    title: 'Hot Sambar Rice, Poriyal & Chapati Trays (Banquet Surplus)',
    description: 'Freshly prepared wholesome meals from lunch buffet at T. Nagar Convention Centre. Kept in insulated thermal food containers.',
    quantity: 120,
    itemType: 'Prepared Meals',
    status: 'available',
    pickupLocation: 'Grand Palace Hotel, No. 45, South Boag Road, T. Nagar, Chennai (Geo: 13.0418° N, 80.2341° E)',
    latitude: 13.0418,
    longitude: 80.2341,
    pickupWindowStart: new Date(Date.now() + 15 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 180 * 60000).toISOString(),
    expiryDateTime: new Date(Date.now() + 240 * 60000).toISOString(),
    donorName: 'Grand Palace Hotel T. Nagar',
    donorPhone: '+91 98400 12345',
    temperature: '68°C (Safe Hot Hold)',
    foodSafetyPassed: true,
    photoUrl: '/images/man_with_food_chennai_1.jpg',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'DON-MAA-02',
    title: 'Fresh South Indian Breakfast & Bakery Items',
    description: 'Freshly baked whole wheat breads, croissants, vada & idli meal sets prepared this morning. Sealed in eco-friendly packages.',
    quantity: 95,
    itemType: 'Bakery Items',
    status: 'claimed',
    pickupLocation: 'Chennai Bakehouse, Rajiv Gandhi Salai (OMR), Sholinganallur, Chennai (Geo: 12.9010° N, 80.2279° E)',
    latitude: 12.9010,
    longitude: 80.2279,
    pickupWindowStart: new Date(Date.now() - 30 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 120 * 60000).toISOString(),
    expiryDateTime: new Date(Date.now() + 360 * 60000).toISOString(),
    donorName: 'Chennai Bakehouse OMR',
    donorPhone: '+91 98411 67890',
    temperature: '22°C (Ambient Room Temp)',
    foodSafetyPassed: true,
    claimedByNgoName: 'Mylapore Shelter Hub',
    volunteerName: 'Driver Fleet #402 (Karthik R.)',
    photoUrl: '/images/man_with_food_chennai_2.jpg',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  }
];

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Donation[]>('/donations');
      setDonations(data && data.length > 0 ? data : DUMMY_DONATIONS);
    } catch (err: any) {
      setDonations(DUMMY_DONATIONS);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDonations();
    fetchSchedules();
  }, [fetchDonations, fetchSchedules]);

  const active = donations.filter((d) => d.status !== 'cancelled');
  const pickups = donations.filter((d) => d.status === 'claimed' || d.status === 'picked_up');
  const delivered = donations.filter((d) => d.status === 'delivered');

  const totalPortions = active.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const deliveredPortions = delivered.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const co2Tons = (deliveredPortions * 1.1) / 1000;

  const stats = [
    { title: 'Total Donated Portions', value: totalPortions.toLocaleString(), change: `${active.length} listing${active.length === 1 ? '' : 's'}`, icon: Package },
    { title: 'Active Pickups', value: pickups.length.toLocaleString(), change: pickups.length ? 'In progress' : 'Awaiting claims', icon: Truck },
    { title: 'CO₂ Emissions Saved', value: co2Tons > 0 ? `${co2Tons.toFixed(1)} Tons` : '0 Tons', change: 'From delivered meals', icon: Leaf },
    { title: 'Active Listings', value: active.length.toLocaleString(), change: active.length ? 'Currently active' : 'No active listings', icon: Package },
  ];

  const updateField = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

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

  const openCamera = async () => {
    try {
      const loc = await getCurrentLocation();
      setPhotoLocation(loc);
      const address = await reverseGeocode(loc.lat, loc.lng);
      setPhotoAddress(address);
    } catch (e) {
      showToast('Location access required for geotagging', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setShowCamera(true);
    } catch (e) {
      showToast('Camera access required', 'error');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
    setCapturedPhoto(null);
    setPhotoLocation(null);
    setPhotoAddress('');
  };

  const openMapPicker = async () => {
    try {
      const loc = await getCurrentLocation();
      setMapCenter(loc);
      setSelectedLocation(loc);
    } catch {
      setMapCenter({ lat: 28.6139, lng: 77.2090 }); // Default to New Delhi
      setSelectedLocation({ lat: 28.6139, lng: 77.2090 });
    }
    setShowMapPicker(true);
  };

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng;
    setSelectedLocation({ lat, lng });
  };

  useEffect(() => {
    if (showMapPicker && mapRef.current && mapRef.current.leafletElement) {
      const map = mapRef.current.leafletElement;
      map.on('click', handleMapClick);
      return () => {
        map.off('click', handleMapClick);
      };
    }
  }, [showMapPicker, handleMapClick]);

  const confirmMapLocation = async () => {
    if (!selectedLocation) return;
    const address = await reverseGeocode(selectedLocation.lat, selectedLocation.lng);
    updateField('pickupLocation', address);
    setShowMapPicker(false);
    setSelectedLocation(null);
    setMapCenter(null);
  };

  const closeMapPicker = () => {
    setShowMapPicker(false);
    setSelectedLocation(null);
    setMapCenter(null);
  };

  const capturePhoto = () => {
    if (!cameraStream) return;
    const video = document.createElement('video');
    video.srcObject = cameraStream;
    video.play();
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Add overlay: timestamp, GPS address, note
      const now = new Date();
      const timestamp = now.toLocaleString();
      const gpsText = photoAddress || (photoLocation
        ? `${photoLocation.lat.toFixed(4)}, ${photoLocation.lng.toFixed(4)}`
        : 'Location unavailable');
      const note = 'Person with food should be in photo';

      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      const padding = 12;
      const lineHeight = 28;
      let y = canvas.height - padding - lineHeight * 3;

      // Background for text
      ctx.fillRect(0, y - 4, canvas.width, lineHeight * 3 + 8);
      ctx.fillStyle = 'white';
      ctx.fillText(`Captured: ${timestamp}`, padding, y);
      y += lineHeight;
      ctx.fillText(gpsText, padding, y);
      y += lineHeight;
      ctx.fillText(note, padding, y);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhoto(dataUrl);
      setForm((f) => ({ ...f, photoUrl: dataUrl }));
      runFoodInspection(dataUrl);
      closeCamera();
    };
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setAiFoodInspection(null);
    setForm((f) => ({ ...f, photoUrl: '' }));
  };

  const handleCreateDonation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRecurringForm) {
      setSubmitting(true);
      try {
        await apiRequest('/donations/schedules', {
          method: 'POST',
          body: JSON.stringify({
            title: form.title,
            quantity: parseInt(form.quantity, 10) || 20,
            itemType: form.itemType || 'Cooked Meals',
            pickupLocation: form.pickupLocation || 'Main Kitchen Gate',
            frequency: recurringFrequency,
            pickupTime: '21:00',
            daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            isActive: true,
          }),
        });
        showToast('🔄 Standing recurring schedule activated!', 'success');
        setShowModal(false);
        setIsRecurringForm(false);
        fetchSchedules();
      } catch (err: any) {
        showToast(err.message || 'Failed to create recurring schedule', 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Validate required fields
    if (!form.title.trim()) {
      showToast('Food Item Name is required', 'error');
      setSubmitting(false);
      return;
    }
    if (!form.description.trim()) {
      showToast('Description is required', 'error');
      setSubmitting(false);
      return;
    }
    if (!form.quantity) {
      showToast('Quantity is required', 'error');
      setSubmitting(false);
      return;
    }
    if (!form.itemType.trim()) {
      showToast('Item Type is required', 'error');
      setSubmitting(false);
      return;
    }
    if (!form.pickupLocation.trim()) {
      showToast('Pickup Location is required', 'error');
      setSubmitting(false);
      return;
    }
    if (!form.expiryDateTime) {
      showToast('Expiry Date & Time is required', 'error');
      setSubmitting(false);
      return;
    }
    if (!form.pickupWindowStart || !form.pickupWindowEnd) {
      showToast('Pickup Window Start and End are required', 'error');
      setSubmitting(false);
      return;
    }
    if (!form.photoUrl) {
      showToast('Food Photo with geotag is required', 'error');
      setSubmitting(false);
      return;
    }

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
          address: photoAddress || null,
        }),
      });
      showToast('Food surplus posted to the matching engine!', 'success');
      setShowModal(false);
      setForm({
        title: '', description: '', quantity: '', itemType: '', expiryDateTime: '',
        pickupLocation: '', pickupWindowStart: '', pickupWindowEnd: '',
        photoUrl: '',
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
                Manage your food surplus posts, track pickups, and view your impact.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowLeaderboard(true)}
                className="px-3.5 py-3 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 glass-card rounded-2xl flex items-center justify-center gap-1.5 transition-all"
                title="Rescuer Leaderboard & Embeddable Web Badges"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="hidden md:inline">Leaderboard & Badges</span>
              </button>
              <button
                onClick={() => setShowCalculator(true)}
                className="px-3.5 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 glass-card rounded-2xl flex items-center justify-center gap-1.5 transition-all"
                title="AI Food Expiration Predictor"
              >
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="hidden md:inline">AI Shelf-Life Calc</span>
              </button>
              <button
                onClick={() => setShowSupportModal(true)}
                className="px-3.5 py-3 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 glass-card rounded-2xl flex items-center justify-center gap-1.5 transition-all"
                title="Need Support / Contact Admin"
              >
                <LifeBuoy className="w-4 h-4 text-purple-500" />
                <span className="hidden md:inline">Need Support</span>
              </button>
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
                <span>Post Surplus</span>
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

            {/* Recurring Surplus Subscriptions Section */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                    Recurring Surplus Subscriptions
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsRecurringForm(true);
                    setShowModal(true);
                  }}
                  className="px-3 py-1 text-[11px] font-black text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Schedule</span>
                </button>
              </div>

              {schedules.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  No active standing schedules. Create a recurring schedule for daily/weekly surplus items.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {schedules.map((s) => (
                    <div key={s.id} className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/15 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{s.title}</p>
                          <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
                            🔄 {s.frequency.toUpperCase()} at {s.pickupTime} • {s.quantity} portions
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleSchedule(s.id)}
                          className={`px-2.5 py-1 text-[10px] font-black rounded-full transition-all ${
                            s.isActive
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-gray-200 dark:bg-gray-800 text-gray-500'
                          }`}
                        >
                          {s.isActive ? '● Active' : '○ Paused'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-purple-500/10">
                        <span className="truncate max-w-[180px]">📍 {s.pickupLocation}</span>
                        <span>Next: {new Date(s.nextAutoPublishAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
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

                    <div className="pt-2 border-t border-brand-500/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => setActiveQrDonation({ donation: p, mode: 'display', actionType: 'pickup' })}
                        className="py-2 px-3 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl border border-blue-500/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Pickup QR & PIN ({p.verificationPin || '849201'})</span>
                      </button>
                      <button
                        onClick={() => setActiveChatDonation(p)}
                        className="py-2 px-3 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 rounded-xl border border-brand-500/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Order Chat</span>
                        {p.messages && p.messages.length > 0 && (
                          <span className="px-1.5 py-0.5 text-[9px] font-black bg-brand-600 text-white rounded-full">
                            {p.messages.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => generateTaxReceiptPDF(p)}
                        className="py-2 px-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Tax Receipt PDF</span>
                      </button>
                      <button
                        onClick={() => setActiveSafetyDonation(p)}
                        className="py-2 px-3 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl border border-purple-500/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Thermometer className="w-3.5 h-3.5" />
                        <span>{p.haccpPassed ? '🛡️ HACCP Passed' : 'Safety Log'}</span>
                      </button>
                    </div>
                  </div>
                ))}
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
            {/* AI Natural Language Magic Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-500/10 via-emerald-500/10 to-blue-500/10 border border-brand-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-black text-gray-900 dark:text-white">
                    Smart AI Natural Language Posting
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-brand-600 text-white">
                  NLP Auto-Fill
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Type or paste plain text describing your surplus food, and AI will extract all details automatically!
              </p>

              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={nlpInput}
                  onChange={(e) => setNlpInput(e.target.value)}
                  placeholder="e.g., 50 plates of hot chicken biryani and naan at Connaught Place Back Gate 3, expires at 11 PM tonight"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs resize-none"
                />
                <button
                  type="button"
                  onClick={() => handleNlpExtract()}
                  disabled={nlpExtracting || !nlpInput.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 text-white font-bold text-xs shadow-glow disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
                >
                  {nlpExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  <span>{nlpExtracting ? 'Extracting details with AI...' : 'Extract Details & Auto-Fill Form'}</span>
                </button>
              </div>

              {/* Sample Prompt Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pt-1">
                <span className="text-gray-400 font-bold shrink-0">Try tapping:</span>
                {[
                  '50 portions hot biryani at Connaught Place expiring 11 PM',
                  '20 kg fresh bakery loaves at Back Gate 3',
                  '15 boxed salads expiring in 2 hours',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setNlpInput(chip);
                      handleNlpExtract(chip);
                    }}
                    className="px-2.5 py-1 rounded-full bg-white/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-brand-500/10 border border-gray-200 dark:border-gray-700 whitespace-nowrap shrink-0 transition-all font-semibold"
                  >
                    ✨ {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Amber Warning Banners for Missing Fields */}
            {missingFields.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1 text-xs text-amber-800 dark:text-amber-300 font-bold">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>AI extracted main details, but please verify missing fields:</span>
                </div>
                <ul className="list-disc list-inside text-[11px] font-semibold pl-2 space-y-0.5 text-amber-700 dark:text-amber-400">
                  {missingFields.includes('quantity') && <li>Portion quantity count was not specified in text.</li>}
                  {missingFields.includes('pickupLocation') && <li>Specific pickup location address was not specified.</li>}
                  {missingFields.includes('expiryDateTime') && <li>Expiration timeframe was not specified.</li>}
                </ul>
              </div>
            )}

            <form onSubmit={handleCreateDonation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Food Item Name *</label>
                <input type="text" required value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="" className="w-full px-3 py-2.5 rounded-xl glass-input" />
              </div>
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Description *</label>
                <textarea required value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={2} placeholder="" className="w-full px-3 py-2.5 rounded-xl glass-input resize-none" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Quantity (Portions) *</label>
                  <input type="number" min={1} required value={form.quantity} onChange={(e) => updateField('quantity', e.target.value)} placeholder="" className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Item Type *</label>
                  <input type="text" required value={form.itemType} onChange={(e) => updateField('itemType', e.target.value)} placeholder="" className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Pickup Location *</label>
                <div className="flex gap-2">
                  <input type="text" required value={form.pickupLocation} onChange={(e) => updateField('pickupLocation', e.target.value)} placeholder="" className="flex-1 px-3 py-2.5 rounded-xl glass-input" />
                  <button
                    type="button"
                    onClick={openMapPicker}
                    className="px-3 py-2.5 rounded-xl glass-card border border-brand-500/20 text-brand-600 dark:text-brand-400 hover:bg-brand-500/10 transition-colors flex items-center justify-center gap-1.5"
                    title="Select from Map"
                  >
                    <MapPinIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Expiry Date & Time *</label>
                  <input type="datetime-local" required value={form.expiryDateTime} onChange={(e) => updateField('expiryDateTime', e.target.value)} className="w-full px-3 py-2.5 rounded-xl glass-input" />
                </div>
              </div>

              {/* Photo Capture Section */}
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Food Photo (with geotag)</label>
                {form.photoUrl ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img src={form.photoUrl} alt="Food photo" className="w-full max-h-64 rounded-xl object-cover" />
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button type="button" onClick={retakePhoto} className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-xl shadow-glow flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          Retake
                        </button>
                        <button type="button" onClick={openCamera} className="px-3 py-1.5 text-xs font-bold text-white bg-brand-600 rounded-xl shadow-glow flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          Add Another
                        </button>
                      </div>
                    </div>
                    {/* AI Vision Food Inspection Result */}
                    {isAnalyzingPhoto ? (
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] font-bold text-blue-600 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span>AI Computer Vision: Analyzing photo for food items & containers...</span>
                      </div>
                    ) : aiFoodInspection ? (
                      <div className={`p-3 rounded-xl border text-xs font-bold space-y-1 ${
                        aiFoodInspection.foodDetected
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 animate-pulse'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-extrabold">
                            {aiFoodInspection.foodDetected ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                            {aiFoodInspection.note}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md uppercase font-mono font-black bg-black/10">
                            {aiFoodInspection.confidence}% confidence
                          </span>
                        </div>
                        {!aiFoodInspection.foodDetected && (
                          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                            Note: Our AI model could not confirm food in this photo. Please retake photo ensuring food or containers are visible!
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Person along with food should be in photo.</p>
                    )}
                  </div>
                ) : (
                  <button type="button" onClick={openCamera} className="w-full py-3 px-4 rounded-xl glass-card border border-gray-300 dark:border-gray-700 hover:border-brand-500 text-xs font-black text-gray-900 dark:text-gray-100 flex items-center justify-center gap-3 transition-all shadow-sm">
                    <Camera className="w-5 h-5 text-brand-600" />
                    <span>Capture Photo with Camera (timestamp, GPS location, verification note)</span>
                  </button>
                )}
              </div>

              {/* Camera Capture Modal (inline in form) */}
              {showCamera && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-md p-4 sm:p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Camera className="w-5 h-5 text-brand-600" />
                        Capture Food Photo
                      </h3>
                      <button onClick={closeCamera} className="p-1.5 rounded-lg glass-card">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                      {cameraStream && (
                        <video
                          ref={(el) => {
                            if (el && cameraStream) {
                              el.srcObject = cameraStream;
                              el.play();
                            }
                          }}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                        />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-between p-4 text-white pointer-events-none">
                        <div className="text-center text-xs bg-black/50 px-3 py-1 rounded-full">
                          Point camera at the food. Ensure good lighting.
                        </div>
                        <div className="text-center text-[10px] bg-black/50 px-3 py-1 rounded-full max-w-[90%] truncate">
                          {photoAddress ? `📍 ${photoAddress}` : (photoLocation ? `📍 ${photoLocation.lat.toFixed(4)}, ${photoLocation.lng.toFixed(4)}` : 'Getting location...')}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={closeCamera}
                        className="flex-1 py-3 rounded-xl glass-card font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={capturePhoto}
                        disabled={!cameraStream}
                        className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Capture & Add Geotag
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
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

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-4 sm:p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-brand-600" />
                Capture Food Photo
              </h3>
              <button onClick={closeCamera} className="p-1.5 rounded-lg glass-card">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
              {cameraStream && (
                <video
                  ref={(el) => {
                    if (el && cameraStream) {
                      el.srcObject = cameraStream;
                      el.play();
                    }
                  }}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-between p-4 text-white pointer-events-none">
                <div className="text-center text-xs bg-black/50 px-3 py-1 rounded-full">
                  Point camera at the food. Ensure good lighting.
                </div>
                <div className="text-center text-[10px] bg-black/50 px-3 py-1 rounded-full">
                  {photoLocation && `📍 ${photoLocation.lat.toFixed(4)}, ${photoLocation.lng.toFixed(4)}`}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={closeCamera}
                className="flex-1 py-3 rounded-xl glass-card font-bold"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                disabled={!cameraStream}
                className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture & Add Geotag
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-4 sm:p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-brand-600" />
                Capture Food Photo
              </h3>
              <button onClick={closeCamera} className="p-1.5 rounded-lg glass-card">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
              {cameraStream && (
                <video
                  ref={(el) => {
                    if (el && cameraStream) {
                      el.srcObject = cameraStream;
                      el.play();
                    }
                  }}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-between p-4 text-white pointer-events-none">
                <div className="text-center text-xs bg-black/50 px-3 py-1 rounded-full">
                  Point camera at the food. Ensure good lighting.
                </div>
                <div className="text-center text-[10px] bg-black/50 px-3 py-1 rounded-full">
                  {photoLocation && `📍 ${photoLocation.lat.toFixed(4)}, ${photoLocation.lng.toFixed(4)}`}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={closeCamera}
                className="flex-1 py-3 rounded-xl glass-card font-bold"
              >
                Cancel
              </button>
              <button
                onClick={capturePhoto}
                disabled={!cameraStream}
                className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture & Add Geotag
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {showMapPicker && mapCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xl p-4 sm:p-6 rounded-3xl glass-card border border-brand-500/30 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-brand-600" />
                Select Pickup Location
              </h3>
              <button onClick={closeMapPicker} className="p-1.5 rounded-lg glass-card">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900">
              <MapContainer
                ref={mapRef}
                center={mapCenter}
                zoom={15}
                scrollWheelZoom={true}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {selectedLocation && (
                  <Marker position={selectedLocation}>
                    <div className="w-8 h-8 bg-brand-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                      <MapPinIcon className="w-4 h-4 text-white" />
                    </div>
                  </Marker>
                )}
              </MapContainer>
              {selectedLocation && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/80 text-white px-4 py-2 rounded-lg text-center text-sm">
                  Drag map to adjust pin position
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={closeMapPicker}
                className="flex-1 py-3 rounded-xl glass-card font-bold"
              >
                Cancel
              </button>
              <button
                onClick={confirmMapLocation}
                disabled={!selectedLocation}
                className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-bold shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Use This Location
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating AI Assistant for Donors */}
      <AIAssistantModal role="donor" />

      {/* Floating Voice & Audio Notification Controls */}
      <VoiceAlertWidget role="donor" />

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

      {/* Food Safety Inspection Modal */}
      <AnimatePresence>
        {activeSafetyDonation && (
          <FoodSafetyModal
            donation={activeSafetyDonation}
            onClose={() => setActiveSafetyDonation(null)}
            onLogged={() => fetchDonations()}
          />
        )}
      </AnimatePresence>

      {/* Rescuer Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <RescuerLeaderboardModal onClose={() => setShowLeaderboard(false)} />
        )}
      </AnimatePresence>

      {/* AI Shelf-Life Calculator Modal */}
      <AnimatePresence>
        {showCalculator && (
          <ShelfLifeCalculatorModal onClose={() => setShowCalculator(false)} />
        )}
      </AnimatePresence>

      {/* Support Ticket Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md p-6 rounded-3xl glass-card border border-purple-500/30 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Need Support / Contact Admin</h3>
              </div>
              <button onClick={() => setShowSupportModal(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300">
              Submit a support request directly to the Admin Dashboard inbox.
            </p>

            <form onSubmit={handleSendSupportRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-900 dark:text-white">Ticket Subject</label>
                <input
                  type="text"
                  required
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  placeholder="e.g. Container pickup delay / Account inquiry"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-gray-900 dark:text-white">Message Details</label>
                <textarea
                  required
                  rows={4}
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Describe your issue or assistance needed..."
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowSupportModal(false)} className="w-1/3 py-2.5 rounded-xl glass-card text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={isSendingSupport} className="w-2/3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-glow flex items-center justify-center gap-1.5">
                  {isSendingSupport ? 'Sending...' : 'Submit Support Ticket'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
  </div>
  );
};