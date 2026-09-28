'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meApi } from '@/lib/api-client/resources';
import { AddressForm } from '@/components/account/address-form';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

export default function AddressesPage() {
  const { data: addresses, isLoading, isError, refetch } = useQuery({
    queryKey: ['addresses'],
    queryFn: meApi.listAddresses,
  });
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: string) => meApi.removeAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
  const setDefault = useMutation({
    mutationFn: (id: string) => meApi.updateAddress(id, { isDefault: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-medium text-[var(--foreground)]">Saved Addresses</h1>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}
        </div>
      )}

      {isError && !isLoading && <ErrorState onRetry={() => refetch()} />}

      {!isError && !isLoading && addresses && addresses.length === 0 && (
        <EmptyState
          icon="address"
          title="No saved addresses"
          subtitle="Add an address below so checkout is one click next time."
        />
      )}

      {!isError && <div className="space-y-2">
        <AnimatePresence initial={false}>
          {(addresses ?? []).map((a) => (
            <motion.div
              key={a._id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-[var(--foreground)]">{a.label}</p>
                {a.isDefault && (
                  <span className="rounded-full border border-[var(--discount)] px-2 py-0.5 text-[11px] font-medium text-[var(--discount)]">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[var(--muted)]">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}, {a.country}
              </p>
              <p className="text-[var(--muted)]">📞 {a.phone}</p>
              <div className="mt-2 flex gap-4 text-xs">
                {!a.isDefault && (
                  <button onClick={() => setDefault.mutate(a._id)} className="font-medium text-[var(--brand)] hover:underline">
                    Set as default
                  </button>
                )}
                <button onClick={() => remove.mutate(a._id)} className="font-medium text-[var(--danger)] hover:underline">
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>}

      <AddressForm />
    </div>
  );
}
