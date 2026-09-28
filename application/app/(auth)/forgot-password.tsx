import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../lib/api-client/resources';
import { useAuth } from '../../lib/auth/auth-context';
import { errorMessage } from '../../lib/api-client/client';
import { toast } from '../../components/feedback';
import { AuthShell } from '../../components/auth-shell';
import { Button, Field, MIN_PASSWORD_SCORE, PasswordField, PasswordStrength, passwordScore } from '../../components/ui';
import { colors, radius, spacing } from '../../lib/theme';

// The reset email links to the website (`/reset-password?token=…`). Sellers can paste either
// the whole link or just the token here, so accept both.
function extractToken(input: string) {
  const match = input.match(/[?&]token=([^&\s]+)/);
  return (match ? match[1] : input).trim();
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { me, logout } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim()),
    onSuccess: () => {
      setError(null);
      setStep('reset');
      toast.success('Reset link sent — check your email');
    },
    onError: (e) => {
      setError(errorMessage(e, 'Could not send reset instructions. Check the email and try again.'));
      toast.error('Could not send reset link');
    },
  });

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword(extractToken(code), password),
    onSuccess: () => {
      setError(null);
      setStep('done');
      toast.success('Password updated');
    },
    onError: (e) => {
      setError(errorMessage(e, 'Could not reset your password.'));
      toast.error('Password reset failed');
    },
  });

  const submitRequest = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    request.mutate();
  };

  const submitReset = () => {
    if (!extractToken(code)) return setError('Paste the reset code or link from the email.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (passwordScore(password) < MIN_PASSWORD_SCORE) return setError('Choose a stronger password.');
    if (password !== confirm) return setError('Passwords do not match.');
    reset.mutate();
  };

  const backToLogin = (
    <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))} hitSlop={8} style={{ alignSelf: 'center' }}>
      <Text style={styles.link}>← {me ? 'Back' : 'Back to sign in'}</Text>
    </Pressable>
  );

  // Opened from the account screen while signed in: a reset revokes existing sessions, so
  // sign out before returning to the login screen.
  const goToLogin = async () => {
    if (me) {
      await logout();
      toast.info('Signed out — sign in with your new password');
    }
    router.replace('/(auth)/login');
  };

  if (step === 'done') {
    return (
      <AuthShell icon="checkmark-circle" title="Password updated" subtitle="Your password has been reset. Sign in with your new password.">
        <Button title="Go to sign in" onPress={goToLogin} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon="key"
      title={step === 'request' ? 'Forgot password?' : 'Set a new password'}
      subtitle={
        step === 'request'
          ? "Enter the email you sign in with and we'll send you a reset link."
          : `If an account exists for ${email.trim()}, we've emailed a reset link. It expires in 30 minutes.`
      }
      footer={backToLogin}
    >
      <View style={styles.steps}>
        <StepDot n={1} label="Email" active />
        <View style={styles.stepLine} />
        <StepDot n={2} label="New password" active={step === 'reset'} />
      </View>

      {step === 'request' ? (
        <>
          <Field
            label="Email"
            icon="mail-outline"
            placeholder="you@business.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={submitRequest}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Send reset link" icon="send-outline" onPress={submitRequest} loading={request.isPending} />
        </>
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            <Field
              label="Reset code or link"
              icon="link-outline"
              placeholder="Paste from the email"
              autoCapitalize="none"
              autoCorrect={false}
              value={code}
              onChangeText={setCode}
              hint="Paste the full link from the email, or just the token at its end."
            />
            <View style={{ gap: spacing.sm }}>
              <PasswordField label="New password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} />
              <PasswordStrength password={password} />
            </View>
            <PasswordField label="Confirm new password" placeholder="Re-enter password" value={confirm} onChangeText={setConfirm} />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Button title="Reset password" icon="shield-checkmark-outline" onPress={submitReset} loading={reset.isPending} />
          <Pressable onPress={() => request.mutate()} disabled={request.isPending} style={{ alignSelf: 'center' }}>
            <Text style={styles.link}>{request.isPending ? 'Resending…' : "Didn't get it? Resend email"}</Text>
          </Pressable>
        </>
      )}
    </AuthShell>
  );
}

function StepDot({ n, label, active }: { n: number; label: string; active: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.dot, active && styles.dotActive]}>
        <Text style={[styles.dotText, active && { color: colors.brandForeground }]}>{n}</Text>
      </View>
      <Text style={[styles.stepLabel, active && { color: colors.foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { color: colors.brand, fontWeight: '600', fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dot: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  dotText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  stepLabel: { fontSize: 12, color: colors.muted, fontWeight: '500' },
});
