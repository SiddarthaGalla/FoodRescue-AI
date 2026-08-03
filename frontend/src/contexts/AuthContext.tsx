import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthResponse } from '../types/auth';
import { apiRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<UserRole>;
  register: (userData: any) => Promise<UserRole>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('foodrescue_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('foodrescue_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
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

  const login = async (credentials: any): Promise<UserRole> => {
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
        isAuthenticated: !!user && !!token,
        login,
        register,
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
