export type AdminRequestStatus = 'pending' | 'approved' | 'rejected' | 'none';

export interface AdminStats {
  totalUsers: number;
  donors: number;
  ngos: number;
  volunteers: number;
  admins: number;
  totalDonations: number;
  availableDonations: number;
  deliveredDonations: number;
  deliveredPortions: number;
  co2TonsSaved: number;
  openSupportTickets: number;
  pendingAdminRequests: number;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profileImage?: string;
  createdAt?: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: string;
  userEmail?: string;
  createdAt?: string;
}

export interface AdminRequest {
  id: string;
  userEmail: string;
  userName: string;
  status: AdminRequestStatus;
  phone?: string;
  note?: string;
  createdAt?: string;
}
