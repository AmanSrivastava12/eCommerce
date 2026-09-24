'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api-client/resources';
import { useToastStore } from '@/lib/stores/toast-store';
import { useConfirm } from '@/lib/stores/confirm-store';

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-[var(--brand)]" strokeWidth={1.75}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

export function SavedPaymentMethods() {
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);
  const confirmDialog = useConfirm();
  const { data: methods, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: paymentsApi.listMethods,
  });

  const remove = useMutation({
    mutationFn: (id: string) => paymentsApi.removeMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      push('Card removed', 'info');
    },
    onError: () => push('Could not remove this card. Please try again.', 'error'),
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="h-4 w-40 skeleton rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        Saved Payment Methods
      </h2>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Cards you chose to save during checkout. UPI and other one-time methods aren&apos;t saved.
      </p>

      {!methods || methods.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No saved cards yet — check &quot;Save this card&quot; at checkout to see it here next time.
        </p>
      ) : (
        <div className="space-y-2">
          {methods.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-md border border-[var(--border)] p-3"
            >
              <CardIcon />
              <div className="flex-1">
                <p className="text-sm font-medium capitalize text-[var(--foreground)]">
                  {m.brand} •••• {m.last4}
                  {m.isDefault && (
                    <span className="ml-2 rounded-full bg-[var(--cream)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand)]">
                      Default
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Expires {String(m.expMonth).padStart(2, '0')}/{m.expYear}
                </p>
              </div>
              <button
                title="Remove card"
                onClick={async () => {
                  const confirmed = await confirmDialog({
                    title: 'Remove this card?',
                    message: `${m.brand} ending in ${m.last4} will no longer be available at checkout.`,
                    confirmLabel: 'Remove',
                    danger: true,
                  });
                  if (confirmed) remove.mutate(m.id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] text-[var(--danger)] transition hover:bg-[var(--cream)]"
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth={2}>
                  <path d="M4 7h16M9 7V4h6v3m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
