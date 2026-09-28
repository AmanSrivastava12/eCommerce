import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { productsApi, type ProductBrowseQuery } from '../lib/api-client/resources';
import type { Product } from '../lib/api-client/types';
import { useCart } from '../lib/hooks/use-cart';
import { useWishlist } from '../lib/hooks/use-wishlist';
import { setProductLayout, useProductLayout, type ProductLayout } from '../lib/product-layout';
import { colors, formatPrice, radius, spacing } from '../lib/theme';
import { EmptyState, ErrorState, Skeleton, type IconName } from './ui';

// Card-level price, computed from the list payload the same way the website's ProductCard
// does (the detail endpoint returns a server-computed EffectivePrice instead).
export function effectivePriceOf(product: Product) {
  if (product.pricing.discountPercent) return product.pricing.basePrice * (1 - product.pricing.discountPercent / 100);
  if (product.pricing.discountAmount) return Math.max(0, product.pricing.basePrice - product.pricing.discountAmount);
  return product.pricing.basePrice;
}

/**
 * Per-product overrides for listings that aren't plain browsing — the wishlist shows the
 * variant that was saved, its server-computed price, and its own actions instead of
 * Add to Cart.
 */
export interface CardOptions {
  sku?: string;
  price?: number;
  actions?: ReactNode;
}

/** Everything the three card layouts show and do, computed once. */
function useProductCardModel(product: Product, options: CardOptions = {}) {
  const router = useRouter();
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  const price = options.price ?? effectivePriceOf(product);
  const discountPercent =
    product.pricing.discountPercent ??
    (product.pricing.discountAmount ? Math.round((product.pricing.discountAmount / product.pricing.basePrice) * 100) : 0);
  const discounted = Math.round(price) < Math.round(product.pricing.basePrice);
  const defaultVariant = product.variants.find((v) => v.sku === options.sku) ?? product.variants[0];
  const defaultSku = defaultVariant?.sku ?? '';
  const variantLabel = defaultVariant?.attributes ? Object.values(defaultVariant.attributes).join(' / ') : '';

  return {
    price,
    discounted,
    discountPercent: !discounted ? 0 : options.price !== undefined ? Math.round((1 - price / product.pricing.basePrice) * 100) : discountPercent,
    defaultSku,
    variantLabel,
    moreVariants: Math.max(0, product.variants.length - 1),
    deliveryText: `Delivery in ${product.fulfillment.estimatedDeliveryDays} days · ${
      product.fulfillment.shippingFee ? `${formatPrice(Math.round(product.fulfillment.shippingFee))} shipping` : 'Free shipping'
    }`,
    wishlisted: isWishlisted(defaultSku),
    toggleWishlist: () => toggle(product._id, defaultSku),
    isAdding: addItem.isPending && addItem.variables?.productId === product._id,
    addToCart: () => addItem.mutate({ productId: product._id, sku: defaultSku, quantity: 1 }),
    open: () => router.push(`/product/${product._id}`),
    actions: options.actions,
  };
}

export function RatingPill({ average }: { average: number }) {
  return (
    <View style={styles.ratingPill}>
      <Text style={styles.ratingText}>{average.toFixed(1)}</Text>
      <Ionicons name="star" size={10} color={colors.brand} />
    </View>
  );
}

export function WishlistHeart({ active, onPress, size = 18 }: { active: boolean; onPress: () => void; size?: number }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={active ? 'Remove from wishlist' : 'Add to wishlist'}
      style={({ pressed }) => [styles.heart, { width: size + 16, height: size + 16 }, pressed && { transform: [{ scale: 0.9 }] }]}
    >
      <Ionicons name={active ? 'heart' : 'heart-outline'} size={size} color={active ? colors.danger : colors.muted} />
    </Pressable>
  );
}

function ProductImage({ uri, style }: { uri: string; style: object }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.imageWrap, style]}>
      {failed ? (
        <Ionicons name="image-outline" size={32} color={colors.muted} />
      ) : (
        <Image source={{ uri }} style={styles.image} onError={() => setFailed(true)} />
      )}
    </View>
  );
}

