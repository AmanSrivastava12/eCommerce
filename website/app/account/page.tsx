'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meApi } from '@/lib/api-client/resources';
import { Me } from '@/lib/api-client/types';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { useConfirm } from '@/lib/stores/confirm-store';
import { SavedPaymentMethods } from '@/components/account/saved-payment-methods';

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

type FormState = {
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: '' | NonNullable<Me['gender']>;
  profilePictureUrl: string;
};

function emptyForm(me?: Me): FormState {
  return {
    name: me?.name ?? '',
    phone: me?.phone ?? '',
    dateOfBirth: me?.dateOfBirth ? me.dateOfBirth.slice(0, 10) : '',
    gender: me?.gender ?? '',
    profilePictureUrl: me?.profilePictureUrl ?? '',
  };
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function Avatar({ me, size = 72 }: { me: Me; size?: number }) {
  if (me.profilePictureUrl) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-[var(--cream)]"
        style={{ width: size, height: size }}
      >
        <Image src={me.profilePictureUrl} alt={me.name} fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[var(--brand)] font-semibold text-[var(--brand-foreground)]"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(me.name) || '?'}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</span>
      <span className="text-sm text-[var(--foreground)]">{value}</span>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { data: me, isLoading } = useQuery({ queryKey: ['me'], queryFn: meApi.get });
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  const confirmDialog = useConfirm();
  const logout = useAuthStore((s) => s.logout);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your account, orders, and wishlist.',
      confirmLabel: 'Sign out',
      danger: true,
    });
    if (!confirmed) return;
    logout();
    push('Signed out', 'info');
    router.push('/');
  };

  useEffect(() => {
    if (me) setForm(emptyForm(me));
  }, [me]);

  const update = useMutation({
    mutationFn: () =>
      meApi.update({
        name: form.name,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        profilePictureUrl: form.profilePictureUrl || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated);
      setIsEditing(false);
      push('Profile updated', 'success');
    },
    onError: () => push('Could not update your profile. Please try again.', 'error'),
  });

  if (isLoading || !me) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-8 w-40 skeleton rounded" />
        <div className="h-48 skeleton rounded-lg" />
      </div>
    );
  }

  const defaultAddress = me.addresses.find((a) => a.isDefault) ?? me.addresses[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-medium text-[var(--foreground)]">My Profile</h1>
        <div className="flex gap-4 text-sm font-medium text-[var(--brand)]">
          <Link href="/account/addresses" className="hover:underline">
            Saved addresses
          </Link>
          <Link href="/account/wishlist" className="hover:underline">
            Wishlist
          </Link>
          <Link href="/orders" className="hover:underline">
            Orders
          </Link>
        </div>
      </div>

      <motion.div
        layout
        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
      >
        {!isEditing ? (
          <>
            <div className="flex items-center gap-4">
              <Avatar me={me} />
              <div>
                <p className="text-lg font-semibold text-[var(--foreground)]">{me.name}</p>
                <p className="text-sm capitalize text-[var(--muted)]">{me.role} account</p>
              </div>
              <button
                title="Edit profile"
                onClick={() => setIsEditing(true)}
                className="ml-auto flex items-center gap-1.5 rounded-md border border-[var(--brand)] px-3 py-1.5 text-sm font-medium text-[var(--brand)] transition hover:bg-[var(--cream)]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={2}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                Edit
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 divide-y divide-[var(--border)] border-t border-[var(--border)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <div className="sm:pr-6">
                <InfoRow label="Email" value={me.email} />
                <InfoRow label="Phone" value={me.phone || <span className="text-[var(--muted)]">Not added</span>} />
                <InfoRow
                  label="Date of birth"
                  value={
                    me.dateOfBirth ? (
                      new Date(me.dateOfBirth).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    ) : (
                      <span className="text-[var(--muted)]">Not added</span>
                    )
                  }
                />
                <InfoRow
                  label="Gender"
                  value={me.gender ? GENDER_LABELS[me.gender] : <span className="text-[var(--muted)]">Not added</span>}
                />
              </div>
              <div className="pt-2 sm:pl-6 sm:pt-0">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Default address
                  </span>
                  <Link href="/account/addresses" className="text-xs font-medium text-[var(--brand)] hover:underline">
                    Manage
                  </Link>
                </div>
                {defaultAddress ? (
                  <div className="text-sm text-[var(--foreground)]">
                    <p className="font-medium">{defaultAddress.label}</p>
                    <p className="text-[var(--muted)]">
                      {defaultAddress.line1}
                      {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ''}, {defaultAddress.city},{' '}
                      {defaultAddress.state} {defaultAddress.postalCode}, {defaultAddress.country}
                    </p>
                    <p className="text-[var(--muted)]">{defaultAddress.phone}</p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    No address saved yet.{' '}
                    <Link href="/account/addresses" className="font-medium text-[var(--brand)] hover:underline">
                      Add one
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate();
            }}
            className="space-y-5"
          >
            <div className="flex items-center gap-4">
              <Avatar me={{ ...me, profilePictureUrl: form.profilePictureUrl || undefined }} />
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Profile picture URL (optional)
                </label>
                <input
                  value={form.profilePictureUrl}
                  onChange={(e) => setForm((f) => ({ ...f, profilePictureUrl: e.target.value }))}
                  placeholder="https://…"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm outline-none transition focus:border-[var(--brand)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Full name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Email
                </label>
                <input
                  disabled
                  value={me.email}
                  title="Contact support to change your email"
                  className="w-full cursor-not-allowed rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)] outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91-9800000000"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Date of birth
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                  Gender
                </label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as FormState['gender'] }))}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition focus:border-[var(--brand)]"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="rounded-md border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
              Your default/permanent address is managed separately —{' '}
              <Link href="/account/addresses" className="font-medium text-[var(--brand)] hover:underline">
                edit it here
              </Link>
              .
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={update.isPending}
                className="rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50"
              >
                {update.isPending ? 'Saving…' : 'Save changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm(me));
                  setIsEditing(false);
                }}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--cream)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </motion.div>

      <SavedPaymentMethods />

      <button
        title="Sign out"
        onClick={handleLogout}
        className="mx-auto flex items-center gap-2 rounded-md border border-[var(--danger)] px-4 py-2 text-sm font-medium text-[var(--danger)] transition hover:bg-[var(--danger)] hover:text-white"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth={2}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
        Sign out
      </button>
    </div>
  );
}
