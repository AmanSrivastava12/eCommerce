import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../lib/auth/auth-context';
import { AuthShell } from '../../components/auth-shell';
import { Button, Field, PasswordField } from '../../components/ui';
import { toast } from '../../components/feedback';
import { ApiError, errorMessage } from '../../lib/api-client/client';
import { colors, spacing } from '../../lib/theme';

export default function LoginScreen() {
  const { me, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (me) {
    return <Redirect href="/" />;
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      toast.success('Signed in successfully');
    } catch (e) {
      const message = e instanceof ApiError && e.status === 401 ? 'Invalid email or password.' : errorMessage(e);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your store, orders and reviews."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>New to Shopwave?</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable hitSlop={6}>
              <Text style={styles.link}>Create a seller account</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      <View style={styles.fields}>
        <Field
          label="Email"
          icon="mail-outline"
          placeholder="you@business.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <PasswordField
          label="Password"
          placeholder="Your password"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleSubmit}
        />
        <Link href="/(auth)/forgot-password" asChild>
          <Pressable hitSlop={6} style={{ alignSelf: 'flex-end' }}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
        </Link>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Sign in" icon="log-in-outline" onPress={handleSubmit} loading={submitting} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.md },
  link: { color: colors.brand, fontWeight: '600', fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerText: { color: colors.muted, fontSize: 13 },
});
