import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, font, radius, spacing } from '../lib/theme';
import type { IconName } from './ui';
import { KeyboardScrollView, FormKeyboardToolbar } from './keyboard';

// Shared frame for the signed-out screens: brand mark, title block, and a card for the form.
export function AuthShell({
  icon = 'storefront',
  title,
  subtitle,
  children,
  footer,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    // No bottom safe-area edge: the keyboard toolbar anchors to the screen's real bottom so it
    // sits flush on the keyboard; the scroll content pads for the home indicator instead.
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <KeyboardScrollView withToolbar contentContainerStyle={[styles.container, { paddingBottom: spacing.lg + insets.bottom }]} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name={icon} size={26} color={colors.brandForeground} />
            </View>
            <Text style={styles.brandName}>Shopwave Seller Hub</Text>
          </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.lg },
  brand: { alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 15, fontWeight: '600', color: colors.brand, letterSpacing: 0.3 },
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
