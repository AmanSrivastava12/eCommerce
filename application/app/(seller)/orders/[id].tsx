import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { sellerOrdersApi, sellerReturnsApi } from '../../../lib/api-client/resources';
import { errorMessage } from '../../../lib/api-client/client';
import type { SellerOrderDetail, SellerOrderLine } from '../../../lib/api-client/types';
import { SETTLEMENT_LABEL, SETTLEMENT_TONE } from '../../../lib/finance';
import { confirm, toast } from '../../../components/feedback';
import { Badge, Button, EmptyState, InfoRow, Section, Thumb, statusTone, type IconName } from '../../../components/ui';
import { colors, formatDate, formatPrice, radius, spacing } from '../../../lib/theme';

function formatDateTime(v: string | null | undefined) {
  if (!v) return '';
  return new Date(v).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: order, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['seller-order', id],
    queryFn: () => sellerOrdersApi.get(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['seller-order', id] });
    queryClient.invalidateQueries({ queryKey: ['seller-order-groups'] });
    queryClient.invalidateQueries({ queryKey: ['seller-finance'] });
  };

  const fulfill = useMutation({
    mutationFn: (v: { itemId: string; status: 'shipped' | 'delivered' }) => sellerOrdersApi.fulfill(id, v.itemId, v.status),
    onSuccess: (_d, v) => {
      toast.success(v.status === 'shipped' ? 'Marked as shipped' : 'Marked as delivered');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not update the item')),
  });

  const updateReturn = useMutation({
    mutationFn: (v: { returnId: string; status: 'approved' | 'rejected' | 'completed' }) => sellerReturnsApi.update(v.returnId, v.status),
    onSuccess: (_d, v) => {
      toast.success(v.status === 'approved' ? 'Return approved' : v.status === 'rejected' ? 'Return rejected' : 'Return completed');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not update the return')),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }
  if (isError || !order) {
    return (
      <View style={styles.center}>
        <EmptyState icon="alert-circle-outline" title="Couldn't load this order" subtitle="Pull to refresh or go back and try again." />
        <Button title="Retry" variant="secondary" onPress={() => refetch()} />
      </View>
    );
  }

  const markFulfilled = async (item: SellerOrderLine, status: 'shipped' | 'delivered') => {
    const ok = await confirm({
      title: status === 'shipped' ? 'Mark as shipped?' : 'Mark as delivered?',
      message:
        status === 'shipped'
          ? `${item.title} (×${item.quantity}) will be marked as handed to the courier.`
          : `Confirm ${item.title} reached the customer. ${item.returnWindowDays ? `Its ${item.returnWindowDays}-day return window starts now.` : ''}`,
      confirmLabel: status === 'shipped' ? 'Mark shipped' : 'Mark delivered',
      icon: status === 'shipped' ? 'cube-outline' : 'checkmark-done',
    });
    if (ok) fulfill.mutate({ itemId: item.id, status });
  };

  const actOnReturn = async (item: SellerOrderLine, status: 'approved' | 'rejected' | 'completed') => {
    if (!item.returnRequest) return;
    const copy = {
      approved: { title: 'Approve this return?', message: `${formatPrice(item.subtotal)} will be refunded to the customer and deducted from your earnings.`, label: 'Approve', danger: false, icon: 'checkmark-circle-outline' as IconName },
      rejected: { title: 'Reject this return?', message: 'The customer will be told the return was declined and the sale will settle normally.', label: 'Reject', danger: true, icon: 'close-circle-outline' as IconName },
      completed: { title: 'Mark return completed?', message: 'Confirm you have received the returned item back.', label: 'Mark completed', danger: false, icon: 'checkmark-done' as IconName },
    }[status];
    const ok = await confirm({ title: copy.title, message: copy.message, confirmLabel: copy.label, danger: copy.danger, icon: copy.icon });
    if (ok) updateReturn.mutate({ returnId: item.returnRequest.id, status });
  };

  const address = order.shippingAddress;
  const returns = order.items.filter((i) => i.returnRequest);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
    >
      <Stack.Screen options={{ title: `Order #${order.id.slice(0, 8).toUpperCase()}` }} />

      <View style={styles.hero}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.heroLabel}>Placed {formatDateTime(order.createdAt)}</Text>
          <Text style={styles.heroTitle}>{order.customer.name}</Text>
          <Text style={styles.heroLabel}>
            {order.items.reduce((n, i) => n + i.quantity, 0)} item(s) · {formatPrice(order.breakdown.customerPaid)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge label={order.status} tone={statusTone(order.status)} />
          {returns.length > 0 && (
            <View style={styles.returnTag}>
              <Ionicons name="return-down-back" size={12} color={colors.danger} />
              <Text style={styles.returnText}>Return order</Text>
            </View>
          )}
        </View>
      </View>

      <Timeline order={order} />

      {returns.map((item) => (
        <Section key={item.id} title="Return request" icon="return-down-back" subtitle={`${item.title} · requested ${formatDate(item.returnRequest!.createdAt)}`}>
          <View style={styles.reason}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.muted} />
            <Text style={styles.reasonText}>{item.returnRequest!.reason}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Status</Text>
            <Badge label={item.returnRequest!.status} tone={statusTone(item.returnRequest!.status)} />
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Refund amount</Text>
            <Text style={styles.value}>{formatPrice(item.subtotal)}</Text>
          </View>
          {item.returnRequest!.status === 'requested' && (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Reject" icon="close" variant="danger" style={{ flex: 1 }} onPress={() => actOnReturn(item, 'rejected')} disabled={updateReturn.isPending} />
              <Button title="Approve" icon="checkmark" style={{ flex: 1 }} onPress={() => actOnReturn(item, 'approved')} loading={updateReturn.isPending} />
            </View>
          )}
          {item.returnRequest!.status === 'approved' && (
            <Button title="Mark return completed" icon="checkmark-done" onPress={() => actOnReturn(item, 'completed')} loading={updateReturn.isPending} />
          )}
        </Section>
      ))}

      <Section title="Items" icon="cube-outline" subtitle={order.orderTotals.otherSellersItems ? 'Only your items from this order are shown' : undefined}>
        {order.items.map((item, idx) => (
          <View key={item.id} style={[styles.item, idx > 0 && styles.itemDivider]}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Thumb uri={item.image} size={64} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.itemTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.muted}>SKU {item.sku}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.value}>
                    {item.quantity} × {formatPrice(item.unitPrice)}
                  </Text>
                  {item.mrp > item.unitPrice && <Text style={styles.strike}>{formatPrice(item.mrp)}</Text>}
                </View>
              </View>
              <Text style={styles.itemTotal}>{formatPrice(item.subtotal)}</Text>
            </View>
            <View style={styles.badges}>
              <Badge label={item.fulfillmentStatus} tone={statusTone(item.fulfillmentStatus)} />
              <Badge label={SETTLEMENT_LABEL[item.settlement]} tone={SETTLEMENT_TONE[item.settlement]} />
            </View>
            {item.settlement === 'return_window' && item.returnWindowEndsAt && (
              <Text style={styles.hint}>
                <Ionicons name="hourglass-outline" size={11} /> Earnings release on {formatDate(item.returnWindowEndsAt)} when the {item.returnWindowDays}-day return window closes.
              </Text>
            )}
            {order.status !== 'cancelled' && item.fulfillmentStatus === 'pending' && (
              <Button title="Mark shipped" icon="cube-outline" size="sm" style={styles.itemAction} onPress={() => markFulfilled(item, 'shipped')} loading={fulfill.isPending && fulfill.variables?.itemId === item.id} />
            )}
            {order.status !== 'cancelled' && item.fulfillmentStatus === 'shipped' && (
              <Button title="Mark delivered" icon="checkmark-done" size="sm" style={styles.itemAction} onPress={() => markFulfilled(item, 'delivered')} loading={fulfill.isPending && fulfill.variables?.itemId === item.id} />
            )}
          </View>
        ))}
      </Section>

      <Section title="Price breakdown" icon="calculator-outline">
        <Line label="Items at MRP" value={formatPrice(order.breakdown.mrpTotal)} />
        {order.breakdown.productDiscount > 0 && <Line label="Product discount" value={`−${formatPrice(order.breakdown.productDiscount)}`} accent />}
        <Line label="Selling price" value={formatPrice(order.breakdown.sellerSubtotal)} />
        {order.breakdown.couponDiscount > 0 && (
          <Line label={`Coupon ${order.breakdown.couponCodes.join(', ')}`} value={`−${formatPrice(order.breakdown.couponDiscount)}`} accent />
        )}
        <Line label="Shipping" value={order.breakdown.shipping > 0 ? `+${formatPrice(order.breakdown.shipping)}` : 'Free'} />
        {order.breakdown.tax > 0 && <Line label="Tax" value={`+${formatPrice(order.breakdown.tax)}`} />}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Customer paid</Text>
          <Text style={styles.totalValue}>{formatPrice(order.breakdown.customerPaid)}</Text>
        </View>
        {order.breakdown.refunded > 0 && <Line label="Refunded" value={`−${formatPrice(order.breakdown.refunded)}`} accent />}
        <View style={styles.earnings}>
          <View style={{ flex: 1 }}>
            <Text style={styles.earningsLabel}>Your earnings</Text>
            <Text style={styles.hint}>Coupons are funded by Shopwave and don't reduce your payout.</Text>
          </View>
          <Text style={styles.earningsValue}>{formatPrice(order.breakdown.sellerEarnings)}</Text>
        </View>
        {order.orderTotals.otherSellersItems && (
          <Text style={styles.hint}>
            Full order total (all sellers): {formatPrice(order.orderTotals.total)} incl. {formatPrice(order.orderTotals.discount)} discount.
          </Text>
        )}
      </Section>

      <Section title="Payment" icon="card-outline">
        <View style={styles.rowBetween}>
          <Text style={styles.muted}>Status</Text>
          <Badge
            label={order.payment.status === 'succeeded' ? 'Paid' : order.payment.status === 'requires_payment' ? 'Awaiting payment' : order.payment.status}
            tone={order.payment.status === 'succeeded' ? 'success' : order.payment.status === 'requires_payment' ? 'warning' : 'danger'}
          />
        </View>
        <InfoRow icon="wallet-outline" label="Method" value={order.payment.method} />
        <InfoRow icon="cash-outline" label="Amount" value={formatPrice(order.payment.amount)} />
        <InfoRow icon="time-outline" label="Paid on" value={formatDateTime(order.payment.paidAt)} />
        <InfoRow icon="barcode-outline" label="Reference" value={order.payment.reference} />
      </Section>

      <Section title="Ship to" icon="location-outline">
        <Text style={styles.value}>{String(address.label ?? order.customer.name)}</Text>
        <Text style={styles.address}>
          {[address.line1, address.line2].filter(Boolean).join(', ')}
          {'\n'}
          {[address.city, address.state, address.postalCode].filter(Boolean).join(', ')}
          {address.country ? `\n${address.country}` : ''}
        </Text>
        <InfoRow icon="call-outline" label="Phone" value={order.shippingPhone} />
      </Section>
    </ScrollView>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={[styles.value, accent && { color: colors.discount }]}>{value}</Text>
    </View>
  );
}

