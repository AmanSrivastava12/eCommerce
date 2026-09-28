import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ordersApi } from '../../lib/api-client/resources';
import { errorMessage } from '../../lib/api-client/client';
import { confirmCancel, isCancellable } from '../../lib/orders';
import { RequireAuth } from '../../lib/auth/auth-context';
import { colors, font, formatDate, formatPrice, radius, spacing } from '../../lib/theme';
import { toast } from '../../components/feedback';
import { Badge, Card, Chip, EmptyState, ErrorState, Skeleton, statusTone } from '../../components/ui';

const STATUS_OPTIONS = [
  { value: '', label: 'All Orders' },
  { value: 'placed', label: 'Placed' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TIME_OPTIONS = [
  { value: '', label: 'Any time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '6m', label: 'Last 6 months' },
  { value: 'year', label: 'This year' },
  { value: 'older', label: 'Older' },
];

function timeRangeFor(value: string): { from?: string; to?: string } {
  const now = new Date();
  if (value === '30d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString() };
  }
  if (value === '6m') {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 6);
    return { from: from.toISOString() };
  }
  if (value === 'year') return { from: new Date(now.getFullYear(), 0, 1).toISOString() };
  if (value === 'older') return { to: new Date(now.getFullYear(), 0, 1).toISOString() };
  return {};
}

export default function OrdersScreen() {
  return (
    <RequireAuth next="/orders">
      <Orders />
    </RequireAuth>
  );
}

function Orders() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [time, setTime] = useState('');
  const range = useMemo(() => timeRangeFor(time), [time]);

  const { data: orders, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['orders', status, time],
    queryFn: () => ordersApi.list({ status: status || undefined, ...range }),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.info('Order cancelled');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not cancel the order')),
  });

  const filtered = Boolean(status || time);

  return (
    <FlatList
      data={isLoading ? [] : (orders ?? [])}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      refreshing={isRefetching}
      onRefresh={refetch}
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {STATUS_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} active={status === o.value} onPress={() => setStatus(o.value)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {TIME_OPTIONS.map((o) => (
              <Chip key={o.value} icon="time-outline" label={o.label} active={time === o.value} onPress={() => setTime(o.value)} />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        isLoading ? (
          <View style={{ gap: spacing.md }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} style={{ height: 100, borderRadius: radius.lg }} />
            ))}
          </View>
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : filtered ? (
          <EmptyState icon="receipt-outline" title="No orders match these filters" subtitle="Try a different status or time range." />
        ) : (
          <EmptyState
            icon="receipt-outline"
            title="No orders yet"
            subtitle="When you place an order, it will show up here."
            actionLabel="Start shopping"
            onAction={() => router.push('/search')}
          />
        )
      }
      renderItem={({ item: order }) => (
        <Pressable onPress={() => router.push(`/orders/${order.id}`)}>
          <Card style={{ gap: spacing.sm }}>
            <View style={styles.row}>
              <Text style={styles.orderId}>Order #{order.id.slice(0, 8)}</Text>
              <Badge label={order.status} tone={statusTone(order.status)} />
            </View>
            <Text style={font.caption}>
              {order.items.length} item{order.items.length === 1 ? '' : 's'} · {formatPrice(order.total)} · Placed {formatDate(order.created_at)}
            </Text>
            <View style={[styles.row, { justifyContent: 'flex-start', gap: spacing.lg }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={styles.link}>View details</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.brand} />
              </View>
              {isCancellable(order) && (
                <Pressable
                  hitSlop={8}
                  disabled={cancel.isPending}
                  onPress={async () => {
                    if (await confirmCancel()) cancel.mutate(order.id);
                  }}
                >
                  <Text style={[styles.link, { color: colors.danger }]}>Cancel order</Text>
                </Pressable>
              )}
            </View>
          </Card>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderId: { fontSize: 15, fontWeight: '600', color: colors.brand },
  link: { fontSize: 13, fontWeight: '600', color: colors.brand },
});
