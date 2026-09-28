import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../lib/api-client/resources';
import { errorMessage } from '../lib/api-client/client';
import { colors, radius, spacing } from '../lib/theme';
import { AuthShell, authStyles } from '../components/auth-shell';
import { Button, Field } from '../components/ui';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const request = useMutation({ mutationFn: () => authApi.forgotPassword(email.trim()) });

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your account email and we'll send you a link to reset your password."
      footer={
        <View style={authStyles.footer}>
          <Link href="/login" style={authStyles.link}>
            Back to sign in
          </Link>
        </View>
      }
    >
      {request.isSuccess ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm }}>
            <Text style={{ fontSize: 14, color: colors.foreground, lineHeight: 20 }}>
              If an account exists for <Text style={{ fontWeight: '600' }}>{email}</Text>, we've sent password reset instructions to it.
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Didn't get anything? Check that the address is correct, or try again in a few minutes.
            </Text>
          </View>
          <Link href="/reset-password" style={authStyles.link}>
            I have a reset code
          </Link>
        </View>
      ) : (
        <>
          <Field
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => request.mutate()}
          />
          {request.isError && <Text style={authStyles.error}>{errorMessage(request.error)}</Text>}
          <Button title="Send reset link" loading={request.isPending} disabled={!email.trim()} onPress={() => request.mutate()} />
        </>
      )}
    </AuthShell>
  );
}