function Timeline({ order }: { order: SellerOrderDetail }) {
  const firstShipped = order.items.map((i) => i.shippedAt).filter(Boolean).sort()[0] ?? null;
  const allDelivered = order.items.every((i) => i.fulfillmentStatus === 'delivered');
  const lastDelivered = allDelivered ? (order.items.map((i) => i.deliveredAt).filter(Boolean).sort().pop() ?? null) : null;
  const paid = order.payment.status === 'succeeded';
  const steps: { label: string; done: boolean; at: string | null; icon: IconName }[] =
    order.status === 'cancelled'
      ? [
          { label: 'Placed', done: true, at: order.createdAt, icon: 'bag-check-outline' },
          { label: 'Cancelled', done: true, at: order.updatedAt, icon: 'close-circle-outline' },
        ]
      : [
          { label: 'Placed', done: true, at: order.createdAt, icon: 'bag-check-outline' },
          { label: 'Paid', done: paid, at: order.payment.paidAt, icon: 'card-outline' },
          { label: 'Shipped', done: order.items.some((i) => i.fulfillmentStatus !== 'pending'), at: firstShipped, icon: 'cube-outline' },
          { label: 'Delivered', done: allDelivered, at: lastDelivered, icon: 'home-outline' },
        ];
  return (
    <View style={styles.timeline}>
      {steps.map((s, i) => (
        <View key={s.label} style={styles.step}>
          <View style={styles.stepTrack}>
            {i > 0 && <View style={[styles.stepLine, styles.stepLineLeft, s.done && styles.stepLineDone]} />}
            <View style={[styles.stepDot, s.done && styles.stepDotDone, s.label === 'Cancelled' && { backgroundColor: colors.danger, borderColor: colors.danger }]}>
              <Ionicons name={s.icon} size={13} color={s.done ? colors.brandForeground : colors.muted} />
            </View>
            {i < steps.length - 1 && <View style={[styles.stepLine, styles.stepLineRight, steps[i + 1].done && styles.stepLineDone]} />}
          </View>
          <Text style={[styles.stepLabel, s.done && { color: colors.foreground }]}>{s.label}</Text>
          <Text style={styles.stepDate}>{s.done && s.at ? formatDate(s.at) : ' '}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  hero: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heroLabel: { fontSize: 12, color: colors.muted },
  heroTitle: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  returnTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.dangerSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  returnText: { fontSize: 11, fontWeight: '600', color: colors.danger },
  timeline: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  stepTrack: { width: '100%', alignItems: 'center', justifyContent: 'center', height: 28 },
  stepLine: { position: 'absolute', top: 13, height: 2, backgroundColor: colors.border },
  stepLineLeft: { left: 0, right: '50%' },
  stepLineRight: { left: '50%', right: 0 },
  stepLineDone: { backgroundColor: colors.brand },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  stepLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
  stepDate: { fontSize: 10, color: colors.muted },
  reason: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  reasonText: { flex: 1, fontSize: 14, color: colors.foreground, lineHeight: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  muted: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  value: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  strike: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  hint: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  item: { gap: spacing.sm },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  itemTotal: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  itemAction: { alignSelf: 'flex-start' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: colors.foreground },
  totalValue: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  earnings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  earningsLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  earningsValue: { fontSize: 18, fontWeight: '700', color: colors.brand },
  address: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
});
