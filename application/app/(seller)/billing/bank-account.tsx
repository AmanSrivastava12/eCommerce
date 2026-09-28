import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { financeApi } from '../../../lib/api-client/resources';
import { errorMessage } from '../../../lib/api-client/client';
import { toast } from '../../../components/feedback';
import { Button, Field } from '../../../components/ui';
import { colors, radius, spacing } from '../../../lib/theme';
import { KeyboardScrollView } from '../../../components/keyboard';

export default function BankAccountScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['seller-finance'], queryFn: financeApi.get });
  const existing = data?.bankAccount;

  const [form, setForm] = useState({
    accountHolderName: existing?.accountHolderName ?? '',
    bankName: existing?.bankName ?? '',
    accountNumber: '',
    confirmNumber: '',
    ifsc: existing?.ifsc ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const set = (key: keyof typeof form) => (v: string) => {
    setForm((f) => ({ ...f, [key]: key === 'ifsc' ? v.toUpperCase() : v }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const save = useMutation({
    mutationFn: () =>
      financeApi.setBankAccount({
        accountHolderName: form.accountHolderName.trim(),
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        ifsc: form.ifsc.trim(),
      }),
    onSuccess: () => {
      toast.success(existing ? 'Bank account updated' : 'Bank account added');
      queryClient.invalidateQueries({ queryKey: ['seller-finance'] });
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not save bank account')),
  });

  const submit = () => {
    const e: typeof errors = {};
    if (form.accountHolderName.trim().length < 2) e.accountHolderName = 'Enter the account holder name';
    if (form.bankName.trim().length < 2) e.bankName = 'Enter the bank name';
    if (!/^\d{6,18}$/.test(form.accountNumber.trim())) e.accountNumber = 'Account number must be 6–18 digits';
    if (form.confirmNumber.trim() !== form.accountNumber.trim()) e.confirmNumber = 'Account numbers do not match';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.trim())) e.ifsc = 'Enter a valid IFSC code (e.g. HDFC0001234)';
    setErrors(e);
    if (Object.keys(e).length === 0) save.mutate();
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand} />
          <Text style={styles.noticeText}>
            {existing
              ? `Currently paying out to ${existing.bankName} ••${existing.accountLast4}. Re-enter the account number to change it.`
              : 'Your settled earnings are transferred here. Only the last 4 digits are stored.'}
          </Text>
        </View>
        <Field label="Account holder name" icon="person-outline" value={form.accountHolderName} onChangeText={set('accountHolderName')} error={errors.accountHolderName} />
        <Field label="Bank name" icon="business-outline" placeholder="e.g. HDFC Bank" value={form.bankName} onChangeText={set('bankName')} error={errors.bankName} />
        <Field label="Account number" icon="card-outline" keyboardType="number-pad" secureTextEntry value={form.accountNumber} onChangeText={set('accountNumber')} error={errors.accountNumber} />
        <Field label="Confirm account number" icon="card-outline" keyboardType="number-pad" value={form.confirmNumber} onChangeText={set('confirmNumber')} error={errors.confirmNumber} />
        <Field label="IFSC code" icon="barcode-outline" autoCapitalize="characters" placeholder="HDFC0001234" value={form.ifsc} onChangeText={set('ifsc')} error={errors.ifsc} />
        <Button title={existing ? 'Update bank account' : 'Save bank account'} icon="checkmark" onPress={submit} loading={save.isPending} />
      </KeyboardScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  notice: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.cream, borderRadius: radius.md, padding: spacing.md },
  noticeText: { flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 18 },
});
