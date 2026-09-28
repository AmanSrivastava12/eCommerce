import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { sellerProductsApi } from '../../../lib/api-client/resources';
import type { Product } from '../../../lib/api-client/types';
import { computeFinalPrice } from '../../../components/product-form';
import { Badge, Button, Chip, EmptyState, Field, Thumb, statusTone, type IconName } from '../../../components/ui';
import { colors, formatPrice, radius, spacing } from '../../../lib/theme';

const FILTERS = ['all', 'active', 'draft', 'inactive'] as const;

export default function ProductListScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [query, setQuery] = useState('');
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['seller-products'],
    queryFn: sellerProductsApi.list,
  });

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (p) =>
        (filter === 'all' || p.status === filter) &&
        (!q || p.title.toLowerCase().includes(q) || p.variants.some((v) => v.sku.toLowerCase().includes(q))),
    );
  }, [data, filter, query]);

  return (
    <FlatList
      data={products}
      keyExtractor={(p) => p._id}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Field
              containerStyle={{ flex: 1 }}
              icon="search"
              placeholder="Search title or SKU"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            <Button title="New" icon="add" style={{ paddingVertical: 10 }} onPress={() => router.push('/(seller)/products/new')} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {FILTERS.map((f) => (
              <Chip
                key={f}
                label={`${f}${data ? ` (${f === 'all' ? data.length : data.filter((p) => p.status === f).length})` : ''}`}
                active={filter === f}
                onPress={() => setFilter(f)}
              />
            ))}
          </ScrollView>
        </View>
      }
      renderItem={({ item }) => <ProductRow product={item} onPress={() => router.push(`/(seller)/products/${item._id}/edit`)} />}
      ListEmptyComponent={
        isLoading ? null : (
          <EmptyState
            icon="cube-outline"
            title={data?.length ? 'No matching products' : 'No products yet'}
            subtitle={data?.length ? 'Try a different search or filter.' : 'Tap “New” to list your first product.'}
          />
        )
      }
    />
  );
}

function ProductRow({ product, onPress }: { product: Product; onPress: () => void }) {
  const { pricing, fulfillment, ratingSummary } = product;
  const finalPrice = computeFinalPrice({
    basePrice: String(pricing.basePrice),
    discountType: pricing.discountPercent ? 'percent' : pricing.discountAmount ? 'amount' : 'none',
    discountValue: String(pricing.discountPercent || pricing.discountAmount || 0),
  });
  const discounted = finalPrice < pricing.basePrice;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { borderColor: colors.brandLight }]}>
      <Thumb uri={product.images.main} size={76} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
          <Badge label={product.status} tone={statusTone(product.status)} />
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(finalPrice)}</Text>
          {discounted && (
            <>
              <Text style={styles.strike}>{formatPrice(pricing.basePrice)}</Text>
              <Text style={styles.off}>{Math.round(((pricing.basePrice - finalPrice) / pricing.basePrice) * 100)}% off</Text>
            </>
          )}
        </View>
        <View style={styles.metaRow}>
          <Meta icon="star" text={ratingSummary.count ? `${ratingSummary.average.toFixed(1)} (${ratingSummary.count})` : 'No ratings'} />
          <Meta
            icon={product.variants.length > 1 ? 'layers-outline' : 'barcode-outline'}
            text={product.variants.length > 1 ? `${product.variants.length} variants` : product.variants[0]?.sku ?? '—'}
          />
          <Meta icon="car-outline" text={fulfillment.shippingFee ? formatPrice(fulfillment.shippingFee) : 'Free'} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={12} color={icon === 'star' ? colors.star : colors.muted} />
      <Text style={styles.metaText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  body: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.foreground },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 16, fontWeight: '700', color: colors.foreground },
  strike: { fontSize: 12, color: colors.muted, textDecorationLine: 'line-through' },
  off: { fontSize: 12, fontWeight: '600', color: colors.discount },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 12, color: colors.muted },
});
