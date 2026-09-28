'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToastStore } from '@/lib/stores/toast-store';

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  // Keep server requests isolated and preserve the browser cache across renders.
  if (typeof window === 'undefined') {
    return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } });
  }
  browserQueryClient ??= new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  });
  return browserQueryClient;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const logout = useAuthStore((s) => s.logout);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Fired by the api-client when a refresh token has also expired/failed — the access
    // token localStorage entries are already cleared at that point, so this just syncs the
    // rest of the app's state and gives the user a clear reason instead of stale "logged
    // in" UI next to pages that silently fail every request.
    const onSessionExpired = () => {
      logout();
      push('Your session has expired. Please sign in again.', 'error');
      router.push('/login');
    };
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => window.removeEventListener('auth:session-expired', onSessionExpired);
  }, [logout, push, router]);

  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
