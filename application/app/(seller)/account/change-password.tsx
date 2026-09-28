import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { meApi } from '../../../lib/api-client/resources';
import { errorMessage } from '../../../lib/api-client/client';
import { useAuth } from '../../../lib/auth/auth-context';
import { toast } from '../../../components/feedback';
import { Button, MIN_PASSWORD_SCORE, PasswordField, PasswordStrength, passwordScore } from '../../../components/ui';
import { colors, radius, spacing } from '../../../lib/theme';
import { KeyboardScrollView } from '../../../components/keyboard';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { me } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});

  const weak = next.length > 0 && passwordScore(next) < MIN_PASSWORD_SCORE;

  const change = useMutation({
    mutationFn: () => meApi.changePassword(current, next),
    onSuccess: () => {
      toast.success('Password updated');
      router.back();
    },
    onError: (e) => {
      const message = errorMessage(e, 'Could not update your password');
      if (/current password/i.test(message)) setErrors({ current: message });
      toast.error(message);
    },
  });

  const submit = () => {
    const e: typeof errors = {};
    if (!current) e.current = 'Enter your current password';
    if (next.length < 8) e.next = 'Use at least 8 characters';
    else if (weak) e.next = 'Choose a stronger password';
    else if (next === current) e.next = 'New password must be different';
    if (confirmValue !== next) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length === 0) change.mutate();
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
          <Text style={styles.noticeText}>You'll stay signed in here. Other devices will need to sign in again.</Text>
        </View>
        <PasswordField label="Current password" value={current} onChangeText={setCurrent} error={errors.current} autoComplete="current-password" />
        <View style={{ gap: spacing.sm }}>
          <PasswordField label="New password" placeholder="At least 8 characters" value={next} onChangeText={setNext} error={errors.next} autoComplete="new-password" />
          <PasswordStrength password={next} />
        </View>
        <PasswordField label="Confirm new password" value={confirmValue} onChangeText={setConfirmValue} error={errors.confirm} />
        <Button title="Update password" icon="shield-checkmark-outline" onPress={submit} loading={change.isPending} disabled={weak} />
        <Pressable
          style={{ alignSelf: 'center' }}
          onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email: me?.email ?? '' } })}
        >
          <Text style={styles.link}>Forgot your current password?</Text>
        </Pressable>
      </KeyboardScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  notice: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.cream, borderRadius: radius.md, padding: spacing.md },
  noticeText: { flex: 1, fontSize: 13, color: colors.foreground, lineHeight: 18 },
  link: { color: colors.brand, fontWeight: '600', fontSize: 13 },
});
