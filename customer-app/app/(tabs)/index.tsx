import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { childrenOf, useCategories } from '../../lib/categories';
import { categoryIcon } from '../../lib/category-icons';
import { colors, font, radius, spacing } from '../../lib/theme';
import { ProductGrid } from '../../components/product-card';

const BANNERS = [
  { title: 'Festive Sale is Live', subtitle: 'Up to 50% off on Electronics & more' },
  { title: 'New Season Fashion', subtitle: 'Flat 20% off on top brands' },
  { title: 'Home Essentials', subtitle: 'Everything for your kitchen & home' },
];

const SECTIONS = [
  { title: 'Deals of the Day', sort: 'price-asc' },
  { title: 'Top Rated Products', sort: 'rating' },
  { title: 'New Arrivals', sort: 'newest' },
];

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { data: allCategories } = useCategories();
  const categories = allCategories ? childrenOf(allCategories, null) : undefined;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={styles.header}>
        <Text style={styles.brand}>Shopwave</Text>
        <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Search for products, brands and more
          </Text>
        </Pressable>
      </View>

      {categories && categories.length > 0 && (
        <View style={styles.categoryBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((c) => (
              <Pressable key={c._id} onPress={() => router.push(`/category/${c.slug}`)} style={styles.categoryItem}>
                <Ionicons name={categoryIcon(c)} size={16} color={colors.brand} />
                <Text style={styles.categoryText}>{c.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.brand}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['products'] }),
                queryClient.invalidateQueries({ queryKey: ['categories'] }),
              ]);
              setRefreshing(false);
            }}
          />
        }
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {BANNERS.map((banner) => (
            <View key={banner.title} style={styles.banner}>
              <Text style={styles.bannerTitle}>{banner.title}</Text>
              <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
              <Pressable
                onPress={() => router.push('/search')}
                style={({ pressed }) => [styles.shopNow, pressed && { backgroundColor: colors.brand }]}
              >
                {({ pressed }) => <Text style={[styles.shopNowText, pressed && { color: colors.brandForeground }]}>Shop Now</Text>}
              </Pressable>
            </View>
          ))}
        </ScrollView>

        {SECTIONS.map((section) => (
          <View key={section.sort} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={font.title}>{section.title}</Text>
              <Pressable onPress={() => router.push({ pathname: '/search', params: { sort: section.sort } })} hitSlop={8}>
                <Text style={styles.viewAll}>View All</Text>
              </Pressable>
            </View>
            <ProductGrid query={{ sort: section.sort }} limit={4} layout="grid" />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm, backgroundColor: colors.surface },
  brand: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3, color: colors.brand },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: colors.muted },

  categoryBar: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  categoryRow: { paddingHorizontal: spacing.md },
  categoryItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: 10 },
  categoryText: { fontSize: 14, color: colors.muted },

  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xl * 2 },
  banner: {
    width: 260,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: 4,
  },
  bannerTitle: { fontSize: 18, fontWeight: '600', color: colors.foreground },
  bannerSubtitle: { fontSize: 13, color: colors.muted },
  shopNow: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  shopNowText: { fontSize: 12, fontWeight: '600', color: colors.brand },

  section: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAll: { fontSize: 13, fontWeight: '600', color: colors.brand },
});
