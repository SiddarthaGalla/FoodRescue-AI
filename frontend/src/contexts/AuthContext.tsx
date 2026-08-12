import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { User, UserRole, AuthResponse } from '../types/auth';
import { apiRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<UserRole>;
  register: (userData: any) => Promise<UserRole>;
  sendOTP: (target: string) => Promise<string>;
  loginWithOTP: (target: string, otp: string, role?: UserRole, name?: string) => Promise<UserRole>;
  loginWithGoogle: (email: string, name: string, role?: UserRole, profileImage?: string) => Promise<UserRole>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('foodrescue_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('foodrescue_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  useEffect(() => {
    if (!clerkEnabled) {
      const init = async () => {
        if (token) {
          try {
            const data = await apiRequest<User>('/auth/me');
            setUser(data);
            localStorage.setItem('foodrescue_user', JSON.stringify(data));
          } catch {
            setToken(null);
            localStorage.removeItem('foodrescue_token');
            localStorage.removeItem('foodrescue_user');
          }
        }
        setIsLoading(false);
      };
      init();
      return;
    }

    if (!isLoaded) return;
    const sync = async () => {
      try {
        if (isSignedIn && clerkUser) {
          const clerkToken = await getToken();
          if (clerkToken) {
            const name = clerkUser.fullName || clerkUser.firstName || clerkUser.emailAddresses?.[0]?.emailAddress || 'Clerk User';
            const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
            const picture = clerkUser.imageUrl || undefined;
            const derivedRole: UserRole = 'donor'; // Clerk role derived from JWT claims server-side; default here
            const clerkUserShape: User = {
              id: clerkUser.id,
              name,
              email,
              phone: (clerkUser as any)?.phoneNumbers?.[0]?.phoneNumber || undefined,
              role: derivedRole,
              profileImage: picture,
              isVerified: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setToken(clerkToken);
            setUser(clerkUserShape);
            localStorage.setItem('foodrescue_token', clerkToken);
            localStorage.setItem('foodrescue_user', JSON.stringify(clerkUserShape));
          }
        } else {
          setToken(null);
          setUser(null);
          localStorage.removeItem('foodrescue_token');
          localStorage.removeItem('foodrescue_user');
        }
      } catch (e) {
        console.error('Clerk sync error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    sync();
  }, [isLoaded, isSignedIn, clerkUser]);

  const login = async (credentials: any): Promise<UserRole> => {
    return 'donor'; // Clerk uses hosted sign-in; handled by Clerk SDK in Login component
  };
  const register = async (userData: any): Promise<UserRole> => {
    return 'donor'; // Clerk uses hosted sign-up
  };
  const sendOTP = async (target: string): Promise<string> => {
    const res = await apiRequest<{ message: string; demo_otp?: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ target }),
    });
    return res.demo_otp || '123456';
  };
  const loginWithOTP = async (target: string, otp: string, role?: UserRole, name?: string): Promise<UserRole> => {
    const res = await apiRequest<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ target, otp, role, name }),
    });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('foodrescue_token', res.access_token);
    localStorage.setItem('foodrescue_user', JSON.stringify(res.user));
    return res.user.role;
  };
  const loginWithGoogle = async (email: string, name: string, role?: UserRole, profileImage?: string): Promise<UserRole> => {
    const res = await apiRequest<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ email, name, role, profileImage }),
    });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('foodrescue_token', res.access_token);
    localStorage.setItem('foodrescue_user', JSON.stringify(res.user));
    return res.user.role;
  };
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('foodrescue_token');
    localStorage.removeItem('foodrescue_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: clerkEnabled ? isSignedIn : !!user && !!token,
        login,
        register,
        sendOTP,
        loginWithOTP,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
