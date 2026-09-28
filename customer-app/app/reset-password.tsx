import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../lib/api-client/resources';
import { errorMessage } from '../lib/api-client/client';
import { toast } from '../components/feedback';
import { AuthShell, authStyles } from '../components/auth-shell';
import { Button, Field, MIN_PASSWORD_SCORE, PasswordField, PasswordStrength, passwordScore } from '../components/ui';

// The reset email links to the website (`/reset-password?token=…`). Opening the same path
// with the app's scheme (shopwave://reset-password?token=…) prefills the token; otherwise
// the customer can paste the token from the link.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(params.token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword(token.trim(), newPassword),
    onSuccess: () => {
      toast.success('Password reset. Please sign in with your new password.');
      router.replace('/login');
    },
  });

  const weak = newPassword.length > 0 && (newPassword.length < 8 || passwordScore(newPassword) < MIN_PASSWORD_SCORE);

  const submit = () => {
    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    reset.mutate();
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Choose a new password for your account."
      footer={
        <View style={authStyles.footer}>
          <Link href="/forgot-password" style={authStyles.link}>
            Request a new link
          </Link>
        </View>
      }
    >
      {!params.token && (
        <Field
          label="Reset token"
          icon="key-outline"
          value={token}
          onChangeText={setToken}
          placeholder="Paste the token from your email link"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
      <PasswordField label="New password" placeholder="Min. 8 characters" value={newPassword} onChangeText={setNewPassword} />
      <PasswordStrength password={newPassword} />
      <PasswordField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} onSubmitEditing={submit} />
      {mismatch && <Text style={authStyles.error}>Passwords don't match.</Text>}
      {reset.isError && <Text style={authStyles.error}>{errorMessage(reset.error, 'This reset link is invalid or has expired.')}</Text>}
      <Button
        title="Reset password"
        loading={reset.isPending}
        disabled={!token.trim() || !newPassword || !confirmPassword || weak}
        onPress={submit}
      />
    </AuthShell>
  );
}
