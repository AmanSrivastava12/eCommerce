import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { couponsApi } from '../../../lib/api-client/resources';
import { KeyboardScrollView } from '../../../components/keyboard';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function NewCouponScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'flat'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [minCartValue, setMinCartValue] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [usageLimitPerUser, setUsageLimitPerUser] = useState('');
  const [validFrom, setValidFrom] = useState(todayIso());
  const [validTo, setValidTo] = useState(plusDaysIso(30));
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      couponsApi.create({
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        minCartValue: minCartValue ? Number(minCartValue) : undefined,
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
        usageLimitPerUser: usageLimitPerUser ? Number(usageLimitPerUser) : undefined,
        validFrom: new Date(validFrom).toISOString(),
        validTo: new Date(validTo).toISOString(),
        active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      router.back();
    },
    onError: (err: any) => {
      setError(err?.body?.message ?? 'Could not create coupon. Check the fields and try again.');
    },
  });

  const canSubmit = code.trim().length > 0 && Number(discountValue) > 0 && validFrom && validTo;

  return (
    <KeyboardScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <Text style={styles.label}>Code</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. WELCOME50"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        {(['percent', 'flat'] as const).map((t) => (
          <Pressable key={t} onPress={() => setDiscountType(t)} style={[styles.chip, discountType === t && styles.chipActive]}>
            <Text style={discountType === t ? styles.chipTextActive : styles.chipText}>
              {t === 'percent' ? 'Percent off' : 'Flat amount off'}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{discountType === 'percent' ? 'Discount (%)' : 'Discount amount ($)'}</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 200'}
        value={discountValue}
        onChangeText={setDiscountValue}
      />

      <Text style={styles.label}>Minimum cart value ($, optional)</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="No minimum"
        value={minCartValue}
        onChangeText={setMinCartValue}
      />

      {discountType === 'percent' && (
        <>
          <Text style={styles.label}>Max discount cap ($, optional)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="No cap"
            value={maxDiscountAmount}
            onChangeText={setMaxDiscountAmount}
          />
        </>
      )}

      <Text style={styles.label}>Usage limit per customer (optional)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="Unlimited"
        value={usageLimitPerUser}
        onChangeText={setUsageLimitPerUser}
      />

      <Text style={styles.label}>Valid from (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={validFrom} onChangeText={setValidFrom} />

      <Text style={styles.label}>Valid to (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={validTo} onChangeText={setValidTo} />

      <View style={styles.activeRow}>
        <Text style={styles.label}>Active immediately</Text>
        <Switch value={active} onValueChange={setActive} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.submit, (!canSubmit || create.isPending) && styles.submitDisabled]}
        onPress={() => {
          setError(null);
          create.mutate();
        }}
        disabled={!canSubmit || create.isPending}
      >
        <Text style={styles.submitText}>{create.isPending ? 'Creating…' : 'Create coupon'}</Text>
      </Pressable>
    </KeyboardScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 4, paddingBottom: 48 },
  label: { fontSize: 13, color: '#8a7460', marginTop: 12 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6dac2', borderRadius: 10, padding: 10, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: '#e6dac2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#6f4a2f', borderColor: '#6f4a2f' },
  chipText: { fontSize: 13 },
  chipTextActive: { fontSize: 13, color: '#fff8ef' },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  error: { color: '#b3492f', fontSize: 13, marginTop: 12 },
  submit: { backgroundColor: '#6f4a2f', borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 20 },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#fff8ef', fontWeight: '600' },
});