function DiscountBadge({ percent }: { percent: number }) {
  if (percent <= 0) return null;
  return (
    <View style={styles.discountBadge}>
      <Text style={styles.discountBadgeText}>{percent}% OFF</Text>
    </View>
  );
}

function RatingRow({ product }: { product: Product }) {
  if (product.ratingSummary.count === 0) return null;
  return (
    <View style={styles.row}>
      <RatingPill average={product.ratingSummary.average} />
      <Text style={styles.caption}>({product.ratingSummary.count})</Text>
      {product.fulfillment.isAssured && <Text style={styles.assured}>Assured</Text>}
    </View>
  );
}

function PriceRow({ product, m, large }: { product: Product; m: ReturnType<typeof useProductCardModel>; large?: boolean }) {
  return (
    <View style={[styles.row, { flexWrap: 'wrap' }]}>
      <Text style={[styles.price, large && { fontSize: 19 }]}>{formatPrice(Math.round(m.price))}</Text>
      {m.discounted && <Text style={styles.strike}>{formatPrice(Math.round(product.pricing.basePrice))}</Text>}
      {m.discountPercent > 0 && <Text style={styles.off}>{m.discountPercent}% off</Text>}
    </View>
  );
}

function AddToCartButton({ m, compact }: { m: ReturnType<typeof useProductCardModel>; compact?: boolean }) {
  const disabled = m.isAdding || !m.defaultSku;
  return (
    <Pressable
      onPress={m.addToCart}
      disabled={disabled}
      accessibilityLabel="Add to Cart"
      style={({ pressed }) => [
        styles.addBtn,
        compact && styles.addBtnCompact,
        disabled && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.97 }] },
      ]}
    >
      {m.isAdding ? (
        <ActivityIndicator size="small" color={colors.brandForeground} />
      ) : compact ? (
        <>
          <Ionicons name="cart-outline" size={15} color={colors.brandForeground} />
          <Text style={[styles.addText, { fontSize: 12 }]}>Add</Text>
        </>
      ) : (
        <Text style={styles.addText}>Add to Cart</Text>
      )}
    </Pressable>
  );
}

/** Grid layout: square image on top, details below — the website's ProductCard. */
export function ProductCard({ product, options }: { product: Product; options?: CardOptions }) {
  const m = useProductCardModel(product, options);
  return (
    <View style={[styles.card, styles.gridCard]}>
      <Pressable onPress={m.open} style={{ flex: 1 }}>
        <ProductImage uri={product.images.main} style={{ aspectRatio: 1 }} />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {product.title}
          </Text>
          <RatingRow product={product} />
          <View style={{ marginTop: 'auto', paddingTop: 4 }}>
            <PriceRow product={product} m={m} />
          </View>
          {m.defaultSku !== '' && (
            <Text style={styles.delivery} numberOfLines={1}>
              {m.deliveryText}
            </Text>
          )}
        </View>
      </Pressable>
      <DiscountBadge percent={m.discountPercent} />
      <View style={styles.heartPos}>
        <WishlistHeart active={m.wishlisted} onPress={m.toggleWishlist} />
      </View>
      <View style={styles.footer}>{m.actions ?? <AddToCartButton m={m} />}</View>
    </View>
  );
}

