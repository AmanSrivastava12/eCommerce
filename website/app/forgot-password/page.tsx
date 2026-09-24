'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api-client/resources';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');

  const request = useMutation({
    mutationFn: () => authApi.forgotPassword(email),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-sm space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <div>
        <h1 className="text-xl font-medium text-[var(--foreground)]">Forgot password</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Enter your account email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {request.isSuccess ? (
        <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--foreground)]">
          <p>If an account exists for <span className="font-medium">{email}</span>, we&apos;ve sent password reset instructions to it.</p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Didn&apos;t get anything? Check that the address is correct, or try again in a few minutes.
          </p>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            request.mutate();
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
          {request.isError && (
            <p className="text-sm text-[var(--danger)]">Something went wrong. Please try again.</p>
          )}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={request.isPending}
            className="w-full rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
          >
            {request.isPending ? 'Sending…' : 'Send reset link'}
          </motion.button>
        </form>
      )}

      <p className="text-sm text-[var(--muted)]">
        <Link href="/login" className="text-[var(--brand)] underline">
          Back to sign in
        </Link>
      </p>
    </motion.div>
  );
}
