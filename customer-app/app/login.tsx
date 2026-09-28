import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ApiError, errorMessage } from '../lib/api-client/client';
import { useAuth } from '../lib/auth/auth-context';
import { toast } from '../components/feedback';
import { AuthShell, authStyles } from '../components/auth-shell';
import { Button, Field, PasswordField } from '../components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: () => {
      toast.success('Signed in successfully');
      if (next) router.replace(next as Href);
      else if (router.canGoBack()) router.back();
      else router.replace('/');
    },
  });

  // Only a 401 means bad credentials; anything else (server down, no network) says so,
  // instead of blaming the password.
  const error = mutation.error
    ? mutation.error instanceof ApiError && mutation.error.status === 401
      ? 'Invalid email or password.'
      : errorMessage(mutation.error)
    : null;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back! Sign in to see your orders, wishlist and saved addresses."
      footer={
        <View style={authStyles.footer}>
          <Text style={authStyles.footerText}>No account?</Text>
          <Link href="/register" replace style={authStyles.link}>
            Register
          </Link>
        </View>
      }
    >
      <Field
        label="Email"
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      <PasswordField label="Password" value={password} onChangeText={setPassword} placeholder="Password" onSubmitEditing={() => mutation.mutate()} />
      <Link href="/forgot-password" style={[authStyles.link, { alignSelf: 'flex-end', fontSize: 13 }]}>
        Forgot password?
      </Link>
      {error && <Text style={authStyles.error}>{error}</Text>}
      <Button title="Sign in" loading={mutation.isPending} disabled={!email.trim() || !password} onPress={() => mutation.mutate()} />
    </AuthShell>
  );
}