/** Feed layout: one large card per row, image across the full width. */
export function ProductFeedCard({ product, options }: { product: Product; options?: CardOptions }) {
  const m = useProductCardModel(product, options);
  return (
    <View style={styles.card}>
      <Pressable onPress={m.open}>
        <ProductImage uri={product.images.main} style={{ aspectRatio: 4 / 3 }} />
        <View style={[styles.body, { padding: spacing.lg, gap: 6 }]}>
          <Text style={[styles.title, { fontSize: 16, lineHeight: 22, minHeight: 0 }]} numberOfLines={2}>
            {product.title}
          </Text>
          {product.description.short ? (
            <Text style={styles.short} numberOfLines={2}>
              {product.description.short}
            </Text>
          ) : null}
          <RatingRow product={product} />
          <PriceRow product={product} m={m} large />
          {m.defaultSku !== '' && <Text style={[styles.delivery, { fontSize: 12 }]}>{m.deliveryText}</Text>}
        </View>
      </Pressable>
      <DiscountBadge percent={m.discountPercent} />
      <View style={styles.heartPos}>
        <WishlistHeart active={m.wishlisted} onPress={m.toggleWishlist} size={20} />
      </View>
      <View style={[styles.footer, { padding: spacing.md }]}>{m.actions ?? <AddToCartButton m={m} />}</View>
    </View>
  );
}

/** List layout: compact row — image on the left, name / variant / price on the right. */
export function ProductListRow({ product, options }: { product: Product; options?: CardOptions }) {
  const m = useProductCardModel(product, options);
  return (
    <Pressable onPress={m.open} style={[styles.card, styles.listRow]}>
      <View>
        <ProductImage uri={product.images.main} style={styles.listImage} />
        <DiscountBadge percent={m.discountPercent} />
      </View>
      <View style={styles.listBody}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
          <Text style={[styles.title, { flex: 1, minHeight: 0, fontSize: 14, lineHeight: 19 }]} numberOfLines={2}>
            {product.title}
          </Text>
          <WishlistHeart active={m.wishlisted} onPress={m.toggleWishlist} size={16} />
        </View>
        {m.variantLabel !== '' && (
          <Text style={[styles.caption, { flexShrink: 0 }]} numberOfLines={1}>
            {m.variantLabel}
            {m.moreVariants > 0 ? `  ·  +${m.moreVariants} more option${m.moreVariants > 1 ? 's' : ''}` : ''}
          </Text>
        )}
        <RatingRow product={product} />
        <PriceRow product={product} m={m} />
        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 'auto' }]}>
          {m.defaultSku !== '' ? (
            <Text style={[styles.delivery, { flex: 1 }]} numberOfLines={2}>
              {m.deliveryText}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {/* Actions keep their natural width; the delivery text wraps around them. */}
          <View style={{ flexShrink: 0 }}>{m.actions ?? <AddToCartButton m={m} compact />}</View>
        </View>
      </View>
    </Pressable>
  );
}

const LAYOUT_OPTIONS: { value: ProductLayout; icon: IconName; label: string }[] = [
  { value: 'feed', icon: 'square-outline', label: 'Large cards' },
  { value: 'grid', icon: 'grid-outline', label: 'Grid' },
  { value: 'list', icon: 'list-outline', label: 'List' },
];

/** Three-way switch between the feed, grid and list layouts. */
export function LayoutToggle() {
  const layout = useProductLayout();
  return (
    <View style={styles.toggle}>
      {LAYOUT_OPTIONS.map((o) => {
        const active = layout === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => setProductLayout(o.value)}
            accessibilityRole="button"
            accessibilityLabel={`${o.label} view`}
            accessibilityState={{ selected: active }}
            style={[styles.toggleBtn, active && styles.toggleBtnActive]}
          >
            <Ionicons name={o.icon} size={16} color={active ? colors.brandForeground : colors.brand} />
          </Pressable>
        );
      })}
    </View>
  );
}

function useGridColumns() {
  const { width } = useWindowDimensions();
  return width >= 600 ? 3 : 2;
}

