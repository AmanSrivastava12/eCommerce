import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { financeApi } from '../../../lib/api-client/resources';
import { errorMessage } from '../../../lib/api-client/client';
import type { Transaction } from '../../../lib/api-client/types';
import { SETTLEMENT_LABEL, autoGranularity, bucketize, startOfDay, type Granularity } from '../../../lib/finance';
import { CashFlowChart, RankedBars, TrendChart } from '../../../components/charts';
import { WalletCard } from '../../../components/wallet-card';
import { confirm, toast } from '../../../components/feedback';
import { Badge, Button, Chip, DateField, EmptyState, Section, Segmented, Thumb, type IconName } from '../../../components/ui';
import { colors, formatDate, formatPrice, radius, spacing } from '../../../lib/theme';

type Preset = 'week' | 'month' | 'last_month' | '3m' | 'year' | 'all' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: '3m', label: '3 months' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom' },
];

type TxnFilter = 'all' | 'in' | 'out' | 'sale' | 'refund' | 'payout';
const TXN_FILTERS: { key: TxnFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'Money in' },
  { key: 'out', label: 'Money out' },
  { key: 'sale', label: 'Sales' },
  { key: 'refund', label: 'Refunds' },
  { key: 'payout', label: 'Bank transfers' },
];

function presetRange(p: Preset, txns: Transaction[], custom: { from: Date; to: Date }) {
  const now = new Date();
  const today = startOfDay(now);
  const end = new Date(today.getTime() + 86_400_000 - 1);
  switch (p) {
    case 'week':
      return { from: new Date(today.getTime() - 6 * 86_400_000), to: end };
    case 'month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: end };
    case 'last_month':
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
    case '3m':
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: end };
    case 'year':
      return { from: new Date(now.getFullYear(), 0, 1), to: end };
    case 'all': {
      const oldest = txns.length ? new Date(txns[txns.length - 1].date) : today;
      return { from: startOfDay(oldest), to: end };
    }
    case 'custom':
      return { from: startOfDay(custom.from), to: new Date(startOfDay(custom.to).getTime() + 86_400_000 - 1) };
  }
}

const TXN_ICON: Record<Transaction['type'], IconName> = { sale: 'bag-check-outline', refund: 'return-down-back', payout: 'business-outline' };

