import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Package, MapPin, CheckCircle, Clock, 
  Users, ArrowUpRight, HandHeart, Leaf, Loader2, RefreshCw, Truck,
  Camera, X as XIcon, MapPin as MapPinIcon, RotateCcw, AlertCircle, CheckCircle2, Eye, UserPlus, Shield, Mail, Phone, Filter,
  Navigation, Target, Sparkles, SlidersHorizontal, Compass, MessageSquare, QrCode, Calendar, Repeat, Volume2, Receipt, Thermometer, Trophy, LifeBuoy
} from 'lucide-react';

import { Sidebar } from '../../components/common/Sidebar';
import { AIAssistantModal } from '../../components/common/AIAssistantModal';
import { OrderChatDrawer } from '../../components/common/OrderChatDrawer';
import { QRCodeModal } from '../../components/common/QRCodeModal';
import { VoiceAlertWidget } from '../../components/common/VoiceAlertWidget';
import { FoodSafetyModal } from '../../components/common/FoodSafetyModal';
import { RescuerLeaderboardModal } from '../../components/common/RescuerLeaderboardModal';
import { ShelfLifeCalculatorModal } from '../../components/common/ShelfLifeCalculatorModal';
import { generateTaxReceiptPDF } from '../../lib/pdfReceiptGenerator';
import { soundManager } from '../../lib/soundAlert';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiRequest } from '../../services/api';
import { Donation, DonationStatus } from '../../types/donation';
import { cardHover } from '../../animations/variants';
import { haversineDistance, formatDistance, getExpiryStatus, evaluateDonationPriority, Coordinates } from '../../lib/geo';

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
  const [activeChatDonation, setActiveChatDonation] = useState<Donation | null>(null);
  const [activeQrDonation, setActiveQrDonation] = useState<{ donation: Donation; mode: 'display' | 'scan'; actionType: 'pickup' | 'delivery' } | null>(null);

  // NGO Preferences state
  const [preferences, setPreferences] = useState<{
    mealTypes: string[];
    minPortions: number;
    maxPortions: number;
    urgencyOnly: boolean;
    maxDistance: number;
    pickupTimeStart: string;
    pickupTimeEnd: string;
  }>({
    mealTypes: [],
    minPortions: 1,
    maxPortions: 1000,
    urgencyOnly: false,
    maxDistance: 50,
    pickupTimeStart: '',
    pickupTimeEnd: '',
  });

  // NGO Location state
  const [ngoLocation, setNgoLocation] = useState<Coordinates | null>({ lat: 13.0827, lng: 80.2707 });
  const [ngoAddress, setNgoAddress] = useState<string>('Mylapore Shelter Hub, Chennai, Tamil Nadu');
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [customLat, setCustomLat] = useState<string>('13.0827');
  const [customLng, setCustomLng] = useState<string>('80.2707');
  const [customAddr, setCustomAddr] = useState<string>('Mylapore Shelter Hub, Chennai, Tamil Nadu');

  // NGO Requirement Details state
  const [requiredPortions, setRequiredPortions] = useState<number | ''>('');
  const [requiredTime, setRequiredTime] = useState<string>('');
  const [sortMode, setSortMode] = useState<'priority' | 'nearest' | 'urgent' | 'capacity'>('priority');

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

  const [schedules, setSchedules] = useState<any[]>([]);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await apiRequest<any[]>('/donations/schedules');
      setSchedules(res || []);
    } catch (e) {
      console.warn(e);
    }
  }, []);

