import { Donation } from '../types/donation';
import { haversineDistance } from './geo';

export interface Waypoint {
  stepIndex: number;
  type: 'start' | 'pickup' | 'dropoff';
  donationId?: string;
  title: string;
  locationName: string;
  latitude: number;
  longitude: number;
  portions?: number;
  urgencyText?: string;
  distanceFromPrevKm: number;
  cumulativeDistanceKm: number;
  estimatedMinutesFromPrev: number;
}

export interface OptimizedRoute {
  waypoints: Waypoint[];
  totalDistanceKm: number;
  totalMinutes: number;
  totalPortions: number;
  totalDriverFare: number;
  googleMapsUrl: string;
}

/**
 * Multi-Stop Route Optimizer
 * Uses a greedy nearest-neighbor TSP algorithm weighted by fast-expiring urgency
 * to sequence multiple food pickups and shelter dropoffs into a single trip.
 */
export function optimizeMultiStopRoute(
  driverLoc: { lat: number; lng: number },
  donations: Donation[]
): OptimizedRoute | null {
  if (!donations || donations.length === 0) return null;

  const active = donations.filter((d) => d.status === 'claimed' || d.status === 'picked_up');
  if (active.length === 0) return null;

  const waypoints: Waypoint[] = [];
  let currentLat = driverLoc.lat;
  let currentLng = driverLoc.lng;
  let cumulativeKm = 0;

  // Add Start Location (Driver GPS)
  waypoints.push({
    stepIndex: 1,
    type: 'start',
    title: 'Driver Current Location',
    locationName: 'Start Point (GPS Active)',
    latitude: currentLat,
    longitude: currentLng,
    distanceFromPrevKm: 0,
    cumulativeDistanceKm: 0,
    estimatedMinutesFromPrev: 0,
  });

  // Pickups to process
  const remainingPickups = [...active];
  const totalPortions = active.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const totalDriverFare = active.reduce((sum, d) => sum + (d.fare || (50 + (d.quantity || 0) * 2)), 0);

  // Sequence Pickups (Urgency + Distance weighted)
  while (remainingPickups.length > 0) {
    let bestIndex = 0;
    let bestScore = Infinity;

    for (let i = 0; i < remainingPickups.length; i++) {
      const d = remainingPickups[i];
      const pLat = d.latitude || 28.6180;
      const pLng = d.longitude || 77.2050;
      const dist = haversineDistance(currentLat, currentLng, pLat, pLng);

      // Urgency weight (expiring soon gets higher priority)
      let urgencyPenalty = 0;
      if (d.expiryDateTime) {
        const hoursLeft = (new Date(d.expiryDateTime).getTime() - Date.now()) / (1000 * 3600);
        if (hoursLeft < 2) urgencyPenalty = -5; // bonus priority
      }

      const score = dist + urgencyPenalty;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    const chosen = remainingPickups.splice(bestIndex, 1)[0];
    const pLat = chosen.latitude || 28.6180;
    const pLng = chosen.longitude || 77.2050;
    const legDist = haversineDistance(currentLat, currentLng, pLat, pLng);
    cumulativeKm += legDist;
    const legMins = Math.round((legDist / 25) * 60) + 5; // 25 km/h avg city speed + 5 min loading

    waypoints.push({
      stepIndex: waypoints.length + 1,
      type: 'pickup',
      donationId: chosen.id,
      title: `Pickup: ${chosen.title}`,
      locationName: chosen.address || chosen.pickupLocation,
      latitude: pLat,
      longitude: pLng,
      portions: chosen.quantity,
      urgencyText: chosen.expiryDateTime ? `Expiring ${new Date(chosen.expiryDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : undefined,
      distanceFromPrevKm: Math.round(legDist * 10) / 10,
      cumulativeDistanceKm: Math.round(cumulativeKm * 10) / 10,
      estimatedMinutesFromPrev: legMins,
    });

    currentLat = pLat;
    currentLng = pLng;
  }

  // Add Dropoff Location (NGO Shelter)
  const lastDonation = active[active.length - 1];
  const dropLat = 28.6139; // NGO shelter default
  const dropLng = 77.2090;
  const finalLegDist = haversineDistance(currentLat, currentLng, dropLat, dropLng);
  cumulativeKm += finalLegDist;
  const finalLegMins = Math.round((finalLegDist / 25) * 60) + 8;

  waypoints.push({
    stepIndex: waypoints.length + 1,
    type: 'dropoff',
    title: `Dropoff: ${lastDonation?.claimedByName || 'Central Shelter NGO'}`,
    locationName: 'Central NGO Dropoff Hub (Shelter)',
    latitude: dropLat,
    longitude: dropLng,
    portions: totalPortions,
    distanceFromPrevKm: Math.round(finalLegDist * 10) / 10,
    cumulativeDistanceKm: Math.round(cumulativeKm * 10) / 10,
    estimatedMinutesFromPrev: finalLegMins,
  });

  const totalMinutes = waypoints.reduce((sum, w) => sum + w.estimatedMinutesFromPrev, 0);

  // Generate Google Maps Turn-by-Turn Multi-Stop URL
  const originStr = `${driverLoc.lat},${driverLoc.lng}`;
  const destStr = `${dropLat},${dropLng}`;
  const waypointsStr = waypoints
    .filter((w) => w.type === 'pickup')
    .map((w) => `${w.latitude},${w.longitude}`)
    .join('|');

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&waypoints=${waypointsStr}`;

  return {
    waypoints,
    totalDistanceKm: Math.round(cumulativeKm * 10) / 10,
    totalMinutes,
    totalPortions,
    totalDriverFare: Math.round(totalDriverFare),
    googleMapsUrl,
  };
}
