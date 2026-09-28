import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { errorMessage } from '../lib/api-client/client';
import { useAuth } from '../lib/auth/auth-context';
import { toast } from '../components/feedback';
import { AuthShell, authStyles } from '../components/auth-shell';
import { Button, Field, MIN_PASSWORD_SCORE, PasswordField, PasswordStrength, passwordScore } from '../components/ui';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const mutation = useMutation({
    mutationFn: () => register({ name: form.name.trim(), email: form.email.trim(), password: form.password }),
    onSuccess: () => {
      toast.success('Account created — welcome to Shopwave!');
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
  });

  const weak = form.password.length > 0 && (form.password.length < 8 || passwordScore(form.password) < MIN_PASSWORD_SCORE);

  return (
    <AuthShell
      title="Create your account"
      footer={
        <View style={authStyles.footer}>
          <Text style={authStyles.footerText}>Already have an account?</Text>
          <Link href="/login" replace style={authStyles.link}>
            Sign in
          </Link>
        </View>
      }
    >
      <Field label="Full name" icon="person-outline" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} autoComplete="name" />
      <Field
        label="Email"
        icon="mail-outline"
        value={form.email}
        onChangeText={(email) => setForm((f) => ({ ...f, email }))}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      <PasswordField
        label="Password"
        placeholder="Min. 8 characters"
        value={form.password}
        onChangeText={(password) => setForm((f) => ({ ...f, password }))}
      />
      <PasswordStrength password={form.password} />
      {mutation.error && <Text style={authStyles.error}>{errorMessage(mutation.error, 'Could not create your account. Please try again.')}</Text>}
      <Button
        title="Create account"
        loading={mutation.isPending}
        disabled={!form.name.trim() || !form.email.trim() || !form.password || weak}
        onPress={() => mutation.mutate()}
      />
    </AuthShell>
  );
}
