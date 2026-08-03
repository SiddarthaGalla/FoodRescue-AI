export type UserRole = 'admin' | 'donor' | 'ngo' | 'volunteer';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  profileImage?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
