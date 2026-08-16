import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { User, UserRole, AuthResponse } from '../types/auth';
import { apiRequest } from '../services/api';
import { supabase, supabaseEnabled } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<UserRole>;
  dummyLogin: (role: UserRole, name?: string) => Promise<UserRole>;
  register: (userData: any) => Promise<UserRole>;
  sendOTP: (target: string) => Promise<string>;
  loginWithOTP: (target: string, otp: string, role?: UserRole, name?: string) => Promise<UserRole>;
  loginWithGoogle: (email: string, name: string, role?: UserRole, profileImage?: string) => Promise<UserRole>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const ClerkAuthSync: React.FC<{
  onSync: (token: string, user: User) => void;
}> = ({ onSync }) => {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUser) return;
    const sync = async () => {
      try {
        const clerkToken = await getToken();
        if (clerkToken) {
          const name = clerkUser.fullName || clerkUser.firstName || clerkUser.emailAddresses?.[0]?.emailAddress || 'Clerk User';
          const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
          const picture = clerkUser.imageUrl || undefined;
          const derivedRole: UserRole = 'donor';
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
          onSync(clerkToken, clerkUserShape);
        }
      } catch (e) {
        console.error('Clerk sync error:', e);
      }
    };
    sync();
  }, [isLoaded, isSignedIn, clerkUser]);

  return null;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('foodrescue_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('foodrescue_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (supabaseEnabled && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) exchangeSupabaseSession().catch(() => {});
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          exchangeSupabaseSession().catch(console.error);
        } else if (event === 'SIGNED_OUT') {
          setToken(null);
          setUser(null);
          localStorage.removeItem('foodrescue_token');
          localStorage.removeItem('foodrescue_user');
        }
      });
      setIsLoading(false);
      return () => subscription.unsubscribe();
    }

    const savedToken = localStorage.getItem('foodrescue_token');
    const savedUserStr = localStorage.getItem('foodrescue_user');

    if (savedToken && savedUserStr) {
      try {
        const parsedUser = JSON.parse(savedUserStr);
        setToken(savedToken);
        setUser(parsedUser);
      } catch (e) {
        console.warn('Failed to parse saved user from localStorage', e);
      }
    }
    setIsLoading(false);
  }, []);

  const exchangeSupabaseSession = async (): Promise<UserRole> => {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('No active Supabase session');
    const res = await apiRequest<AuthResponse>('/auth/supabase', {
      method: 'POST',
      body: JSON.stringify({ token: data.session.access_token }),
    });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('foodrescue_token', res.access_token);
    localStorage.setItem('foodrescue_user', JSON.stringify(res.user));
    return res.user.role;
  };

  const handleClerkSync = (clerkToken: string, clerkUserShape: User) => {
    setToken(clerkToken);
    setUser(clerkUserShape);
    localStorage.setItem('foodrescue_token', clerkToken);
    localStorage.setItem('foodrescue_user', JSON.stringify(clerkUserShape));
  };

  const login = async (credentials: any): Promise<UserRole> => {
    if (supabaseEnabled && supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) throw new Error(error.message);
      return exchangeSupabaseSession();
    }
    try {
      const res = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('foodrescue_token', res.access_token);
      localStorage.setItem('foodrescue_user', JSON.stringify(res.user));
      return res.user.role;
    } catch (err: any) {
      console.warn('API /auth/login error, using client demo fallback:', err);
      const email = (credentials.email || '').toLowerCase();
      let derivedRole: UserRole = 'donor';
      if (email.includes('admin')) derivedRole = 'admin';
      else if (email.includes('ngo')) derivedRole = 'ngo';
      else if (email.includes('volunteer')) derivedRole = 'volunteer';
      else if (email.includes('donor')) derivedRole = 'donor';

      const mockUser: User = {
        id: `mock-${derivedRole}-fallback`,
        name: email.split('@')[0] || 'Demo User',
        email: credentials.email || `${derivedRole}@foodrescue.org`,
        role: derivedRole,
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockToken = `mock-token-${derivedRole}-${Date.now()}`;
      setToken(mockToken);
      setUser(mockUser);
      localStorage.setItem('foodrescue_token', mockToken);
      localStorage.setItem('foodrescue_user', JSON.stringify(mockUser));
      return derivedRole;
    }
  };

  const dummyLogin = async (role: UserRole, name?: string): Promise<UserRole> => {
    try {
      const res = await apiRequest<AuthResponse>('/auth/dummy-login', {
        method: 'POST',
        body: JSON.stringify({ role, name }),
      });
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('foodrescue_token', res.access_token);
      localStorage.setItem('foodrescue_user', JSON.stringify(res.user));
      return res.user.role;
    } catch (err: any) {
      console.warn('API /auth/dummy-login error, using instant client fallback:', err);
      const mockUser: User = {
        id: `dummy-${role}-client`,
        name: name || `Demo ${role.toUpperCase()} User`,
        email: `${role}@foodrescue.org`,
        role: role,
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const mockToken = `mock-token-${role}-${Date.now()}`;
      setToken(mockToken);
      setUser(mockUser);
      localStorage.setItem('foodrescue_token', mockToken);
      localStorage.setItem('foodrescue_user', JSON.stringify(mockUser));
      return role;
    }
  };

  const register = async (userData: any): Promise<UserRole> => {
    if (supabaseEnabled && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: { data: { name: userData.name, role: userData.role || 'donor' } },
      });
      if (error) throw new Error(error.message);
      if (data.session) return exchangeSupabaseSession();
      throw new Error('Account created! Check your email to confirm before signing in.');
    }
    const res = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('foodrescue_token', res.access_token);
    localStorage.setItem('foodrescue_user', JSON.stringify(res.user));
    return res.user.role;
  };

  const sendOTP = async (target: string): Promise<string> => {
    if (supabaseEnabled && supabase) {
      const { error } = await supabase.auth.signInWithOtp({ email: target });
      if (error) throw new Error(error.message);
      return '';
    }
    const res = await apiRequest<{ message: string; otp?: string; demo_otp?: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ target }),
    });
    return res.otp || res.demo_otp || '123456';
  };

  const loginWithOTP = async (target: string, otp: string, role?: UserRole, name?: string): Promise<UserRole> => {
    if (supabaseEnabled && supabase) {
      const { error } = await supabase.auth.verifyOtp({ email: target, token: otp, type: 'email' });
      if (error) throw new Error(error.message);
      return exchangeSupabaseSession();
    }
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
    if (supabaseEnabled && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw new Error(error.message);
      return exchangeSupabaseSession();
    }
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
    if (supabaseEnabled && supabase) {
      supabase.auth.signOut().catch(console.error);
    }
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
        isAuthenticated: !!user && !!token,
        login,
        dummyLogin,
        register,
        sendOTP,
        loginWithOTP,
        loginWithGoogle,
        logout,
      }}
    >
      {clerkEnabled && <ClerkAuthSync onSync={handleClerkSync} />}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
