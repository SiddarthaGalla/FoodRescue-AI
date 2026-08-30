export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng points.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance in km to clean text string.
 */
export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined || !isFinite(distanceKm)) {
    return 'Distance unavailable';
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

export interface ExpiryStatus {
  formatted: string;
  isExpired: boolean;
  isUrgent: boolean; // < 2 hours
  hoursRemaining: number;
  minutesRemaining: number;
}

/**
 * Calculates formatted time remaining until expiry.
 */
export function getExpiryStatus(expiryDateTime?: string): ExpiryStatus {
  if (!expiryDateTime) {
    return {
      formatted: 'No expiry listed',
      isExpired: false,
      isUrgent: false,
      hoursRemaining: 999,
      minutesRemaining: 99999,
    };
  }

  const expiry = new Date(expiryDateTime).getTime();
  const now = Date.now();
  const diffMs = expiry - now;

  if (diffMs <= 0) {
    return {
      formatted: 'Expired',
      isExpired: true,
      isUrgent: true,
      hoursRemaining: 0,
      minutesRemaining: 0,
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const isUrgent = totalMinutes <= 120; // 2 hours

  let formatted = '';
  if (hours > 0) {
    formatted = `Expires in ${hours}h ${mins}m`;
  } else {
    formatted = `Expires in ${mins} mins`;
  }

  return {
    formatted,
    isExpired: false,
    isUrgent,
    hoursRemaining: hours,
    minutesRemaining: totalMinutes,
  };
}

export interface NgoRequirements {
  requiredPortions?: number; // Number of persons or portions needed
  requiredTime?: string; // Target time string (e.g. ISO string or "HH:mm")
}

export interface PriorityMatch {
  score: number; // Higher is better
  badgeLabel: string;
  badgeStyle: string;
  capacityText: string;
  timeMatchText: string;
  isIdealMatch: boolean;
}

/**
 * Evaluates match priority score based on NGO Location & Requirements.
 */
export function evaluateDonationPriority(
  donation: {
    quantity: number;
    expiryDateTime?: string;
    pickupWindowStart?: string;
    pickupWindowEnd?: string;
    latitude?: number;
    longitude?: number;
  },
  ngoLocation?: Coordinates | null,
  requirements?: NgoRequirements
): PriorityMatch {
  let score = 100;
  const reqPortions = requirements?.requiredPortions;
  const reqTime = requirements?.requiredTime;

  // 1. Portion / Capacity match
  let capacityText = `${donation.quantity} portions available`;
  if (reqPortions && reqPortions > 0) {
    const coveragePercent = Math.min(100, Math.round((donation.quantity / reqPortions) * 100));
    if (donation.quantity >= reqPortions) {
      score += 50 + Math.min(20, donation.quantity - reqPortions);
      capacityText = `✅ Covers 100% (${donation.quantity}/${reqPortions} required)`;
    } else {
      score += (coveragePercent / 100) * 30;
      capacityText = `⚠️ Partial coverage: ${coveragePercent}% (${donation.quantity}/${reqPortions} required)`;
    }
  }

  // 2. Expiry urgency (Fast expiring food rescue priority)
  const expiryStatus = getExpiryStatus(donation.expiryDateTime);
  if (expiryStatus.isExpired) {
    score -= 1000;
  } else if (expiryStatus.isUrgent) {
    score += 40; // High priority for urgent rescue
  } else {
    // Reward earlier expiry slightly over distant expiry to prevent food waste
    score += Math.max(0, 30 - expiryStatus.hoursRemaining);
  }

  // 3. Proximity score (nearest first)
  let distanceKm: number | null = null;
  if (ngoLocation && donation.latitude && donation.longitude) {
    distanceKm = haversineDistance(
      ngoLocation.lat,
      ngoLocation.lng,
      donation.latitude,
      donation.longitude
    );
    // Deduct points for greater distance
    score -= Math.min(50, distanceKm * 2);
  }

  // 4. Time requirement match
  let timeMatchText = '';
  if (reqTime && donation.pickupWindowEnd) {
    const reqTimestamp = new Date(reqTime).getTime();
    const windowEndTimestamp = new Date(donation.pickupWindowEnd).getTime();
    if (!isNaN(reqTimestamp) && windowEndTimestamp >= reqTimestamp) {
      score += 25;
      timeMatchText = '⏱️ Matches required timeframe';
    } else if (!isNaN(reqTimestamp)) {
      timeMatchText = '⚠️ Pickup window ends before required time';
    }
  }

  // Determine Badge Styling & Label
  let badgeLabel = 'Standard Match';
  let badgeStyle = 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20';
  let isIdealMatch = false;

  if (score >= 150) {
    badgeLabel = '⚡ Top Match (Urgent & Ideal Capacity)';
    badgeStyle = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    isIdealMatch = true;
  } else if (expiryStatus.isUrgent) {
    badgeLabel = '⏳ Urgent Rescue (Expiring Soon)';
    badgeStyle = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
  } else if (distanceKm !== null && distanceKm <= 2) {
    badgeLabel = '📍 Nearby Donation';
    badgeStyle = 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
  } else if (reqPortions && donation.quantity >= reqPortions) {
    badgeLabel = '🎯 Capacity Fit';
    badgeStyle = 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
  }

  return {
    score,
    badgeLabel,
    badgeStyle,
    capacityText,
    timeMatchText,
    isIdealMatch,
  };
}