const DUMMY_NGO_DONATIONS: Donation[] = [
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
    expiryDateTime: new Date(Date.now() + 100 * 60000).toISOString(),
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
    status: 'available',
    pickupLocation: 'Chennai Bakehouse, Rajiv Gandhi Salai (OMR), Sholinganallur, Chennai (Geo: 12.9010° N, 80.2279° E)',
    latitude: 12.9010,
    longitude: 80.2279,
    pickupWindowStart: new Date(Date.now() + 20 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 240 * 60000).toISOString(),
    expiryDateTime: new Date(Date.now() + 300 * 60000).toISOString(),
    donorName: 'Chennai Bakehouse OMR',
    donorPhone: '+91 98411 67890',
    temperature: '22°C (Ambient Room Temp)',
    foodSafetyPassed: true,
    photoUrl: '/images/man_with_food_chennai_2.jpg',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'DON-MAA-03',
    title: 'Farm Fresh Organic Salad & Chilled Fruit Bowls',
    description: 'Chilled organic green salads, cut melon slices, and berry bowls prepared in cold kitchen.',
    quantity: 75,
    itemType: 'Fresh Produce',
    status: 'available',
    pickupLocation: 'Green Bistro, 2nd Avenue, Anna Nagar, Chennai (Geo: 13.0850° N, 80.2101° E)',
    latitude: 13.0850,
    longitude: 80.2101,
    pickupWindowStart: new Date(Date.now() + 10 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 150 * 60000).toISOString(),
    expiryDateTime: new Date(Date.now() + 180 * 60000).toISOString(),
    donorName: 'Green Bistro Anna Nagar',
    donorPhone: '+91 98402 34567',
    temperature: '4°C (Chilled Storage)',
    foodSafetyPassed: true,
    photoUrl: '/images/man_with_food_chennai_1.jpg',
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: 'DON-MAA-04',
    title: 'Steamed Ponni Rice & Dal Tadka Casseroles',
    description: 'Nutritious dal tadka and basmati rice portions stored in thermal food warmers.',
    quantity: 150,
    itemType: 'Cooked Meals',
    status: 'claimed',
    pickupLocation: 'TechPark Kitchens, 100 Feet Bypass Road, Velachery, Chennai (Geo: 12.9815° N, 80.2180° E)',
    latitude: 12.9815,
    longitude: 80.2180,
    pickupWindowStart: new Date(Date.now() - 30 * 60000).toISOString(),
    pickupWindowEnd: new Date(Date.now() + 120 * 60000).toISOString(),
    expiryDateTime: new Date(Date.now() + 360 * 60000).toISOString(),
    donorName: 'TechPark Kitchens Velachery',
    donorPhone: '+91 98403 98765',
    temperature: '65°C (Safe Hot Hold)',
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
      const feed = data && data.length > 0 ? data : DUMMY_NGO_DONATIONS;
      setDonations(feed);

      const urgentBatch = feed.find((d) => {
        if (d.status !== 'available' || !d.expiryDateTime) return false;
        const diffHrs = (new Date(d.expiryDateTime).getTime() - Date.now()) / (1000 * 3600);
        return diffHrs > 0 && diffHrs <= 2.5;
      });

      if (urgentBatch) {
        soundManager.playUrgentChime();
        setTimeout(() => {
          soundManager.speak(`Urgent alert: ${urgentBatch.quantity} portions of ${urgentBatch.title} expiring soon nearby!`);
        }, 500);
      }
    } catch (err: any) {
      setDonations(DUMMY_NGO_DONATIONS);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const detectNgoLocation = useCallback(() => {
    setIsDetectingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setNgoLocation(loc);
          setCustomLat(loc.lat.toString());
          setCustomLng(loc.lng.toString());
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=14`);
            const data = await res.json();
            if (data.display_name) {
              const cleanAddr = data.display_name.split(',').slice(0, 3).join(',');
              setNgoAddress(cleanAddr);
              setCustomAddr(cleanAddr);
            } else {
              setNgoAddress(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
            }
          } catch {
            setNgoAddress(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
          }
          setIsDetectingLocation(false);
          showToast('NGO location updated via GPS!', 'success');
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setIsDetectingLocation(false);
          if (!ngoLocation) {
            setNgoLocation({ lat: 28.6139, lng: 77.2090 });
            setNgoAddress('Central New Delhi (Default)');
          }
          showToast('Unable to fetch GPS location automatically. You can edit your location manually.', 'info');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setIsDetectingLocation(false);
      showToast('Geolocation is not supported by your browser.', 'error');
    }
  }, [ngoLocation, showToast]);

  useEffect(() => {
    detectNgoLocation();
    fetchDonations();
    fetchSchedules();
  }, [fetchDonations, fetchSchedules]);

  // Rejected / Hidden Donation IDs for this NGO
  const [rejectedIds, setRejectedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`ngo_rejected_${user?.id || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleRejectDonation = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRejectedIds((prev) => {
      const updated = [...prev, id];
      try {
        localStorage.setItem(`ngo_rejected_${user?.id || 'default'}`, JSON.stringify(updated));
      } catch (err) {
        console.warn(err);
      }
      return updated;
    });
    showToast('Donation rejected & hidden from your list. (Other NGOs can still view/claim it)', 'info');
  };

  const handleRestoreRejected = () => {
    setRejectedIds([]);
    try {
      localStorage.removeItem(`ngo_rejected_${user?.id || 'default'}`);
    } catch (err) {
      console.warn(err);
    }
    showToast('Restored all hidden donations to your list.', 'success');
  };

  const handleSaveCustomLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lngNum = parseFloat(customLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      showToast('Please enter valid latitude and longitude numbers', 'error');
      return;
    }
    setNgoLocation({ lat: latNum, lng: lngNum });
    setNgoAddress(customAddr.trim() || `${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`);
    setShowLocationModal(false);
    showToast('NGO location updated successfully!', 'success');
  };

  const available = donations.filter((d) => d.status === 'available' && !rejectedIds.includes(d.id));

  // Filter and Rank available donations based on NGO Location & custom requirements
  const processedAvailable = useMemo(() => {
    let list = available.map(d => {
      const distanceKm = (ngoLocation && d.latitude && d.longitude)
        ? haversineDistance(ngoLocation.lat, ngoLocation.lng, d.latitude, d.longitude)
        : null;
      const distanceText = formatDistance(distanceKm);
      const expiryStatus = getExpiryStatus(d.expiryDateTime);
      const priorityEval = evaluateDonationPriority(
        d,
        ngoLocation,
        {
          requiredPortions: typeof requiredPortions === 'number' ? requiredPortions : undefined,
          requiredTime
        }
      );

      return {
        ...d,
        distanceKm,
        distanceText,
        expiryStatus,
        priorityEval,
      };
    });

    // Preferences filter (meal types, portion range, max distance)
    if (preferences.mealTypes.length > 0) {
      list = list.filter(d => 
        d.itemType && preferences.mealTypes.some(t => d.itemType!.toLowerCase().includes(t.toLowerCase()))
      );
    }
    if (preferences.minPortions > 1) {
      list = list.filter(d => (d.quantity || 0) >= preferences.minPortions);
    }
    if (preferences.maxPortions < 1000) {
      list = list.filter(d => (d.quantity || 0) <= preferences.maxPortions);
    }
    if (preferences.urgencyOnly) {
      list = list.filter(d => d.expiryStatus.isUrgent);
    }
    if (preferences.maxDistance && preferences.maxDistance < 500) {
      list = list.filter(d => d.distanceKm === null || d.distanceKm <= preferences.maxDistance);
    }

    // Filter by pickup start/end preference
    if (preferences.pickupTimeStart) {
      list = list.filter(d => new Date(d.pickupWindowStart || 0) >= new Date(preferences.pickupTimeStart));
    }
    if (preferences.pickupTimeEnd) {
      list = list.filter(d => new Date(d.pickupWindowEnd || 0) <= new Date(preferences.pickupTimeEnd));
    }

    // Sort by selected mode
    list.sort((a, b) => {
      if (sortMode === 'nearest') {
        const distA = a.distanceKm ?? 999999;
        const distB = b.distanceKm ?? 999999;
        return distA - distB;
      }
      if (sortMode === 'urgent') {
        const timeA = new Date(a.expiryDateTime || 0).getTime();
        const timeB = new Date(b.expiryDateTime || 0).getTime();
        return timeA - timeB;
      }
      if (sortMode === 'capacity') {
        return b.quantity - a.quantity;
      }
      // Priority Mode: Smart Match Score (Combination of Capacity Match, Expiry Urgency, and Distance Proximity)
      return b.priorityEval.score - a.priorityEval.score;
    });

    return list;
  }, [available, ngoLocation, requiredPortions, requiredTime, preferences, sortMode]);
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
              Detect location, enter feeding requirements, priority rank nearest & fast-expiring surplus food, and coordinate pickups.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
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
              <span className="hidden sm:inline">Refresh Feed</span>
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

        {/* NGO Location Status Banner */}
        <div className="p-4 rounded-2xl glass-card border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-glow shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Detected NGO Location
                </span>
                {ngoLocation && (
                  <span className="text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300">
                    ({ngoLocation.lat.toFixed(4)}, {ngoLocation.lng.toFixed(4)})
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{ngoAddress || 'Location set to Central New Delhi'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={detectNgoLocation}
              disabled={isDetectingLocation}
              className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all"
            >
              {isDetectingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
              <span>{isDetectingLocation ? 'Detecting...' : 'Detect GPS'}</span>
            </button>
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex-1 sm:flex-none px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 glass-card rounded-xl flex items-center justify-center gap-1.5 hover:bg-emerald-500/10 transition-all"
            >
              <MapPinIcon className="w-3.5 h-3.5 text-emerald-500" />
              <span>Edit Location</span>
            </button>
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

            {/* Priority Available Food Highlight */}
            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl glass-card border border-brand-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Top Priority Surplus Food (Nearest & Urgent)
                </h3>
                <Link to="/dashboard/ngo/available" className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline">
                  View all ({processedAvailable.length}) →
                </Link>
              </div>
              {loading ? loadingState : processedAvailable.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                  No surplus available right now. New donations appear here automatically.
                </p>
              ) : (
                <div className="space-y-2">
                  {processedAvailable.slice(0, 4).map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded border ${d.priorityEval.badgeStyle}`}>
                            {d.priorityEval.badgeLabel}
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">{d.distanceText}</span>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white truncate">{d.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {d.quantity} portions • {d.donorName || 'Donor'} • <span className="text-amber-600 dark:text-amber-400 font-semibold">{d.expiryStatus.formatted}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => handleRejectDonation(d.id, e)}
                          className="px-2.5 py-1.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg flex items-center gap-1 transition-all"
                          title="Reject & hide from your list"
                        >
                          <XIcon className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleClaim(d.id)}
                          disabled={claimingId === d.id}
                          className="px-3 py-1.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg disabled:opacity-50 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{claimingId === d.id ? '...' : 'Accept'}</span>
                        </button>
                      </div>
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
            
            {/* NGO Requirement Details Input Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600/10 via-brand-500/10 to-teal-500/10 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-glow">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                      Enter NGO Food Requirements (Portions & Required Time)
                    </h3>
                    <p className="text-[10px] text-gray-600 dark:text-gray-300">
                      Enter details like required number of persons/portions and required time window to prioritize matching food.
                    </p>
                  </div>
                </div>
                {(requiredPortions || requiredTime) && (
                  <button
                    onClick={() => { setRequiredPortions(''); setRequiredTime(''); }}
                    className="px-2.5 py-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg border border-rose-500/20 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear Requirements
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-6 space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                    <span>Number of Persons / Portions Needed</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Portion Capacity</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      value={requiredPortions}
                      onChange={(e) => setRequiredPortions(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="e.g. 50 persons"
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-bold"
                    />
                    <div className="flex gap-1 shrink-0">
                      {[25, 50, 100, 200].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRequiredPortions(num)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                            requiredPortions === num
                              ? 'bg-emerald-600 text-white shadow-glow'
                              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 space-y-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-gray-100">
                    Food Required Time (Target Window)
                  </label>
                  <input
                    type="datetime-local"
                    value={requiredTime}
                    onChange={(e) => setRequiredTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Active Requirement Status */}
              {(requiredPortions || requiredTime) && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Custom Requirement Match Active:
                  </span>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {requiredPortions && (
                      <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full font-bold">
                        Target: {requiredPortions} meals required
                      </span>
                    )}
                    {requiredTime && (
                      <span className="px-2.5 py-0.5 bg-purple-600 text-white rounded-full font-bold">
                        Needed By: {new Date(requiredTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sort Mode Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-500/10">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-500" /> Priority Mode:
                </span>
                {[
                  { key: 'priority', label: '⚡ Priority Rank (Urgent + Nearest)', icon: Sparkles },
                  { key: 'nearest', label: '📍 Nearest First', icon: MapPin },
                  { key: 'urgent', label: '⏳ Fast Expiring', icon: Clock },
                  { key: 'capacity', label: '🎯 Highest Capacity', icon: Target },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setSortMode(mode.key as any)}
                    className={`px-3 py-1.5 text-[11px] font-extrabold rounded-xl transition-all shrink-0 ${
                      sortMode === mode.key
                        ? 'bg-emerald-600 text-white shadow-glow'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-emerald-500/10'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {rejectedIds.length > 0 && (
                  <button
                    onClick={handleRestoreRejected}
                    className="px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg flex items-center gap-1 transition-all"
                    title="Restore donations you rejected back to your feed"
                  >
                    <RotateCcw className="w-3 h-3" /> Restore Hidden ({rejectedIds.length})
                  </button>
                )}
                <span className="text-[10px] font-bold text-gray-500">
                  {processedAvailable.length} of {available.length} available
                </span>
              </div>
            </div>

            {/* Preferences Filter Collapsible Panel */}
            <details className="group p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
              <summary className="font-bold text-gray-900 dark:text-white cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  Filter by Meal Types & Distance Range
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 space-y-3 pt-2 border-t border-emerald-500/10">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">Max Distance (km)</label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={preferences.maxDistance}
                      onChange={(e) => setPreferences(p => ({ ...p, maxDistance: Math.max(1, parseInt(e.target.value) || 50) }))}
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                      placeholder="50"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
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
                  </div>
                </div>
              </div>
            </details>

            {/* Results Grid */}
            {loading ? loadingState : processedAvailable.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                No surplus food matches your criteria right now. Try adjusting requirement details or distance filters.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {processedAvailable.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-3 cursor-pointer hover:bg-emerald-500/10 transition-all hover:shadow-lg relative overflow-hidden"
                    onClick={() => openDetail(f)}
                  >
                    {/* Priority Match Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border shadow-xs ${f.priorityEval.badgeStyle}`}>
                        {f.priorityEval.badgeLabel}
                      </span>
                      {statusBadge(f.status)}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{f.title}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {f.donorName || 'Anonymous Donor'}{f.itemType ? ` • ${f.itemType}` : ''}
                      </p>
                    </div>

                    {/* Distance & Expiry Pills */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{f.distanceText}</span>
                      </div>
                      <div className={`p-2 rounded-xl border flex items-center gap-1.5 font-bold ${
                        f.expiryStatus.isUrgent
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 animate-pulse'
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}>
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{f.expiryStatus.formatted}</span>
                      </div>
                    </div>

                    {/* Capacity Coverage Status */}
                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-[11px] flex items-center justify-between text-gray-700 dark:text-gray-200">
                      <span className="font-semibold">{f.priorityEval.capacityText}</span>
                      {f.estimatedValue && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          ${f.estimatedValue}/portion
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                      <MapPinIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{f.pickupLocation}</span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-emerald-500/10 gap-2">
                      <button
                        onClick={(e) => handleRejectDonation(f.id, e)}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl flex items-center gap-1 transition-all shrink-0"
                        title="Reject & remove from your NGO list"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hidden sm:flex items-center gap-1">
                          Details <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClaim(f.id); }}
                          disabled={claimingId === f.id}
                          className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-xl shadow-glow disabled:opacity-50 flex items-center gap-1.5 transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{claimingId === f.id ? 'Accepting...' : 'Accept & Book'}</span>
                        </button>
                      </div>
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
              <div className="space-y-4">
                {mine.map((d) => {
                  const driverLat = d.volunteerLatitude || 28.6210;
                  const driverLng = d.volunteerLongitude || 77.2100;
                  const driverLocText = d.volunteerLocationText || 'Near Rajiv Chowk Metro (En Route to Donor)';

                  return (
                    <div
                      key={d.id}
                      onClick={() => openDetail(d)}
                      className="p-4 sm:p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 space-y-3.5 cursor-pointer hover:border-emerald-500/40 transition-all shadow-sm hover:shadow-md"
                    >
                      {/* Top Row: Title, Portions, Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white truncate">{d.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {d.quantity} portions • Donor: <span className="font-bold text-gray-700 dark:text-gray-200">{d.donorName || 'Verified Donor'}</span>
                          </p>
                        </div>
                        {statusBadge(d.status)}
                      </div>

                      {/* Live Order Status Timeline Step Indicator */}
                      <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            Live Delivery Progress
                          </span>
                          <span className="text-gray-500">
                            Pickup Window: {new Date(d.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="grid grid-cols-4 gap-1 text-[9px] font-extrabold text-center">
                          <div className="py-1 px-1 rounded-lg bg-emerald-600 text-white">1. Booked</div>
                          <div className={`py-1 px-1 rounded-lg ${d.assignedVolunteerName ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                            2. Driver Assigned
                          </div>
                          <div className={`py-1 px-1 rounded-lg ${d.status === 'picked_up' || d.status === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                            3. Picked Up
                          </div>
                          <div className={`py-1 px-1 rounded-lg ${d.status === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                            4. Delivered
                          </div>
                        </div>
                      </div>

                      {/* Volunteer Driver Info & Live GPS Box */}
                      {d.assignedVolunteerName ? (
                        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-glow">
                                <Truck className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-extrabold text-gray-900 dark:text-white">{d.assignedVolunteerName}</span>
                                <span className="text-[10px] text-blue-600 dark:text-blue-300 font-bold block">Assigned Volunteer Driver</span>
                              </div>
                            </div>

                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${driverLat},${driverLng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1 shadow-glow transition-all"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              <span>Live Map</span>
                            </a>
                          </div>

                          {/* Driver GPS Location Coordinates */}
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-blue-500/20 flex-wrap gap-1">
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-blue-500" />
                              Driver GPS: {driverLat.toFixed(4)}° N, {driverLng.toFixed(4)}° E
                            </span>
                            <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate max-w-full">
                              📍 {driverLocText}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-between">
                          <span>Awaiting Volunteer Driver Assignment</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAssigningId(d.id);
                              setShowAssignVolunteer(true);
                            }}
                            className="px-3 py-1 text-[11px] font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                          >
                            Assign Driver
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
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

      {/* Food Batch & Donor Geotag Detail Popup Modal */}
      {showDetail && selectedDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="w-full max-w-3xl p-5 sm:p-7 rounded-3xl glass-card border border-emerald-500/30 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/15">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-glow">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    Food Batch & Donor Geotag Details
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Verify batch quality, donor GPS geotag location, and claim surplus.
                  </p>
                </div>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 rounded-xl glass-card text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Donor Info Header Bar */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-brand-500/5 to-teal-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-500/30">
                  {selectedDonation.donorName ? selectedDonation.donorName.charAt(0).toUpperCase() : 'D'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {selectedDonation.donorName || 'Verified Donor'}
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 text-emerald-500" /> Geotag Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Posted on {new Date(selectedDonation.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(selectedDonation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 text-xs font-extrabold uppercase rounded-xl border ${STATUS_STYLES[selectedDonation.status]}`}>
                  {STATUS_LABELS[selectedDonation.status]}
                </span>
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                {selectedDonation.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {selectedDonation.description || 'No additional description provided by donor.'}
              </p>
            </div>

            {/* Specifications Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-0.5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Quantity</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{selectedDonation.quantity} Portions</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-0.5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Meal Type</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{selectedDonation.itemType || 'Prepared Meals'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-0.5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Est. Value</span>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {selectedDonation.estimatedValue ? `$${selectedDonation.estimatedValue}/portion` : 'Free Donation'}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-0.5">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Expiry Status</span>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {getExpiryStatus(selectedDonation.expiryDateTime).formatted}
                </p>
              </div>
            </div>

            {/* DONOR GEOTAG & LOCATION SECTION */}
            <div className="p-4 rounded-2xl glass-card border border-blue-500/30 space-y-3 bg-gradient-to-r from-blue-500/5 via-emerald-500/5 to-transparent">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-glow shrink-0">
                    <MapPinIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                      Donor Geotag Location & Coordinates
                    </h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">Verified pickup GPS point for shelter pickup</p>
                  </div>
                </div>

                {selectedDonation.latitude && selectedDonation.longitude && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDonation.latitude},${selectedDonation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-glow flex items-center gap-1.5 transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Get Directions</span>
                  </a>
                )}
              </div>

              {/* Coordinates Badge */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 font-mono font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>
                    GPS Geotag: {selectedDonation.latitude ? `${selectedDonation.latitude.toFixed(4)}° N, ${selectedDonation.longitude?.toFixed(4)}° E` : '28.6180° N, 77.2050° E'}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">
                  📍 {selectedDonation.address || selectedDonation.pickupLocation}
                </span>
              </div>

              {/* Geotag Interactive Map Preview Box */}
              <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-blue-500/20 shadow-inner bg-gray-100 dark:bg-gray-800">
                <iframe
                  title="Donor Geotag Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight={0}
                  marginWidth={0}
                  src={`https://maps.google.com/maps?q=${selectedDonation.latitude || 28.6180},${selectedDonation.longitude || 77.2050}&z=15&output=embed`}
                  className="w-full h-full rounded-2xl filter contrast-105"
                />
                <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Donor Pickup Geotag Point</span>
                </div>
              </div>
            </div>

            {/* FOOD PHOTO WITH GEOTAG OVERLAY STAMP */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                Food Batch Photo (With Live Geotag Watermark)
              </label>
              {selectedDonation.photoUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/20 shadow-md max-h-72 group">
                  <img
                    src={selectedDonation.photoUrl}
                    alt={selectedDonation.title}
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Geotag Watermark Overlay Banner */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3.5 text-white text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-400 flex items-center gap-1">
                        📍 GPS Geotag Stamp: {selectedDonation.latitude ? `${selectedDonation.latitude.toFixed(4)}, ${selectedDonation.longitude?.toFixed(4)}` : '28.6180, 77.2050'}
                      </span>
                      <span className="text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-md uppercase">
                        Verified Batch
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-200 truncate">
                      {selectedDonation.address || selectedDonation.pickupLocation}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Donor: {selectedDonation.donorName || 'Verified Donor'} • Captured: {new Date(selectedDonation.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-gray-100 dark:bg-gray-800/50 text-center text-xs text-gray-500 dark:text-gray-400 space-y-1 border border-dashed border-gray-300 dark:border-gray-700">
                  <Camera className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="font-bold">No food photo provided by donor</p>
                </div>
              )}
            </div>

            {/* Pickup Window */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" /> Pickup Time Window:
              </span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                {new Date(selectedDonation.pickupWindowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {new Date(selectedDonation.pickupWindowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Estimated Driver Fare Breakdown */}
            {selectedDonation.fare && (
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-amber-700 dark:text-amber-400">Estimated Volunteer Driver Fare</span>
                  <span className="font-black text-base text-amber-700 dark:text-amber-400">₹{selectedDonation.fare}</span>
                </div>
                {selectedDonation.fareBreakdown && (
                  <div className="text-[10px] text-amber-700 dark:text-amber-300 space-y-0.5 pt-1 border-t border-amber-500/20">
                    <div className="flex justify-between"><span>Base pickup fare</span><span>₹{selectedDonation.fareBreakdown.base_fare}</span></div>
                    <div className="flex justify-between"><span>Distance fare ({selectedDonation.fareBreakdown.distance_km} km)</span><span>₹{selectedDonation.fareBreakdown.distance_fare}</span></div>
                    <div className="flex justify-between"><span>Quantity bonus ({selectedDonation.fareBreakdown.quantity} portions)</span><span>₹{selectedDonation.fareBreakdown.quantity_fare}</span></div>
                    <div className="flex justify-between font-bold border-t border-amber-500/30 pt-1"><span>Total Driver Payout</span><span>₹{selectedDonation.fare}</span></div>
                  </div>
                )}
              </div>
            )}

            {/* Volunteer Driver Assigned Info & Live GPS Map Box */}
            {selectedDonation.assignedVolunteerName && (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-glow">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        Volunteer Driver Live Tracking
                      </p>
                      <p className="font-extrabold text-sm text-gray-900 dark:text-white">{selectedDonation.assignedVolunteerName}</p>
                    </div>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDonation.volunteerLatitude || 28.6210},${selectedDonation.volunteerLongitude || 77.2100}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-glow flex items-center gap-1.5 transition-all"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Open Live Map</span>
                  </a>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-mono space-y-0.5">
                  <p className="font-bold text-blue-800 dark:text-blue-200">
                    📍 Driver GPS: {selectedDonation.volunteerLatitude ? `${selectedDonation.volunteerLatitude.toFixed(4)}° N, ${selectedDonation.volunteerLongitude?.toFixed(4)}° E` : '28.6210° N, 77.2100° E'}
                  </p>
                  <p className="text-[10px] text-gray-600 dark:text-gray-300">
                    Location: {selectedDonation.volunteerLocationText || 'Near Rajiv Chowk Metro (En Route)'}
                  </p>
                </div>

                {/* Driver Tracking Map Embed */}
                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-blue-500/20 bg-gray-100 dark:bg-gray-800">
                  <iframe
                    title="Driver GPS Live Tracking"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    src={`https://maps.google.com/maps?q=${selectedDonation.volunteerLatitude || 28.6210},${selectedDonation.volunteerLongitude || 77.2100}&z=15&output=embed`}
                    className="w-full h-full filter contrast-105"
                  />
                  <div className="absolute top-2 left-2 bg-blue-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Driver Realtime GPS
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-emerald-500/15">
              <button
                type="button"
                onClick={() => {
                  setActiveChatDonation(selectedDonation);
                  closeDetail();
                }}
                className="py-3 px-4 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold text-xs border border-brand-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Order Chat ({selectedDonation.messages?.length || 0})</span>
              </button>
              {(selectedDonation.status === 'claimed' || selectedDonation.status === 'picked_up') && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveQrDonation({ donation: selectedDonation, mode: 'scan', actionType: 'delivery' });
                    closeDetail();
                  }}
                  className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-glow flex items-center justify-center gap-1.5 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Verify Delivery (QR/PIN)</span>
                </button>
              )}
              <button
                type="button"
                onClick={closeDetail}
                className="flex-1 py-3 px-4 rounded-xl glass-card font-bold text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Close
              </button>

              {selectedDonation.status === 'available' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleRejectDonation(selectedDonation.id);
                      closeDetail();
                    }}
                    className="py-3 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <XIcon className="w-4 h-4" />
                    Reject & Hide
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleClaim(selectedDonation.id);
                      closeDetail();
                    }}
                    disabled={claimingId === selectedDonation.id}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-black shadow-glow hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {claimingId === selectedDonation.id ? 'Accepting Batch...' : 'Accept & Book Batch for NGO'}
                  </button>
                </>
              )}

              {selectedDonation.status === 'claimed' && !selectedDonation.assignedVolunteerId && (
                <button
                  type="button"
                  onClick={() => {
                    setAssigningId(selectedDonation.id);
                    setShowAssignVolunteer(true);
                    closeDetail();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-xs font-black shadow-glow flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign Volunteer Driver
                </button>
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

      {/* Edit NGO Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-4 sm:p-6 rounded-3xl glass-card border border-emerald-500/30 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                Update NGO Location
              </h3>
              <button onClick={() => setShowLocationModal(false)} className="p-1.5 rounded-lg glass-card">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300">
              Enter your shelter/NGO's address or GPS coordinates to calculate precise distance & priorities for nearby food.
            </p>

            <form onSubmit={handleSaveCustomLocation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Location Address / Area Name</label>
                <input
                  type="text"
                  required
                  value={customAddr}
                  onChange={(e) => setCustomAddr(e.target.value)}
                  placeholder="e.g., Shelter 4, Connaught Place, New Delhi"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 text-gray-900 dark:text-gray-100">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300">
                💡 You can also click <strong>"Detect GPS"</strong> on the main dashboard to use your browser's real-time location.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 py-3 rounded-xl glass-card font-bold text-gray-700 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold shadow-glow"
                >
                  Save Location
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Floating AI Assistant for NGOs */}
      <AIAssistantModal role="ngo" />

      {/* Floating Voice & Audio Notification Controls */}
      <VoiceAlertWidget role="ngo" />

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
                <XIcon className="w-5 h-5" />
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
                  placeholder="e.g. Shelter demand adjustment / Logistics help"
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