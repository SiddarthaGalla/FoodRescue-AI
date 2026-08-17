export type DonationStatus = 'available' | 'claimed' | 'picked_up' | 'delivered' | 'cancelled';

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
  estimatedValue?: number;
  donorId: string;
  donorName?: string;
  status: DonationStatus;
  claimedBy?: string;
  claimedByName?: string;
  assignedVolunteerId?: string;
  assignedVolunteerName?: string;
  createdAt: string;
  updatedAt: string;
}
