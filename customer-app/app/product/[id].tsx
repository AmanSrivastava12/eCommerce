import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { productsApi } from '../../lib/api-client/resources';
import { useCart } from '../../lib/hooks/use-cart';
import { useWishlist } from '../../lib/hooks/use-wishlist';
import { colors, font, formatPrice, radius, spacing } from '../../lib/theme';
import { RatingPill, WishlistHeart } from '../../components/product-card';
import { FaqAccordion, FulfillmentFeatures, PincodeCheck, ReviewSection, SpecTable } from '../../components/product-sections';
import { Button, Card, ErrorState, Skeleton } from '../../components/ui';
import { KeyboardScrollView } from '../../components/keyboard';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id),
  });
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const [selectedSku, setSelectedSku] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [buying, setBuying] = useState(false);

  if (isLoading) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Skeleton style={{ aspectRatio: 1, borderRadius: radius.lg }} />
        <Skeleton style={{ height: 22, width: '75%' }} />
        <Skeleton style={{ height: 16, width: '50%' }} />
        <Skeleton style={{ height: 30, width: '35%' }} />
      </View>
    );
  }
  if (isError || !data) return <ErrorState title="Couldn't load this product" onRetry={() => refetch()} />;

  const { product, price: productPrice } = data;
  const variant = product.variants.find((v) => v.sku === selectedSku) ?? product.variants[0];
  // Variants can be priced differently; show what the selected one will actually cost.
  const price = variant?.price ?? productPrice;
  const sku = variant?.sku ?? '';
  const gallery = variant?.images.length ? variant.images : [product.images.main, ...product.images.gallery];
  const imageSize = width - spacing.lg * 2;

  const handleBuyNow = async () => {
    setBuying(true);
    try {
      await addItem.mutateAsync({ productId: product._id, sku, quantity: 1 });
      router.navigate('/cart');
    } catch {
      // useCart already toasted the error
    } finally {
      setBuying(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: '' }} />
      <KeyboardScrollView contentContainerStyle={styles.content}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <FlatList
            data={gallery}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(src, i) => `${src}-${i}`}
            onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / imageSize))}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={{ width: imageSize, height: imageSize, backgroundColor: colors.background }} />
            )}
          />
          <View style={styles.heart}>
            <WishlistHeart size={22} active={isWishlisted(sku)} onPress={() => toggle(product._id, sku)} />
          </View>
          {gallery.length > 1 && (
            <View style={styles.dots}>
              {gallery.map((src, i) => (
                <View key={`${src}-${i}`} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </Card>

        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: 6 }}>
            <Text style={styles.title}>{product.title}</Text>
            {product.ratingSummary.count > 0 && (
              <View style={styles.row}>
                <RatingPill average={product.ratingSummary.average} />
                <Text style={font.caption}>{product.ratingSummary.count} ratings</Text>
                {product.fulfillment.isAssured && <Text style={styles.assured}>Assured</Text>}
              </View>
            )}
          </View>

          <View>
            <View style={[styles.row, { alignItems: 'baseline', gap: spacing.md }]}>
              <Text style={styles.price}>{formatPrice(Math.round(price.effectivePrice))}</Text>
              {price.strikethroughPrice && <Text style={styles.strike}>{formatPrice(Math.round(price.strikethroughPrice))}</Text>}
              {price.strikethroughPrice && (
                <Text style={styles.off}>{Math.round((1 - price.effectivePrice / price.strikethroughPrice) * 100)}% off</Text>
              )}
            </View>
            {price.onSale && <Text style={styles.sale}>Limited-time sale price</Text>}
          </View>

          <Text style={{ fontSize: 14, lineHeight: 20, color: colors.muted }}>{product.description.short}</Text>

          {product.variants.length > 1 && (
            <View style={{ gap: spacing.sm }}>
              <Text style={font.label}>{Object.keys(variant?.attributes ?? {})[0] ?? 'Variant'}</Text>
              <View style={styles.variants}>
                {product.variants.map((v) => {
                  const active = sku === v.sku;
                  return (
                    <Pressable
                      key={v.sku}
                      onPress={() => {
                        setSelectedSku(v.sku);
                        setActiveIndex(0);
                      }}
                      style={[styles.variant, active && styles.variantActive]}
                    >
                      <Text style={[styles.variantText, active && { color: colors.brand }]}>
                        {(v.attributes ? Object.values(v.attributes).join(' / ') : '') || v.sku}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <PincodeCheck productId={product._id} />
        </Card>

        <Card>
          <FulfillmentFeatures fulfillment={product.fulfillment} />
        </Card>

        {product.description.sections.length > 0 && (
          <Card style={{ gap: spacing.lg }}>
            {product.description.sections.map((s) => (
              <View key={s.heading} style={{ gap: 4 }}>
                <Text style={font.title}>{s.heading}</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: colors.muted }}>{s.content}</Text>
              </View>
            ))}
          </Card>
        )}

        {product.description.specifications.length > 0 && (
          <Card>
            <SpecTable specifications={product.description.specifications} />
          </Card>
        )}

        {product.faqs.length > 0 && (
          <Card style={{ gap: spacing.md }}>
            <Text style={font.title}>Frequently Asked Questions</Text>
            <FaqAccordion faqs={product.faqs} />
          </Card>
        )}

        <Card>
          <ReviewSection productId={product._id} sku={sku} />
        </Card>
      </KeyboardScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title="Add to Cart"
          icon="cart-outline"
          style={{ flex: 1 }}
          loading={addItem.isPending && !buying}
          disabled={!sku || buying}
          onPress={() => addItem.mutate({ productId: product._id, sku, quantity: 1 })}
        />
        <Button
          title="Buy Now"
          variant="secondary"
          icon="flash-outline"
          style={{ flex: 1, borderColor: colors.brand, borderWidth: 2 }}
          loading={buying}
          disabled={!sku || addItem.isPending}
          onPress={handleBuyNow}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  heart: { position: 'absolute', top: spacing.md, right: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 16, backgroundColor: colors.brand },

  title: { fontSize: 19, fontWeight: '600', lineHeight: 25, color: colors.foreground },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  assured: { fontSize: 13, fontWeight: '600', color: colors.brand },
  price: { fontSize: 28, fontWeight: '700', color: colors.foreground },
  strike: { fontSize: 15, color: colors.muted, textDecorationLine: 'line-through' },
  off: { fontSize: 14, fontWeight: '600', color: colors.discount },
  sale: { marginTop: 4, fontSize: 13, fontWeight: '600', color: colors.danger },

  variants: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  variant: { borderWidth: 2, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 7 },
  variantActive: { borderColor: colors.brand, backgroundColor: colors.cream },
  variantText: { fontSize: 13, color: colors.foreground },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
