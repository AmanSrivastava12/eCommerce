import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueries } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { productsApi } from '../../lib/api-client/resources';
import { errorMessage } from '../../lib/api-client/client';
import { useAuth } from '../../lib/auth/auth-context';
import { useCart } from '../../lib/hooks/use-cart';
import { useWishlist } from '../../lib/hooks/use-wishlist';
import { colors, font, formatPrice, radius, spacing } from '../../lib/theme';
import { Button, Card, EmptyState, ErrorState, Field, QuantityStepper, Skeleton, Thumb } from '../../components/ui';
import { KeyboardScrollView } from '../../components/keyboard';

export default function CartScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { data: cart, isLoading, isError, refetch, isRefetching, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const productQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['product', item.productId],
      queryFn: () => productsApi.getById(item.productId),
    })),
  });

  if (isLoading) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 96, borderRadius: radius.lg }} />
        ))}
      </View>
    );
  }
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  if (items.length === 0) {
    return (
      <EmptyState
        icon="cart-outline"
        title="Your cart is empty"
        subtitle="Items you add to your cart will appear here."
        actionLabel="Continue shopping"
        onAction={() => router.push('/search')}
      />
    );
  }

  const subtotal = items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0);
  const discountTotal = cart?.appliedCoupons.reduce((sum, c) => sum + c.discountApplied, 0) ?? 0;
  // Mirrors the API's order total: each distinct product's shipping fee is charged once.
  const shippingByProduct = new Map<string, number>();
  productQueries.forEach((q) => {
    const product = q.data?.product;
    if (product) shippingByProduct.set(product._id, product.fulfillment.shippingFee ?? 0);
  });
  const shippingFee = [...shippingByProduct.values()].reduce((sum, fee) => sum + fee, 0);
  const total = subtotal - discountTotal + shippingFee;

  const goToCheckout = () => {
    if (!isLoggedIn) {
      router.push({ pathname: '/login', params: { next: '/checkout' } });
      return;
    }
    router.push('/checkout');
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
      >
        {items.map((item, i) => {
          const product = productQueries[i]?.data?.product;
          const variant = product?.variants.find((v) => v.sku === item.sku);
          const image = variant?.images?.[0] ?? product?.images.main;
          const wishlisted = isWishlisted(item.sku);
          const availableQty = variant?.availableQty ?? null;
          const isPendingThisItem = updateItem.isPending && updateItem.variables?.sku === item.sku;

          return (
            <Card key={item.sku} style={styles.item}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <Pressable disabled={!product} onPress={() => product && router.push(`/product/${product._id}`)}>
                  <Thumb uri={image} size={72} />
                </Pressable>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={font.label} numberOfLines={2} onPress={() => product && router.push(`/product/${product._id}`)}>
                    {product?.title ?? item.sku}
                  </Text>
                  {variant?.attributes && Object.keys(variant.attributes).length > 0 && (
                    <Text style={font.caption}>{Object.values(variant.attributes).join(' / ')}</Text>
                  )}
                  <Text style={font.caption}>{formatPrice(item.priceAtAdd)} each</Text>
                  <Text style={styles.lineTotal}>{formatPrice(item.priceAtAdd * item.quantity)}</Text>
                  {availableQty != null && availableQty <= 5 && (
                    <Text style={styles.lowStock}>Only {availableQty} left in stock</Text>
                  )}
                </View>
              </View>

              <View style={styles.controls}>
                <QuantityStepper
                  value={item.quantity}
                  onChange={(quantity) => updateItem.mutate({ sku: item.sku, quantity })}
                  canDecrease={item.quantity > 1}
                  canIncrease={availableQty == null || item.quantity < availableQty}
                  disabled={isPendingThisItem}
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Pressable
                    style={styles.iconBtn}
                    disabled={!product}
                    accessibilityLabel={wishlisted ? 'Already in wishlist' : 'Add to wishlist'}
                    onPress={() => !wishlisted && product && toggleWishlist(product._id, item.sku)}
                  >
                    <Ionicons name={wishlisted ? 'heart' : 'heart-outline'} size={18} color={wishlisted ? colors.danger : colors.muted} />
                  </Pressable>
                  <Pressable style={styles.iconBtn} accessibilityLabel="Remove from cart" onPress={() => removeItem.mutate(item.sku)}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            </Card>
          );
        })}

        <Card style={{ gap: spacing.md }}>
          <Text style={font.heading}>Order Summary</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch' }}>
            <Field
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="Coupon code"
              icon="pricetag-outline"
              autoCapitalize="characters"
              autoCorrect={false}
              containerStyle={{ flex: 1 }}
            />
            <Button
              title="Apply"
              style={{ paddingVertical: 0 }}
              loading={applyCoupon.isPending}
              disabled={!couponCode.trim()}
              onPress={() =>
                applyCoupon.mutate(couponCode.trim(), {
                  onError: (err) => setCouponError(errorMessage(err, 'Invalid coupon')),
                  onSuccess: () => {
                    setCouponError(null);
                    setCouponCode('');
                  },
                })
              }
            />
          </View>
          {couponError && <Text style={{ fontSize: 13, color: colors.danger }}>{couponError}</Text>}
          {cart?.appliedCoupons.map((c) => (
            <View key={c.code} style={styles.summaryRow}>
              <View style={styles.coupon}>
                <Ionicons name="pricetag" size={12} color={colors.brand} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brand }}>{c.code}</Text>
              </View>
              <Pressable onPress={() => removeCoupon.mutate(c.code)} hitSlop={8}>
                <Text style={{ fontSize: 13, color: colors.danger }}>remove</Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.totals}>
            <View style={styles.summaryRow}>
              <Text style={font.body}>Subtotal</Text>
              <Text style={font.body}>{formatPrice(subtotal)}</Text>
            </View>
            {discountTotal > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[font.body, { color: colors.discount }]}>Discount</Text>
                <Text style={[font.body, { color: colors.discount }]}>-{formatPrice(discountTotal)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={font.body}>Shipping</Text>
              <Text style={font.body}>{shippingFee > 0 ? formatPrice(shippingFee) : 'Free'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={font.heading}>Total</Text>
              <Text style={font.heading}>{formatPrice(total)}</Text>
            </View>
          </View>
        </Card>
      </KeyboardScrollView>

      <View style={styles.checkoutBar}>
        <View>
          <Text style={font.caption}>Total</Text>
          <Text style={styles.barTotal}>{formatPrice(total)}</Text>
        </View>
        <Button title="Checkout" icon="lock-closed-outline" onPress={goToCheckout} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  item: { gap: spacing.md, padding: spacing.md },
  lineTotal: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  lowStock: { fontSize: 12, fontWeight: '600', color: colors.danger },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coupon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  totals: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  barTotal: { fontSize: 18, fontWeight: '700', color: colors.foreground },
});
