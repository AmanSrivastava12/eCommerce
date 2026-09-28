import { Fragment, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ordersApi, productsApi, returnsApi } from '../../lib/api-client/resources';
import { errorMessage } from '../../lib/api-client/client';
import { RequireAuth } from '../../lib/auth/auth-context';
import { confirmCancel, isCancellable, ORDER_STEPS } from '../../lib/orders';
import { colors, font, formatDate, formatPrice, radius, spacing } from '../../lib/theme';
import { toast } from '../../components/feedback';
import { Badge, Button, Card, ErrorState, Field, Skeleton, Thumb, statusTone } from '../../components/ui';
import { KeyboardScrollView } from '../../components/keyboard';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireAuth next={`/orders/${id}`}>
      <OrderDetail />
    </RequireAuth>
  );
}

function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});
  const [openReturnFor, setOpenReturnFor] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<Record<string, string>>({});

  const { data: order, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
  });
  const { data: myReturns } = useQuery({ queryKey: ['my-returns'], queryFn: returnsApi.mine });

  const uniqueProductIds = [...new Set((order?.items ?? []).map((i) => i.product_id))];
  const productQueries = useQueries({
    queries: uniqueProductIds.map((productId) => ({
      queryKey: ['product', productId],
      queryFn: () => productsApi.getById(productId),
    })),
  });
  const productById = new Map(uniqueProductIds.map((productId, i) => [productId, productQueries[i]?.data?.product]));

  const cancel = useMutation({
    mutationFn: () => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.info('Order cancelled');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not cancel the order')),
  });

  const requestReturn = useMutation({
    mutationFn: (itemId: string) => ordersApi.requestReturn(id, itemId, reason[itemId] ?? ''),
    onSuccess: (_data, itemId) => {
      setOpenReturnFor(null);
      setReason((r) => ({ ...r, [itemId]: '' }));
      setReturnError((r) => ({ ...r, [itemId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['my-returns'] });
      toast.success('Return requested');
    },
    onError: (err, itemId) => setReturnError((r) => ({ ...r, [itemId]: errorMessage(err, 'Could not submit return request') })),
  });

  if (isLoading) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Skeleton style={{ height: 120, borderRadius: radius.lg }} />
        <Skeleton style={{ height: 90, borderRadius: radius.lg }} />
        <Skeleton style={{ height: 160, borderRadius: radius.lg }} />
      </View>
    );
  }
  if (isError || !order) return <ErrorState onRetry={() => refetch()} />;

  const isCancelled = order.status === 'cancelled';
  const currentStepIndex = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);
  const address = order.shipping_address;

  return (
    <KeyboardScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
    >
      <Stack.Screen options={{ title: `Order #${order.id.slice(0, 8)}` }} />

      <Card style={{ gap: spacing.lg }}>
        <View style={styles.row}>
          <View style={{ gap: 2 }}>
            <Text style={font.title}>Order #{order.id.slice(0, 8)}</Text>
            <Text style={font.caption}>Placed {formatDate(order.created_at)}</Text>
          </View>
          <Badge label={order.status} tone={statusTone(order.status)} />
        </View>

        {!isCancelled && (
          <View style={styles.steps}>
            {ORDER_STEPS.map((step, i) => {
              const done = i <= currentStepIndex;
              return (
                <Fragment key={step}>
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <View style={[styles.stepDot, done && styles.stepDotDone]}>
                      {done ? (
                        <Ionicons name="checkmark" size={14} color={colors.brandForeground} />
                      ) : (
                        <Text style={{ fontSize: 11, color: colors.muted }}>{i + 1}</Text>
                      )}
                    </View>
                    <Text style={styles.stepLabel}>{step}</Text>
                  </View>
                  {i < ORDER_STEPS.length - 1 && <View style={[styles.stepLine, i < currentStepIndex && { backgroundColor: colors.brand }]} />}
                </Fragment>
              );
            })}
          </View>
        )}

        {isCancellable(order) && (
          <Button
            title="Cancel order"
            variant="danger"
            icon="close-circle-outline"
            size="sm"
            loading={cancel.isPending}
            style={{ alignSelf: 'flex-start' }}
            onPress={async () => {
              if (await confirmCancel()) cancel.mutate();
            }}
          />
        )}
      </Card>

      <Card style={{ gap: 4 }}>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        <Text style={font.label}>{address.label ?? 'Delivery address'}</Text>
        <Text style={font.caption}>
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ''}
          {address.city ? `, ${address.city}` : ''}
          {address.state ? `, ${address.state}` : ''}
          {address.postalCode ? ` ${address.postalCode}` : ''}
          {address.country ? `, ${address.country}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="call-outline" size={12} color={colors.muted} />
          <Text style={font.caption}>{order.shipping_phone}</Text>
        </View>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
        {order.items.map((item, index) => {
          const product = productById.get(item.product_id);
          const variant = product?.variants.find((v) => v.sku === item.sku);
          const image = variant?.images[0] ?? product?.images.main;
          const activeReturn = myReturns?.find((r) => r.order_item_id === item.id);

          return (
            <View key={item.id} style={[{ flexDirection: 'row', gap: spacing.md }, index > 0 && styles.itemDivider]}>
              <Pressable disabled={!product} onPress={() => product && router.push(`/product/${product._id}`)}>
                <Thumb uri={image} size={72} />
              </Pressable>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={font.label} numberOfLines={2} onPress={() => product && router.push(`/product/${product._id}`)}>
                  {product?.title ?? item.sku}
                </Text>
                {variant?.attributes && Object.keys(variant.attributes).length > 0 && (
                  <Text style={font.caption}>{Object.values(variant.attributes).join(' / ')}</Text>
                )}
                <Text style={font.caption}>
                  Qty {item.quantity} × {formatPrice(item.unit_price)} = {formatPrice(item.subtotal)}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <Badge label={item.fulfillment_status} tone={statusTone(item.fulfillment_status)} />
                  {activeReturn && <Badge label={`Return ${activeReturn.status}`} tone={statusTone(activeReturn.status)} />}
                </View>

                {item.fulfillment_status === 'delivered' && !activeReturn && (
                  <View style={{ marginTop: 4 }}>
                    {openReturnFor === item.id ? (
                      <View style={{ gap: spacing.sm }}>
                        <Field
                          autoFocus
                          placeholder="Reason for return"
                          value={reason[item.id] ?? ''}
                          onChangeText={(t) => setReason({ ...reason, [item.id]: t })}
                          error={returnError[item.id] || null}
                        />
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          <Button
                            title="Submit"
                            size="sm"
                            loading={requestReturn.isPending && requestReturn.variables === item.id}
                            disabled={!reason[item.id]?.trim()}
                            onPress={() => requestReturn.mutate(item.id)}
                          />
                          <Button title="Cancel" size="sm" variant="ghost" onPress={() => setOpenReturnFor(null)} />
                        </View>
                      </View>
                    ) : (
                      <Pressable onPress={() => setOpenReturnFor(item.id)} hitSlop={6}>
                        <Text style={styles.link}>Request return</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={{ gap: 6 }}>
        <Text style={styles.sectionTitle}>Price Details</Text>
        <PriceRow label="Subtotal" value={formatPrice(order.subtotal)} />
        {order.discount_total > 0 && (
          <PriceRow
            label={`Discount${order.coupon_codes.length > 0 ? ` (${order.coupon_codes.join(', ')})` : ''}`}
            value={`-${formatPrice(order.discount_total)}`}
            color={colors.discount}
          />
        )}
        {order.tax > 0 && <PriceRow label="Tax" value={formatPrice(order.tax)} />}
        <PriceRow label="Delivery Charges" value={order.shipping_fee > 0 ? formatPrice(order.shipping_fee) : 'FREE'} />
        <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }]}>
          <Text style={font.heading}>Total</Text>
          <Text style={font.heading}>{formatPrice(order.total)}</Text>
        </View>
      </Card>
    </KeyboardScrollView>
  );
}

function PriceRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={[font.body, { color: color ?? colors.muted, flex: 1 }]}>{label}</Text>
      <Text style={[font.body, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.muted, marginBottom: 4 },
  steps: { flexDirection: 'row', alignItems: 'flex-start' },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  stepLabel: { fontSize: 11, color: colors.muted, textTransform: 'capitalize' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginTop: 12, marginHorizontal: 4 },
  itemDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  link: { fontSize: 13, fontWeight: '600', color: colors.brand },
});