export default function BillingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['seller-finance'], queryFn: financeApi.get });
  const [preset, setPreset] = useState<Preset>('month');
  const [custom, setCustom] = useState(() => ({ from: new Date(Date.now() - 29 * 86_400_000), to: new Date() }));
  const [granularity, setGranularity] = useState<Granularity | 'auto'>('auto');
  const [txnFilter, setTxnFilter] = useState<TxnFilter>('all');
  const [visible, setVisible] = useState(15);

  const transactions = data?.transactions ?? [];
  const range = presetRange(preset, transactions, custom);
  const g = granularity === 'auto' ? autoGranularity(range.from, range.to) : granularity;

  const inRange = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= range.from && d <= range.to;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, range.from.getTime(), range.to.getTime()],
  );
  const buckets = useMemo(() => bucketize(inRange, range.from, range.to, g), [inRange, range.from, range.to, g]);
  const totals = useMemo(() => {
    const t = { in: 0, out: 0, refunds: 0, payouts: 0, sales: 0 };
    for (const x of inRange) {
      if (x.direction === 'in') t.in += x.amount;
      else t.out += x.amount;
      if (x.type === 'refund') t.refunds += x.amount;
      if (x.type === 'payout') t.payouts += x.amount;
      if (x.type === 'sale') t.sales += 1;
    }
    return t;
  }, [inRange]);

  const topProducts = useMemo(() => {
    const byProduct = new Map<string, { label: string; value: number; units: number }>();
    for (const t of inRange) {
      if (t.type !== 'sale' || !t.productId) continue;
      const label = t.description.replace(/ × \d+$/, '');
      const units = Number(t.description.match(/ × (\d+)$/)?.[1] ?? 1);
      const row = byProduct.get(t.productId) ?? { label, value: 0, units: 0 };
      row.value += t.amount;
      row.units += units;
      byProduct.set(t.productId, row);
    }
    return [...byProduct.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((r) => ({ label: r.label, value: r.value, sub: `${r.units} unit${r.units === 1 ? '' : 's'} sold` }));
  }, [inRange]);

  const monthly = useMemo(() => {
    const map = new Map<string, { key: string; date: Date; in: number; out: number }>();
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const row = map.get(key) ?? { key, date: new Date(d.getFullYear(), d.getMonth(), 1), in: 0, out: 0 };
      if (t.direction === 'in') row.in += t.amount;
      else row.out += t.amount;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);
  }, [transactions]);

  const listed = inRange.filter((t) =>
    txnFilter === 'all' ? true : txnFilter === 'in' || txnFilter === 'out' ? t.direction === txnFilter : t.type === txnFilter,
  );

  const withdraw = useMutation({
    mutationFn: () => financeApi.withdraw(),
    onSuccess: () => {
      toast.success('Transfer initiated to your bank account');
      queryClient.invalidateQueries({ queryKey: ['seller-finance'] });
    },
    onError: (e) => toast.error(errorMessage(e, 'Withdrawal failed')),
  });

  const onWithdraw = async () => {
    if (!data) return;
    if (!data.bankAccount) {
      toast.info('Add a bank account first');
      router.push('/(seller)/billing/bank-account');
      return;
    }
    const ok = await confirm({
      title: `Withdraw ${formatPrice(data.wallet.available)}?`,
      message: `The full available balance will be transferred to ${data.bankAccount.bankName} ••${data.bankAccount.accountLast4}.`,
      confirmLabel: 'Withdraw',
      icon: 'arrow-up-circle-outline',
    });
    if (ok) withdraw.mutate();
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
    >
      <WalletCard
        wallet={data?.wallet}
        footer={
          <Pressable
            onPress={onWithdraw}
            disabled={withdraw.isPending || !data || data.wallet.available < 1}
            style={({ pressed }) => [styles.withdraw, (pressed || withdraw.isPending) && { opacity: 0.85 }, (!data || data.wallet.available < 1) && { opacity: 0.5 }]}
          >
            {withdraw.isPending ? <ActivityIndicator color={colors.brand} size="small" /> : <Ionicons name="arrow-up-circle-outline" size={18} color={colors.brand} />}
            <Text style={styles.withdrawText}>{data && data.wallet.available >= 1 ? 'Withdraw to bank' : 'Nothing to withdraw yet'}</Text>
          </Pressable>
        }
      />

      <View style={styles.stats}>
        <Stat label="Lifetime earnings" value={data?.wallet.lifetimeEarnings} />
        <Stat label="Refunded" value={data?.wallet.totalRefunded} />
        <Stat label="Paid to bank" value={data?.wallet.totalPaidOut} />
      </View>

      <Section
        title="Bank account"
        icon="business-outline"
        action={<Button title={data?.bankAccount ? 'Edit' : 'Add'} size="sm" variant="secondary" icon={data?.bankAccount ? 'create-outline' : 'add'} onPress={() => router.push('/(seller)/billing/bank-account')} />}
      >
        {data?.bankAccount ? (
          <View style={{ gap: 2 }}>
            <Text style={styles.bankName}>
              {data.bankAccount.bankName} ••{data.bankAccount.accountLast4}
            </Text>
            <Text style={styles.muted}>
              {data.bankAccount.accountHolderName} · IFSC {data.bankAccount.ifsc}
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>Add the account where your earnings should be transferred.</Text>
        )}
      </Section>

      <View style={{ gap: spacing.sm }}>
        <Text style={styles.sectionTitle}>Reports</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {PRESETS.map((p) => (
            <Chip key={p.key} label={p.label} icon={p.key === 'custom' ? 'calendar-outline' : undefined} active={preset === p.key} onPress={() => { setPreset(p.key); setVisible(15); }} />
          ))}
        </ScrollView>
        {preset === 'custom' && (
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <DateField containerStyle={{ flex: 1 }} label="From" value={custom.from} maximumDate={custom.to} onChange={(d) => setCustom((c) => ({ ...c, from: d }))} />
            <DateField containerStyle={{ flex: 1 }} label="To" value={custom.to} minimumDate={custom.from} maximumDate={new Date()} onChange={(d) => setCustom((c) => ({ ...c, to: d }))} />
          </View>
        )}
        <Text style={styles.muted}>
          {formatDate(range.from)} – {formatDate(range.to)}
        </Text>
      </View>

      <View style={styles.stats}>
        <Kpi label="Money in" value={totals.in} icon="arrow-down-circle-outline" sub={`${totals.sales} sale${totals.sales === 1 ? '' : 's'}`} />
        <Kpi label="Money out" value={totals.out} icon="arrow-up-circle-outline" sub={`${formatPrice(totals.refunds)} refunds`} />
        <Kpi label="Net" value={totals.in - totals.out} icon="swap-vertical-outline" sub={`${formatPrice(totals.payouts)} to bank`} />
      </View>

      <Section title="Cash flow" icon="bar-chart-outline" subtitle="Money in vs out per period">
        <Segmented
          value={granularity}
          onChange={setGranularity}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'day', label: 'Daily' },
            { value: 'week', label: 'Weekly' },
            { value: 'month', label: 'Monthly' },
          ]}
        />
        {inRange.length ? <CashFlowChart buckets={buckets} /> : <Text style={styles.muted}>No transactions in this period.</Text>}
      </Section>

      {inRange.length > 0 && (
        <Section title="Net earnings trend" icon="trending-up-outline" subtitle="Running total of money in minus money out">
          <TrendChart buckets={buckets} />
        </Section>
      )}

      {topProducts.length > 0 && (
        <Section title="Top products" icon="podium-outline" subtitle="By sales value in this period">
          <RankedBars rows={topProducts} />
        </Section>
      )}

      {monthly.length > 0 && (
        <Section title="Monthly statements" icon="document-text-outline" subtitle="Tap a month to filter the report">
          {monthly.map((m, i) => (
            <Pressable
              key={m.key}
              onPress={() => {
                const from = m.date;
                const to = new Date(from.getFullYear(), from.getMonth() + 1, 0);
                setCustom({ from, to: to > new Date() ? new Date() : to });
                setPreset('custom');
              }}
              style={[styles.statementRow, i > 0 && styles.divider]}
            >
              <Text style={styles.statementMonth}>{m.date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.statementNet}>{formatPrice(m.in - m.out)}</Text>
                <Text style={styles.muted}>
                  in {formatPrice(m.in)} · out {formatPrice(m.out)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </Section>
      )}

      <Section title="Transactions" icon="list-outline" subtitle={`${listed.length} in this period`}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {TXN_FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} active={txnFilter === f.key} onPress={() => { setTxnFilter(f.key); setVisible(15); }} />
          ))}
        </ScrollView>
        {listed.length === 0 ? (
          <EmptyState icon="receipt-outline" title="No transactions" subtitle="Try a different period or filter." />
        ) : (
          listed.slice(0, visible).map((t, i) => (
            <TransactionRow key={t.id} txn={t} first={i === 0} onPress={t.orderId ? () => router.push(`/(seller)/orders/${t.orderId}`) : undefined} />
          ))
        )}
        {listed.length > visible && <Button title={`Show more (${listed.length - visible})`} variant="secondary" size="sm" onPress={() => setVisible((v) => v + 20)} />}
      </Section>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value == null ? '—' : formatPrice(value)}</Text>
    </View>
  );
}

