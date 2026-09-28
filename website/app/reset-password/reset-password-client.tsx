'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api-client/resources';
import { ApiError } from '@/lib/api-client/client';
import { useToastStore } from '@/lib/stores/toast-store';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrength, passwordScore } from '@/components/ui/password-strength';

export function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const push = useToastStore((s) => s.push);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword(token, newPassword),
    onSuccess: () => {
      push('Password reset. Please sign in with your new password.', 'success');
      router.push('/login');
    },
  });

  if (!token) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto max-w-sm space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center"
      >
        <h1 className="text-xl font-medium text-[var(--foreground)]">Invalid reset link</h1>
        <p className="text-sm text-[var(--muted)]">
          This password reset link is missing its token. Request a new one below.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)]"
        >
          Request new link
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-sm space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <div>
        <h1 className="text-xl font-medium text-[var(--foreground)]">Reset your password</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Choose a new password for your account.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newPassword !== confirmPassword) {
            setMismatch(true);
            return;
          }
          setMismatch(false);
          reset.mutate();
        }}
        className="space-y-3"
      >
        <PasswordInput
          required
          minLength={8}
          placeholder="New password (min. 8 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        <PasswordStrength password={newPassword} />
        <PasswordInput
          required
          minLength={8}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
        />
        {mismatch && <p className="text-sm text-[var(--danger)]">Passwords don&apos;t match.</p>}
        {reset.isError && (
          <p className="text-sm text-[var(--danger)]">
            {reset.error instanceof ApiError
              ? String((reset.error.body as any)?.message ?? reset.error.message)
              : 'This reset link is invalid or has expired.'}
          </p>
        )}
        <motion.button
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={reset.isPending || (newPassword.length > 0 && passwordScore(newPassword) < 2)}
          className="w-full rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
        >
          {reset.isPending ? 'Resetting…' : 'Reset password'}
        </motion.button>
      </form>

      <p className="text-sm text-[var(--muted)]">
        <Link href="/login" className="text-[var(--brand)] underline">
          Back to sign in
        </Link>
      </p>
    </motion.div>
  );
}
