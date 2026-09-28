import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { authApi, cartApi } from '../api-client/resources';
import { onSessionExpired } from '../api-client/client';
import { tokenStorage } from './token-storage';
import { toast } from '../../components/feedback';
import { colors } from '../theme';

// Query keys holding data that belongs to the signed-in user; dropped on sign-out so the
// next account (or guest) never sees a flash of the previous user's orders or wishlist.
const USER_SCOPED_KEYS = ['me', 'wishlist', 'orders', 'order', 'addresses', 'my-returns'];

interface AuthContextValue {
  /** False until the stored token has been read, so screens don't flash signed-out UI. */
  isReady: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    tokenStorage.getAccessToken().then((token) => {
      setIsLoggedIn(Boolean(token));
      setIsReady(true);
    });
  }, []);

  const clearUserData = useCallback(() => {
    USER_SCOPED_KEYS.forEach((key) => queryClient.removeQueries({ queryKey: [key] }));
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  }, [queryClient]);

  useEffect(
    () =>
      onSessionExpired(() => {
        setIsLoggedIn(false);
        clearUserData();
        toast.error('Your session has expired. Please sign in again.');
        router.push('/login');
      }),
    [clearUserData],
  );

  const startSession = async (tokens: { accessToken: string; refreshToken: string }) => {
    await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    // Merge the guest cart (if any) into the now-authenticated user's cart.
    try {
      await cartApi.merge();
    } catch {
      // no guest cart to merge
    }
    setIsLoggedIn(true);
    queryClient.invalidateQueries({ queryKey: ['cart'] });
  };

  const login = async (email: string, password: string) => startSession(await authApi.login(email, password));

  const register = async (data: { name: string; email: string; password: string }) =>
    startSession(await authApi.register(data));

  const logout = async () => {
    await tokenStorage.clear();
    setIsLoggedIn(false);
    clearUserData();
  };

  return (
    <AuthContext.Provider value={{ isReady, isLoggedIn, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Gate for screens that need a signed-in customer. Waits for the stored token to be read
 * first — redirecting on the initial `isLoggedIn: false` would bounce a signed-in user who
 * cold-starts (or deep-links) straight into a protected screen out to the login page.
 */
export function RequireAuth({ children, next }: { children: React.ReactNode; next?: string }) {
  const { isReady, isLoggedIn } = useAuth();
  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (!isLoggedIn) return <Redirect href={next ? { pathname: '/login', params: { next } } : '/login'} />;
  return <>{children}</>;
}
