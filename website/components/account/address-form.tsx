'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { meApi } from '@/lib/api-client/resources';
import { LocationPicker } from './location-picker';

const EMPTY = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
  isDefault: false,
};

const FIELD_LABELS: Record<string, string> = {
  label: 'Label (e.g. Home, Work)',
  line1: 'Address line 1',
  line2: 'Address line 2 (optional)',
  city: 'City',
  state: 'State',
  postalCode: 'Postal code',
  country: 'Country',
  phone: 'Phone number',
};

export function AddressForm() {
  const [form, setForm] = useState(EMPTY);
  const [autofilled, setAutofilled] = useState(false);
  const queryClient = useQueryClient();

  const add = useMutation({
    mutationFn: () => meApi.addAddress(form),
    onSuccess: () => {
      setForm(EMPTY);
      setAutofilled(false);
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        add.mutate();
      }}
      className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
    >
      <p className="font-medium text-[var(--foreground)]">Add a new address</p>

      <LocationPicker
        onLocate={(address) => {
          setForm((f) => ({ ...f, ...address }));
          setAutofilled(true);
        }}
      />
      {autofilled && (
        <p className="text-xs text-[var(--discount)]">
          Address fields filled from your location — double-check them below before saving.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(['label', 'line1', 'line2', 'city', 'state', 'postalCode', 'country', 'phone'] as const).map(
          (field) => (
            <label key={field} className="col-span-2 space-y-1 sm:col-span-1">
              <span className="text-xs text-[var(--muted)]">{FIELD_LABELS[field]}</span>
              <input
                required={field !== 'line2'}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 outline-none transition focus:border-[var(--brand)]"
              />
            </label>
          ),
        )}
      </div>

      <label className="flex items-center gap-2 text-[var(--foreground)]">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          className="accent-[var(--brand)]"
        />
        Set as default address
      </label>

      <button
        type="submit"
        disabled={add.isPending}
        className="w-full rounded-md bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-dark)] disabled:opacity-50 sm:w-auto"
      >
        {add.isPending ? 'Adding…' : 'Add address'}
      </button>
    </form>
  );
}