/** Products laid out in the given (or the shopper's chosen) layout. */
export function ProductList({
  products,
  layout,
  options,
  keyOf,
}: {
  products: Product[];
  layout?: ProductLayout;
  /** Per-entry overrides (by position, since a product can appear once per variant). */
  options?: (product: Product, index: number) => CardOptions;
  keyOf?: (product: Product, index: number) => string;
}) {
  const key = (p: Product, i: number) => keyOf?.(p, i) ?? p._id;
  const chosen = useProductLayout();
  const columns = useGridColumns();
  const mode = layout ?? chosen;

  if (mode === 'feed') {
    return (
      <View style={{ gap: spacing.md }}>
        {products.map((p, i) => (
          <ProductFeedCard key={key(p, i)} product={p} options={options?.(p, i)} />
        ))}
      </View>
    );
  }
  if (mode === 'list') {
    return (
      <View style={{ gap: spacing.sm }}>
        {products.map((p, i) => (
          <ProductListRow key={key(p, i)} product={p} options={options?.(p, i)} />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.grid}>
      {products.map((p, i) => (
        <View key={key(p, i)} style={[styles.cell, { width: `${100 / columns}%` }]}>
          <ProductCard product={p} options={options?.(p, i)} />
        </View>
      ))}
    </View>
  );
}

/** Products from GET /products, with loading / error / empty states. */
export function ProductGrid({ query, limit, layout }: { query: ProductBrowseQuery; limit?: number; layout?: ProductLayout }) {
  const chosen = useProductLayout();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', query],
    queryFn: () => productsApi.browse(query),
  });

  if (isLoading) return <GridSkeleton count={limit ?? 4} layout={layout ?? chosen} />;
  if (isError) return <ErrorState title="Couldn't load products" onRetry={() => refetch()} />;
  if (!data || data.length === 0) {
    return <EmptyState icon="search" title="No products found" subtitle="Try adjusting your filters or search terms." />;
  }
  return <ProductList products={limit ? data.slice(0, limit) : data} layout={layout} />;
}

export function GridSkeleton({ count = 4, layout = 'grid' }: { count?: number; layout?: ProductLayout }) {
  const columns = useGridColumns();
  if (layout !== 'grid') {
    return (
      <View style={{ gap: spacing.md }}>
        {Array.from({ length: layout === 'feed' ? Math.min(count, 2) : count }).map((_, i) => (
          <Skeleton key={i} style={{ height: layout === 'feed' ? 380 : 140, borderRadius: radius.lg }} />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.cell, { width: `${100 / columns}%` }]}>
          <Skeleton style={{ aspectRatio: 0.62, borderRadius: radius.lg }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm / 2 },
  cell: { padding: spacing.sm / 2 },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  imageWrap: { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  body: { flex: 1, padding: spacing.md, gap: 4 },
  title: { fontSize: 13, lineHeight: 18, minHeight: 36, color: colors.foreground },
  short: { fontSize: 13, lineHeight: 18, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caption: { fontSize: 11, color: colors.muted },
  assured: { fontSize: 11, fontWeight: '600', color: colors.brand },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  ratingText: { fontSize: 11, fontWeight: '600', color: colors.brand },
  price: { fontSize: 15, fontWeight: '700', color: colors.foreground },
  strike: { fontSize: 11, color: colors.muted, textDecorationLine: 'line-through' },
  off: { fontSize: 11, fontWeight: '600', color: colors.discount },
  delivery: { fontSize: 10, color: colors.muted },

  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.danger,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  heartPos: { position: 'absolute', top: 6, right: 6 },
  heart: {
    borderRadius: 999,
    backgroundColor: 'rgba(251, 248, 242, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.sm },
  addBtn: {
    flexDirection: 'row',
    gap: 4,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnCompact: { height: 32, paddingHorizontal: spacing.md },
  addText: { fontSize: 13, fontWeight: '600', color: colors.brandForeground },

  // Only grid cards stretch, so every card in a row matches the tallest; list rows and feed
  // cards size to their content.
  gridCard: { flex: 1 },
  listRow: { flexDirection: 'row', gap: spacing.md, padding: spacing.sm },
  listImage: { width: 112, height: 124, borderRadius: radius.md },
  // Children keep their natural height so the row grows to fit a two-line title instead of
  // squeezing the variant line underneath the rating.
  listBody: { flex: 1, gap: 4, minHeight: 124 },

  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: 2,
  },
  toggleBtn: { width: 30, height: 28, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: colors.brand },
});
