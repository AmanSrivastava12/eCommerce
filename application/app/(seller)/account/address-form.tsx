import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addressesApi } from '../../../lib/api-client/resources';
import { errorMessage } from '../../../lib/api-client/client';
import type { Address, AddressInput } from '../../../lib/api-client/types';
import { Button, Checkbox, Chip, Field } from '../../../components/ui';
import { colors, spacing } from '../../../lib/theme';
import { toast } from '../../../components/feedback';
import { KeyboardScrollView } from '../../../components/keyboard';

const LABELS = ['Home', 'Work', 'Warehouse', 'Pickup'];

type Errors = Partial<Record<keyof AddressInput, string>>;

export default function AddressFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: addressesApi.list });
  const existing = id ? addresses?.find((a) => a._id === id) : undefined;

  const [form, setForm] = useState<AddressInput>(() => ({
    label: existing?.label ?? 'Warehouse',
    line1: existing?.line1 ?? '',
    line2: existing?.line2 ?? '',
    city: existing?.city ?? '',
    state: existing?.state ?? '',
    postalCode: existing?.postalCode ?? '',
    country: existing?.country ?? 'India',
    phone: existing?.phone ?? '',
    isDefault: existing?.isDefault ?? !addresses?.length,
  }));
  const [errors, setErrors] = useState<Errors>({});
  const set = (key: keyof AddressInput, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, line2: form.line2?.trim() || undefined };
      return id ? addressesApi.update(id, payload) : addressesApi.create(payload);
    },
    onSuccess: (list: Address[]) => {
      queryClient.setQueryData(['addresses'], list);
      toast.success(id ? 'Address updated' : 'Address added');
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not save address')),
  });

  const submit = () => {
    const e: Errors = {};
    (['label', 'line1', 'city', 'state', 'postalCode', 'country'] as const).forEach((k) => {
      if (!String(form[k] ?? '').trim()) e[k] = 'Required';
    });
    if (!/^\+?[\d\s-]{7,15}$/.test(form.phone.trim())) e.phone = 'Enter a valid phone number';
    setErrors(e);
    if (Object.keys(e).length === 0) save.mutate();
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: id ? 'Edit address' : 'New address' }} />
      <KeyboardScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Address type</Text>
          <View style={styles.wrap}>
            {LABELS.map((l) => (
              <Chip key={l} label={l} active={form.label === l} onPress={() => set('label', l)} />
            ))}
          </View>
        </View>
        <Field label="Label" placeholder="e.g. Main warehouse" value={form.label} onChangeText={(t) => set('label', t)} error={errors.label} />
        <Field label="Address line 1" placeholder="Building, street" value={form.line1} onChangeText={(t) => set('line1', t)} error={errors.line1} />
        <Field label="Address line 2 (optional)" placeholder="Area, landmark" value={form.line2} onChangeText={(t) => set('line2', t)} />
        <View style={styles.row}>
          <Field containerStyle={{ flex: 1 }} label="City" value={form.city} onChangeText={(t) => set('city', t)} error={errors.city} />
          <Field containerStyle={{ flex: 1 }} label="State" value={form.state} onChangeText={(t) => set('state', t)} error={errors.state} />
        </View>
        <View style={styles.row}>
          <Field containerStyle={{ flex: 1 }} label="Pincode" keyboardType="number-pad" value={form.postalCode} onChangeText={(t) => set('postalCode', t)} error={errors.postalCode} />
          <Field containerStyle={{ flex: 1 }} label="Country" value={form.country} onChangeText={(t) => set('country', t)} error={errors.country} />
        </View>
        <Field label="Contact number" icon="call-outline" keyboardType="phone-pad" value={form.phone} onChangeText={(t) => set('phone', t)} error={errors.phone} />
        <Checkbox
          checked={!!form.isDefault}
          onChange={(c) => set('isDefault', c)}
          label="Set as primary address"
          description="Used as your default business / pickup address"
        />
        <Button title={id ? 'Save address' : 'Add address'} icon="checkmark" loading={save.isPending} onPress={submit} />
      </KeyboardScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  label: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
});
