import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../lib/theme';
import { KeyboardScrollView, FormKeyboardToolbar } from './keyboard';

// Shared frame for the sign-in / register / password screens: brand mark, title block, and
// a card for the form (the website renders the same forms as a centered card).
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <View style={{ flex: 1 }}>
      <KeyboardScrollView withToolbar contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>Shopwave</Text>
        <View style={styles.card}>
          <View style={{ gap: 4 }}>
            <Text style={font.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {children}
        </View>
        {footer}
      </KeyboardScrollView>
      <FormKeyboardToolbar />
    </View>
  );
}

export const authStyles = StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  footerText: { fontSize: 14, color: colors.muted },
  link: { fontSize: 14, fontWeight: '600', color: colors.brand },
  error: { fontSize: 13, color: colors.danger },
});

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  brand: { textAlign: 'center', fontSize: 26, fontWeight: '700', letterSpacing: -0.3, color: colors.brand },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});
