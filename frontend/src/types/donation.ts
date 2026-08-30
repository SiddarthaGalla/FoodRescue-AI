export type DonationStatus = 'available' | 'claimed' | 'picked_up' | 'delivered' | 'cancelled';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
}

export interface Donation {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  itemType?: string;
  expiryDateTime?: string;
  pickupLocation: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  photoUrl?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  dropoffLocation?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  estimatedValue?: number;
  donorId?: string;
  donorName?: string;
  donorPhone?: string;
  temperature?: string;
  foodSafetyPassed?: boolean;
  claimedByNgoName?: string;
  volunteerName?: string;
  status: DonationStatus;
  claimedBy?: string;
  claimedByName?: string;
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  volunteerLatitude?: number;
  volunteerLongitude?: number;
  volunteerLocationText?: string;
  volunteerLastUpdated?: string;
  messages?: ChatMessage[];
  verificationPin?: string;
  qrCodeToken?: string;
  proofOfDeliveryAt?: string;
  fare?: number;
  temperatureCelsius?: number;
  containerSealVerified?: boolean;
  haccpPassed?: boolean;
  fareBreakdown?: {
    base_fare: number;
    distance_km: number;
    distance_fare: number;
    quantity: number;
    per_portion_rate: number;
    quantity_fare: number;
    time_multiplier: number;
    urgency_multiplier: number;
    subtotal_before_fee: number;
    platform_fee_percent: number;
    platform_fee: number;
    total_fare: number;
  };
  createdAt: string;
  updatedAt?: string;
}
