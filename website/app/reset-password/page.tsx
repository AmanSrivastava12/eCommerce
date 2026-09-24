import { Suspense } from 'react';
import { ResetPasswordClient } from './reset-password-client';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
