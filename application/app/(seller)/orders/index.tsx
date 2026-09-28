import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { financeApi, sellerOrdersApi } from '../../../lib/api-client/resources';
import type { SellerOrderSummary } from '../../../lib/api-client/types';
import { WalletCard } from '../../../components/wallet-card';
import { Badge, Chip, EmptyState, Thumb, statusTone } from '../../../components/ui';
import { colors, formatDate, formatPrice, radius, spacing } from '../../../lib/theme';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'action', label: 'Needs action' },
  { key: 'returns', label: 'Returns' },
  { key: 'placed', label: 'Placed' },
  { key: 'paid', label: 'Paid' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];

function needsAction(o: SellerOrderSummary) {
  if (o.status === 'cancelled') return false;
  return o.items.some((i) => i.fulfillmentStatus !== 'delivered' || i.returnRequest?.status === 'requested' || i.returnRequest?.status === 'approved');
}

function matches(o: SellerOrderSummary, f: FilterKey) {
  if (f === 'all') return true;
  if (f === 'action') return needsAction(o);
  if (f === 'returns') return o.hasReturn;
  return o.status === f;
}

export default function SellerOrdersScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['seller-order-groups'], queryFn: () => sellerOrdersApi.groups() });
  const { data: finance, refetch: refetchFinance } = useQuery({ queryKey: ['seller-finance'], queryFn: financeApi.get });

  const orders = useMemo(() => (data ?? []).filter((o) => matches(o, filter)), [data, filter]);

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      refreshing={isRefetching}
      onRefresh={() => {
        refetch();
        refetchFinance();
      }}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <WalletCard wallet={finance?.wallet} onPress={() => router.push('/(seller)/billing')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {FILTERS.map((f) => {
              const count = data?.filter((o) => matches(o, f.key)).length;
              return (
                <Chip
                  key={f.key}
                  label={count != null && f.key !== 'all' ? `${f.label} (${count})` : f.label}
                  icon={f.key === 'returns' ? 'return-down-back' : f.key === 'action' ? 'alert-circle-outline' : undefined}
                  active={filter === f.key}
                  onPress={() => setFilter(f.key)}
                />
              );
            })}
          </ScrollView>
        </View>
      }
      renderItem={({ item }) => <OrderCard order={item} onPress={() => router.push(`/(seller)/orders/${item.id}`)} />}
      ListEmptyComponent={
        isLoading ? null : (
          <EmptyState icon="receipt-outline" title="No orders here" subtitle={filter === 'all' ? 'New orders will show up here.' : 'Try another filter.'} />
        )
      }
    />
  );
}

const RETURN_LABEL = { requested: 'Return requested', approved: 'Return approved', rejected: 'Return rejected', completed: 'Returned' } as const;

function OrderCard({ order, onPress }: { order: SellerOrderSummary; onPress: () => void }) {
  const first = order.items[0];
  const more = order.items.length - 1;
  const action = needsAction(order);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { borderColor: colors.brandLight }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
        </View>
        {order.hasReturn && order.returnStatus && (
          // Return orders are flagged right on the card instead of living in a separate tab.
          <View style={[styles.returnTag, order.returnStatus === 'rejected' && { backgroundColor: colors.surface }]} accessibilityLabel={RETURN_LABEL[order.returnStatus]}>
            <Ionicons name="return-down-back" size={13} color={order.returnStatus === 'rejected' ? colors.muted : colors.danger} />
            <Text style={[styles.returnText, order.returnStatus === 'rejected' && { color: colors.muted }]}>{RETURN_LABEL[order.returnStatus]}</Text>
          </View>
        )}
        <Badge label={order.status} tone={statusTone(order.status)} />
      </View>

      <View style={styles.body}>
        <View style={styles.thumbs}>
          <Thumb uri={first?.image} size={60} />
          {more > 0 && (
            <View style={styles.moreBadge}>
              <Text style={styles.moreText}>+{more}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.title} numberOfLines={2}>
            {first?.title}
            {more > 0 ? ` and ${more} more` : ''}
          </Text>
          <Text style={styles.meta}>
            {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {order.items.map((i) => i.sku).join(', ')}
          </Text>
          <Text style={styles.total}>{formatPrice(order.sellerSubtotal)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>

      {action && (
        <View style={styles.actionRow}>
          <Ionicons name="alert-circle" size={14} color={colors.brandLight} />
          <Text style={styles.actionText}>
            {order.items.some((i) => i.returnRequest?.status === 'requested')
              ? 'Return request waiting for your review'
              : order.items.some((i) => i.fulfillmentStatus === 'pending')
                ? 'Ready to ship'
                : 'In transit — mark delivered once it arrives'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orderId: { fontSize: 13, fontWeight: '700', color: colors.foreground, letterSpacing: 0.4 },
  date: { fontSize: 12, color: colors.muted },
  returnTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  returnText: { fontSize: 11, fontWeight: '600', color: colors.danger },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumbs: { position: 'relative' },
  moreBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    backgroundColor: colors.foreground,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 2,
    borderColor: colors.card,
  },
  moreText: { fontSize: 10, fontWeight: '700', color: colors.surface },
  title: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  meta: { fontSize: 12, color: colors.muted },
  total: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  actionText: { fontSize: 12, fontWeight: '500', color: colors.brand },
});