function Kpi({ label, value, icon, sub }: { label: string; value: number; icon: IconName; sub: string }) {
  return (
    <View style={styles.stat}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons name={icon} size={14} color={colors.brand} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{formatPrice(value)}</Text>
      <Text style={styles.kpiSub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

function TransactionRow({ txn, first, onPress }: { txn: Transaction; first: boolean; onPress?: () => void }) {
  const isIn = txn.direction === 'in';
  const status =
    txn.type === 'sale'
      ? SETTLEMENT_LABEL[txn.status as keyof typeof SETTLEMENT_LABEL] ?? txn.status
      : txn.type === 'payout'
        ? txn.status === 'paid' ? 'Transferred' : txn.status
        : 'Refunded';
  const tone = txn.type === 'sale' ? (txn.status === 'settled' ? 'success' : txn.status === 'refunded' ? 'danger' : 'warning') : txn.type === 'payout' ? 'success' : 'danger';
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.txn, !first && styles.divider]}>
      {txn.image ? (
        <Thumb uri={txn.image} size={40} />
      ) : (
        <View style={styles.txnIcon}>
          <Ionicons name={TXN_ICON[txn.type]} size={18} color={colors.brand} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.txnTitle} numberOfLines={1}>
          {txn.description}
        </Text>
        <Text style={styles.muted} numberOfLines={1}>
          {formatDate(txn.date)}
          {txn.reference ? ` · ${txn.reference}` : txn.orderId ? ` · #${txn.orderId.slice(0, 8).toUpperCase()}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Badge label={status} tone={tone} />
          {txn.type === 'sale' && txn.availableOn && txn.status !== 'settled' && txn.status !== 'refunded' && (
            <Text style={styles.kpiSub}>releases {formatDate(txn.availableOn)}</Text>
          )}
        </View>
      </View>
      <Text style={[styles.txnAmount, { color: isIn ? colors.success : colors.foreground }]}>
        {isIn ? '+' : '−'}
        {formatPrice(txn.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  withdraw: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandForeground,
    borderRadius: radius.md,
    paddingVertical: 11,
  },
  withdrawText: { fontSize: 15, fontWeight: '600', color: colors.brand },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 3,
  },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  kpiSub: { fontSize: 11, color: colors.muted },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground, marginTop: spacing.sm },
  muted: { fontSize: 12, color: colors.muted },
  bankName: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  statementRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 4 },
  statementMonth: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.foreground },
  statementNet: { fontSize: 14, fontWeight: '700', color: colors.foreground },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  txn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  txnIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  txnTitle: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  txnAmount: { fontSize: 15, fontWeight: '700' },
});
