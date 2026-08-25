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

let pendingSupabaseRole: UserRole | undefined =
  (localStorage.getItem('pendingSupabaseRole') as UserRole) || undefined;

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
    let mounted = true;

    // Safety timeout - ensure loading never stuck
    const safetyTimer = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 3000);

    // Restore from localStorage first (works for all auth modes)
    const savedToken = localStorage.getItem('foodrescue_token');
    const savedUserStr = localStorage.getItem('foodrescue_user');

    const validateToken = async (token: string) => {
      try {
        const res = await apiRequest<{ user: any }>('/auth/me');
        return res.user;
      } catch (e) {
        return null;
      }
    };

    // Use an async IIFE to handle token validation
    (async () => {
      if (savedToken && savedUserStr) {
        try {
          const parsedUser = JSON.parse(savedUserStr);
          if (mounted) {
            setToken(savedToken);
            setUser(parsedUser);
          }
          // Validate token with backend; clear if invalid
          const validUser = await validateToken(savedToken);
          if (mounted) {
            if (!validUser) {
              setToken(null);
              setUser(null);
              localStorage.removeItem('foodrescue_token');
              localStorage.removeItem('foodrescue_user');
            } else {
              // Update user with fresh data from backend
              setUser(validUser);
              localStorage.setItem('foodrescue_user', JSON.stringify(validUser));
            }
          }
        } catch (e) {
          console.warn('Failed to parse saved user from localStorage', e);
        }
      } else if (mounted) {
        setIsLoading(false);
      }
    })();

    // Supabase background sync — only exchange if returning from OAuth (pending role)
    if (supabaseEnabled && supabase) {
      const pending = localStorage.getItem('pendingSupabaseRole') as UserRole | null;
      if (pending) {
        exchangeSupabaseSession(pending).catch(() => {});
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          const newPending = localStorage.getItem('pendingSupabaseRole') as UserRole | null;
          exchangeSupabaseSession(newPending ?? undefined).catch(console.error);
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setToken(null);
            setUser(null);
            localStorage.removeItem('foodrescue_token');
            localStorage.removeItem('foodrescue_user');
          }
        }
      });
      if (!mounted) return;
      return () => subscription.unsubscribe();
    }

    // If no token to validate, stop loading immediately
    if (!savedToken && mounted) setIsLoading(false);

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
    };
  }, []);

  const exchangeSupabaseSession = async (role?: UserRole): Promise<UserRole> => {
    if (!supabase) throw new Error('Supabase is not configured');
    if (role) {
      pendingSupabaseRole = role;
      localStorage.setItem('pendingSupabaseRole', role);
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('No active Supabase session');
    const res = await apiRequest<AuthResponse>('/auth/supabase', {
      method: 'POST',
      body: JSON.stringify({
        token: data.session.access_token,
        ...(pendingSupabaseRole ? { role: pendingSupabaseRole } : {}),
      }),
    });
    const requested = pendingSupabaseRole;
    pendingSupabaseRole = undefined;
    localStorage.removeItem('pendingSupabaseRole');
    if (requested && res.user.role !== requested) {
      // Never accept a silent role downgrade — surface it so the login page
      // stays on the chosen role instead of bouncing to another dashboard.
      const msg = requested === 'admin'
        ? 'Admin access requires approval from the platform owner. Request access from your dashboard, then sign in again once approved.'
        : `Your account is not authorized for the ${requested} role.`;
      throw new Error(msg);
    }
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
      return exchangeSupabaseSession(credentials.role);
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
      throw err;
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
      throw err;
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
      if (data.session) return exchangeSupabaseSession(userData.role);
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
    const isPhone = target.startsWith('+');
    // Phone OTP always uses our backend (Twilio SMS). Email OTP uses Supabase
    // when enabled, else the backend. The code is NEVER returned to the client.
    if (!isPhone && supabaseEnabled && supabase) {
      const { error } = await supabase.auth.signInWithOtp({ email: target });
      if (error) throw new Error(error.message);
      return 'sent';
    }
    const res = await apiRequest<{ message: string; expires_in_minutes?: number }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ target }),
    });
    return res.message || 'sent';
  };

  const loginWithOTP = async (target: string, otp: string, role?: UserRole, name?: string): Promise<UserRole> => {
    const isPhone = target.startsWith('+');
    if (!isPhone && supabaseEnabled && supabase) {
      const { error } = await supabase.auth.verifyOtp({ email: target, token: otp, type: 'email' });
      if (error) throw new Error(error.message);
      return exchangeSupabaseSession(role);
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
      if (role) {
        pendingSupabaseRole = role;
        localStorage.setItem('pendingSupabaseRole', role);
      }
      const { data: existingSession } = await supabase.auth.getSession();
      if (existingSession.session) {
        return exchangeSupabaseSession(role);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: `${window.location.origin}/login`,
          queryParams: { prompt: 'select_account' }
        },
      });
      if (error) throw new Error(error.message);
      return exchangeSupabaseSession(role);
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
