export type AdminRequestStatus = 'pending' | 'approved' | 'rejected' | 'none';

export interface AdminStats {
  totalUsers: number;
  donors: number;
  ngos: number;
  volunteers: number;
  admins: number;
  totalDonations: number;
  availableDonations: number;
  claimedDonations?: number;
  deliveredDonations: number;
  rejectedDonations?: number;
  totalPortionsDonated?: number;
  deliveredPortions: number;
  estimatedValueRescued?: number;
  co2TonsSaved: number;
  openSupportTickets?: number;
  pendingAdminRequests?: number;
  taxValueSaved?: number;
  statusBreakdown?: Record<string, number>;
  categoryBreakdown?: Record<string, number>;
  monthlyRescueTrends?: Array<{ month: string; donated: number; delivered: number; rejected: number }>;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  profileImage?: string;
  createdAt?: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  subject: string;
  message: string;
  status: string;
  userEmail?: string;
  createdAt?: string;
}

export interface AdminRequest {
  id: string;
  userId?: string;
  userEmail: string;
  userName: string;
  requestedRole?: string;
  reason?: string;
  status: AdminRequestStatus;
  phone?: string;
  note?: string;
  createdAt?: string;
}
