import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { getToken } from '@/lib/api';

type AppRole = 'admin' | 'user';

export interface AppUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: AppRole;
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  userRole: AppRole | null;
  signIn:  (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp:  (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from stored token on mount
  useEffect(() => {
    if (!getToken()) { setIsLoading(false); return; }
    api.get('/api/auth/me')
      .then((data: AppUser) => setUser(data))
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const data = await api.post('/api/auth/signin', { email, password });
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: Error | null }> => {
    try {
      const data = await api.post('/api/auth/signup', { email, password, fullName });
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async (): Promise<void> => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAdmin:  user?.role === 'admin',
      userRole: user?.role ?? null,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
