'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { authApi, cartApi } from '@/lib/api-client/resources';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { PasswordInput } from '@/components/ui/password-input';

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const push = useToastStore((s) => s.push);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: async (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken);
      // Merge the guest cart (if any) into the now-authenticated user's cart.
      try {
        await cartApi.merge();
      } catch {
        // no guest cart to merge
      }
      push('Signed in successfully', 'success');
      router.push('/');
    },
    onError: () => {
      push('Could not sign in — check your email and password.', 'error');
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-sm space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <h1 className="text-xl font-medium text-[var(--foreground)]">Sign in</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          login.mutate();
        }}
        className="space-y-3"
      >
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <PasswordInput
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs font-medium text-[var(--brand)] hover:underline">
            Forgot password?
          </Link>
        </div>
        {login.isError && <p className="text-sm text-[var(--danger)]">Invalid email or password.</p>}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={login.isPending}
          className="w-full rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </motion.button>
      </form>
      <p className="text-sm text-[var(--muted)]">
        No account?{' '}
        <Link href="/register" className="text-[var(--brand)] underline">
          Register
        </Link>
      </p>
    </motion.div>
  );
}
