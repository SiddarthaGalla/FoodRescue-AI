import React, { createContext, useContext, useState, useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
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

// Kinde feature flag — must match the conditional <KindeProvider> in main.tsx:
// Kinde is only used when BOTH domain and client id are configured. With the
// env vars absent, every Kinde branch below is skipped and the legacy dev
// auth (email/password, OTP, Google) keeps working untouched.
const kindeEnabled = !!import.meta.env.VITE_KINDE_DOMAIN && !!import.meta.env.VITE_KINDE_CLIENT_ID;

const APP_ROLES: UserRole[] = ['admin', 'donor', 'ngo', 'volunteer'];

/**
 * Decode the payload of a JWT (middle segment, base64url) without any library.
 * Used to read the Kinde access token's `permissions` claim.
 */
const decodeJwtPayload = (token: string): Record<string, unknown> => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return {};
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
};

/**
 * App role = first match of ["admin","donor","ngo","volunteer"] inside the
 * Kinde token's `permissions` claim; falls back to 'donor'.
 */
const deriveRoleFromToken = (token: string): UserRole => {
  const payload = decodeJwtPayload(token);
  const permissions = payload?.permissions;
  const list = Array.isArray(permissions) ? (permissions as string[]) : [];
  const match = APP_ROLES.find((role) => list.includes(role));
  return match || 'donor';
};

/**
 * Build the app's User shape from a Kinde profile + access token.
 * The Kinde SDK's User type only declares id/given_name/family_name/email/
 * picture, but the runtime profile also carries name/phone_number — hence the
 * cast while reading those.
 */
const buildKindeUser = (kindeUser: any, token: string): User => {
  const name =
    kindeUser?.name ||
    [kindeUser?.given_name, kindeUser?.family_name].filter(Boolean).join(' ') ||
    kindeUser?.email ||
    'Kinde User';
  const now = new Date().toISOString();
  return {
    id: kindeUser?.id || '',
    name,
    email: kindeUser?.email || '',
    phone: kindeUser?.phone_number || undefined,
    role: deriveRoleFromToken(token),
    profileImage: kindeUser?.picture || undefined,
    isVerified: true,
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * useKindeAuth() throws when no <KindeProvider> is mounted above. Guard it so
 * the app never crashes on the legacy path. `kindeEnabled` is a module-level
 * constant, so the hook call order stays stable across renders.
 */
const useKindeAuthSafe = () => {
  if (!kindeEnabled) return null;
  try {
    return useKindeAuth();
  } catch (error) {
    console.warn('Kinde auth unavailable; falling back to legacy dev auth.', error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('foodrescue_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('foodrescue_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const kinde = useKindeAuthSafe();

  // Legacy dev-auth session restore — only runs when Kinde is NOT configured.
  useEffect(() => {
    if (kindeEnabled) return;
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await apiRequest<User>('/auth/me');
          setUser(userData);
          localStorage.setItem('foodrescue_user', JSON.stringify(userData));
        } catch (error) {
          console.error('Failed to verify token:', error);
          logout();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, [token]);

  // Kinde session sync — once Kinde finishes its loading state, persist the
  // Kinde profile + access token into the same localStorage keys api.ts reads,
  // so the Authorization header keeps working without touching api.ts.
  useEffect(() => {
    if (!kindeEnabled) return;
    if (!kinde) {
      setIsLoading(false);
      return;
    }
    if (kinde.isLoading) return;
    const syncKindeSession = async () => {
      try {
        if (kinde.isAuthenticated && kinde.user) {
          const kindeToken = await kinde.getToken();
          if (kindeToken) {
            const kindeUser = buildKindeUser(kinde.user, kindeToken);
            setToken(kindeToken);
            setUser(kindeUser);
            localStorage.setItem('foodrescue_token', kindeToken);
            localStorage.setItem('foodrescue_user', JSON.stringify(kindeUser));
          }
        }
      } catch (error) {
        console.error('Failed to sync Kinde session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    syncKindeSession();
  }, [kinde?.isLoading, kinde?.isAuthenticated]);

  const login = async (credentials: any): Promise<UserRole> => {
    if (kindeEnabled && kinde) {
      // Kinde hosted login — the browser is redirected to Kinde and back;
      // the session is picked up by the Kinde sync effect above.
      await kinde.login();
      return 'donor';
    }

    const res = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    setToken(res.access_token);
    setUser(res.user);
    localStorage.setItem('foodrescue_token', res.access_token);
    localStorage.setItem('foodrescue_user', JSON.stringify(res.user));
    return res.user.role;
  };

  const register = async (userData: any): Promise<UserRole> => {
    if (kindeEnabled && kinde) {
      // Kinde hosted sign-up — same redirect flow as login.
      await kinde.register();
      return 'donor';
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
    if (kindeEnabled && kinde) {
      // Kinde logout redirects to the configured post-logout URI (/login).
      kinde.logout();
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
        isAuthenticated: !!kinde?.isAuthenticated || (!!user && !!token),
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
