import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { SellerFinance } from '../lib/api-client/types';
import { colors, formatPrice, radius, spacing } from '../lib/theme';
import type { IconName } from './ui';

/**
 * The seller's wallet: settled money they can withdraw, plus money still "in process" —
 * paid orders awaiting delivery, and delivered orders whose return window is still open.
 */
export function WalletCard({
  wallet,
  onPress,
  footer,
}: {
  wallet: SellerFinance['wallet'] | undefined;
  onPress?: () => void;
  footer?: React.ReactNode;
}) {
  const pending = (wallet?.inProcess ?? 0) + (wallet?.onHold ?? 0);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.card}>
      <View style={styles.top}>
        <View style={{ gap: 2 }}>
          <Text style={styles.eyebrow}>Available balance</Text>
          <Text style={styles.balance}>{wallet ? formatPrice(wallet.available) : '—'}</Text>
        </View>
        <View style={styles.walletIcon}>
          <Ionicons name="wallet" size={22} color={colors.brandForeground} />
        </View>
      </View>
      <View style={styles.row}>
        <Cell icon="time-outline" label="In process" value={wallet?.inProcess} hint="Awaiting delivery" />
        <View style={styles.divider} />
        <Cell icon="hourglass-outline" label="On hold" value={wallet?.onHold} hint="Return window open" />
      </View>
      {pending > 0 && (
        <Text style={styles.note}>
          {formatPrice(pending)} will be released once orders are delivered and their return windows close.
        </Text>
      )}
      {footer}
      {onPress && (
        <View style={styles.link}>
          <Text style={styles.linkText}>View billing & statements</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brandForeground} />
        </View>
      )}
    </Pressable>
  );
}

function Cell({ icon, label, value, hint }: { icon: IconName; label: string; value?: number; hint: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={13} color={colors.cream} />
        <Text style={styles.cellLabel}>{label}</Text>
      </View>
      <Text style={styles.cellValue}>{value == null ? '—' : formatPrice(value)}</Text>
      <Text style={styles.cellHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.brand, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { fontSize: 12, color: colors.cream, fontWeight: '500', letterSpacing: 0.3 },
  balance: { fontSize: 28, fontWeight: '700', color: colors.brandForeground },
  walletIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,248,239,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(255,248,239,0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  divider: { width: 1, backgroundColor: 'rgba(255,248,239,0.2)' },
  cellLabel: { fontSize: 12, color: colors.cream },
  cellValue: { fontSize: 17, fontWeight: '700', color: colors.brandForeground },
  cellHint: { fontSize: 11, color: 'rgba(255,248,239,0.7)' },
  note: { fontSize: 12, color: 'rgba(255,248,239,0.85)', lineHeight: 17 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  linkText: { fontSize: 13, fontWeight: '600', color: colors.brandForeground },
});
