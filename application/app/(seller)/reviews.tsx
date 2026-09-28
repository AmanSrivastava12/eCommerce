import { useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../lib/auth/auth-context';
import { useSellerRating } from '../../lib/use-seller-rating';
import { productImage, useProductLookup } from '../../lib/use-product-lookup';
import { Card, Chip, EmptyState, Stars, Thumb } from '../../components/ui';
import { colors, formatDate, radius, spacing } from '../../lib/theme';

export default function SellerReviewsScreen() {
  const { me } = useAuth();
  const lookup = useProductLookup();
  const { data, isLoading, refetch, isRefetching, summary } = useSellerRating();
  const [stars, setStars] = useState<number | null>(null);
  const sellerRating = me?.sellerProfile?.ratingSummary;

  const reviews = (data ?? []).filter((r) => stars == null || Math.round(r.rating) === stars);

  return (
    <FlatList
      data={reviews}
      keyExtractor={(item) => item._id}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={{ gap: spacing.md }}>
          <Card style={styles.summary}>
            <View style={styles.bigScore}>
              <Text style={styles.score}>{summary.count ? summary.average.toFixed(1) : '–'}</Text>
              <Stars rating={summary.average} size={16} />
              <Text style={styles.caption}>
                {summary.count} review{summary.count === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              {[5, 4, 3, 2, 1].map((n) => {
                const count = summary.distribution[n - 1];
                const pct = summary.count ? (count / summary.count) * 100 : 0;
                return (
                  <View key={n} style={styles.barRow}>
                    <Text style={styles.barLabel}>{n}★</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
          {sellerRating && (sellerRating.deliveryTimeliness.count > 0 || sellerRating.packaging.count > 0) && (
            <View style={styles.subRatings}>
              <SubRating label="Delivery" value={sellerRating.deliveryTimeliness.average} />
              <SubRating label="Packaging" value={sellerRating.packaging.average} />
            </View>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            <Chip label="All" active={stars == null} onPress={() => setStars(null)} />
            {[5, 4, 3, 2, 1].map((n) => (
              <Chip key={n} label={`${n}`} icon="star" active={stars === n} onPress={() => setStars(n)} />
            ))}
          </ScrollView>
        </View>
      }
      renderItem={({ item }) => {
        const product = lookup(item.productId, item.sku);
        return (
          <View style={styles.card}>
            <View style={styles.productRow}>
              <Thumb uri={productImage(product, item.sku)} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.productTitle} numberOfLines={1}>
                  {product?.title ?? item.sku}
                </Text>
                <Text style={styles.caption}>SKU {item.sku}</Text>
              </View>
            </View>
            <View style={styles.ratingRow}>
              <Stars rating={item.rating} />
              {item.createdAt && <Text style={styles.caption}>{formatDate(item.createdAt)}</Text>}
            </View>
            {item.title ? <Text style={styles.reviewTitle}>{item.title}</Text> : null}
            <Text style={styles.comment}>{item.comment}</Text>
            {!!item.images?.length && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {item.images.map((uri) => (
                  <Image key={uri} source={{ uri }} style={styles.reviewImage} />
                ))}
              </ScrollView>
            )}
            {!!(item.deliveryRating || item.packagingRating) && (
              <Text style={styles.caption}>
                {item.deliveryRating ? `Delivery ${item.deliveryRating}★` : ''}
                {item.deliveryRating && item.packagingRating ? ' · ' : ''}
                {item.packagingRating ? `Packaging ${item.packagingRating}★` : ''}
              </Text>
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        isLoading ? null : (
          <EmptyState icon="star-outline" title={stars ? `No ${stars}-star reviews` : 'No reviews yet'} subtitle="Customer reviews of your products will appear here." />
        )
      }
    />
  );
}

function SubRating({ label, value }: { label: string; value: number }) {
  return (
    <Card style={styles.subCard}>
      <Text style={styles.caption}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={styles.subValue}>{value.toFixed(1)}</Text>
        <Stars rating={value} size={12} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  summary: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  bigScore: { alignItems: 'center', gap: 4, minWidth: 90 },
  score: { fontSize: 36, fontWeight: '700', color: colors.foreground },
  caption: { fontSize: 12, color: colors.muted },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { fontSize: 12, color: colors.muted, width: 22 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  barFill: { height: '100%', backgroundColor: colors.star },
  barCount: { fontSize: 12, color: colors.muted, width: 24, textAlign: 'right' },
  subRatings: { flexDirection: 'row', gap: spacing.md },
  subCard: { flex: 1, padding: spacing.md, gap: 2 },
  subValue: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  productTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewTitle: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  comment: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  reviewImage: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.surface },
});
