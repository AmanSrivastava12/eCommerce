import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, meApi } from '../api-client/resources';
import { tokenStorage } from './token-storage';
import { Me } from '../api-client/types';

interface AuthContextValue {
  isLoading: boolean;
  me: Me | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; businessName: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        try {
          setMe(await meApi.get());
        } catch {
          await tokenStorage.clear();
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const startSession = async (tokens: { accessToken: string; refreshToken: string }) => {
    const profile = await tokenStorage
      .setSession(tokens.accessToken, tokens.refreshToken, '')
      .then(meApi.get);
    await tokenStorage.setSession(tokens.accessToken, tokens.refreshToken, profile.role);
    setMe(profile);
  };

  const login = async (email: string, password: string) => startSession(await authApi.login(email, password));

  const register = async (data: { name: string; email: string; password: string; businessName: string }) =>
    startSession(await authApi.register(data));

  const refreshMe = async () => {
    setMe(await meApi.get());
  };

  const logout = async () => {
    await tokenStorage.clear();
    setMe(null);
  };

  return (
    <AuthContext.Provider value={{ isLoading, me, login, register, logout, refreshMe }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
