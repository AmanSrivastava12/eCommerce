import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useAuth } from '../../lib/auth/auth-context';
import { errorMessage } from '../../lib/api-client/client';
import { AuthShell } from '../../components/auth-shell';
import { toast } from '../../components/feedback';
import { Button, Field, MIN_PASSWORD_SCORE, PasswordField, PasswordStrength, passwordScore } from '../../components/ui';
import { colors, spacing } from '../../lib/theme';

export default function RegisterScreen() {
  const { me, register } = useAuth();
  const [form, setForm] = useState({ name: '', businessName: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  if (me) return <Redirect href="/" />;

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const weak = form.password.length > 0 && passwordScore(form.password) < MIN_PASSWORD_SCORE;

  const submit = async () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Enter your name';
    if (!form.businessName.trim()) e.businessName = 'Enter your business name';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter a valid email';
    if (form.password.length < 8) e.password = 'Use at least 8 characters';
    else if (weak) e.password = 'Choose a stronger password';
    if (form.confirm !== form.password) e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name.trim(),
        businessName: form.businessName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.success('Account created — welcome to Shopwave Seller Hub!');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create your account.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      icon="storefront"
      title="Start selling"
      subtitle="Create a seller account. New accounts are reviewed before products go live."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable hitSlop={6}>
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      }
    >
      <View style={{ gap: spacing.md }}>
        <Field label="Full name" icon="person-outline" value={form.name} onChangeText={set('name')} error={errors.name} autoComplete="name" />
        <Field label="Business name" icon="storefront-outline" value={form.businessName} onChangeText={set('businessName')} error={errors.businessName} />
        <Field
          label="Email"
          icon="mail-outline"
          placeholder="you@business.com"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
        />
        <View style={{ gap: spacing.sm }}>
          <PasswordField label="Password" placeholder="At least 8 characters" value={form.password} onChangeText={set('password')} error={errors.password} autoComplete="new-password" />
          <PasswordStrength password={form.password} />
        </View>
        <PasswordField label="Confirm password" placeholder="Re-enter password" value={form.confirm} onChangeText={set('confirm')} error={errors.confirm} />
      </View>
      <Button title="Create account" icon="person-add-outline" onPress={submit} loading={submitting} disabled={weak} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  footerText: { color: colors.muted, fontSize: 13 },
  link: { color: colors.brand, fontWeight: '600', fontSize: 13 },
});
