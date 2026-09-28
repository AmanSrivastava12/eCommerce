'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api-client/resources';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrength, passwordScore } from '@/components/ui/password-strength';

export default function RegisterPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const push = useToastStore((s) => s.push);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const register = useMutation({
    mutationFn: () => authApi.register({ ...form, role: 'customer' }),
    onSuccess: (tokens) => {
      setTokens(tokens.accessToken, tokens.refreshToken);
      push('Account created — welcome to Shopwave!', 'success');
      router.push('/');
    },
    onError: (err: any) => {
      push(err?.body?.message ?? 'Could not create your account. Please try again.', 'error');
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-sm space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <h1 className="text-xl font-medium text-[var(--foreground)]">Create your account</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate();
        }}
        className="space-y-3"
      >
        <input
          required
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <PasswordInput
          required
          minLength={8}
          placeholder="Password (min. 8 characters)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <PasswordStrength password={form.password} />
        {register.isError && <p className="text-sm text-[var(--danger)]">Could not create account.</p>}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={register.isPending || (form.password.length > 0 && passwordScore(form.password) < 2)}
          className="w-full rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {register.isPending ? 'Creating…' : 'Create account'}
        </motion.button>
      </form>
    </motion.div>
  );
}
