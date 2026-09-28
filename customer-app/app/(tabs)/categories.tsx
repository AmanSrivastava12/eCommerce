import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Category } from '../../lib/api-client/types';
import { childrenOf, useCategories } from '../../lib/categories';
import { categoryIcon } from '../../lib/category-icons';
import { colors, font, radius, spacing } from '../../lib/theme';
import { EmptyState, ErrorState, Skeleton } from '../../components/ui';

const RAIL_WIDTH = 96;

export default function CategoriesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data: categories, isLoading, isError, refetch, isRefetching } = useCategories();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Deeper levels opened inside the right pane (a subcategory that has its own children).
  const [trail, setTrail] = useState<Category[]>([]);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.rail}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} style={{ height: 72, margin: spacing.sm }} />
          ))}
        </View>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <Skeleton style={{ height: 96, borderRadius: radius.lg }} />
          <Skeleton style={{ height: 200, borderRadius: radius.lg }} />
        </View>
      </View>
    );
  }
  if (isError || !categories) return <ErrorState title="Couldn't load categories" onRetry={() => refetch()} />;

  const topLevel = childrenOf(categories, null);
  if (topLevel.length === 0) return <EmptyState icon="grid-outline" title="No categories yet" />;

  const selected = topLevel.find((c) => c._id === selectedId) ?? topLevel[0];
  const current = trail[trail.length - 1] ?? selected;
  const subcategories = childrenOf(categories, current._id);

  // Three tiles per row in the pane (four on wide screens).
  const paneWidth = width - RAIL_WIDTH - spacing.lg * 2;
  const columns = paneWidth > 420 ? 4 : 3;

  const open = (category: Category) => router.push(`/category/${category.slug}`);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.rail} contentContainerStyle={{ paddingVertical: spacing.xs }}>
        {topLevel.map((c) => {
          const active = c._id === selected._id;
          return (
            <Pressable
              key={c._id}
              onPress={() => {
                setSelectedId(c._id);
                setTrail([]);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [styles.railItem, active && styles.railItemActive, pressed && !active && { backgroundColor: colors.cream }]}
            >
              {active && <View style={styles.railIndicator} />}
              <View style={[styles.railIcon, active && { backgroundColor: colors.brand }]}>
                <Ionicons name={categoryIcon(c)} size={22} color={active ? colors.brandForeground : colors.brand} />
              </View>
              <Text style={[styles.railText, active && styles.railTextActive]} numberOfLines={2}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.pane}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
      >
        {trail.length > 0 && (
          <Pressable style={styles.back} onPress={() => setTrail(trail.slice(0, -1))} hitSlop={6}>
            <Ionicons name="chevron-back" size={16} color={colors.brand} />
            <Text style={styles.backText}>{trail.length > 1 ? trail[trail.length - 2].name : selected.name}</Text>
          </Pressable>
        )}

        <Pressable onPress={() => open(current)} style={({ pressed }) => [styles.hero, pressed && { borderColor: colors.brandLight }]}>
          <View style={styles.heroIcon}>
            <Ionicons name={categoryIcon(current)} size={28} color={colors.brand} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={font.title}>{current.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.viewAll}>View all products</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.brand} />
            </View>
          </View>
        </Pressable>

        {subcategories.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Shop by subcategory</Text>
            <View style={styles.tiles}>
              {subcategories.map((sub) => {
                const hasChildren = childrenOf(categories, sub._id).length > 0;
                return (
                  <View key={sub._id} style={{ width: `${100 / columns}%`, padding: spacing.xs }}>
                    <Pressable
                      onPress={() => (hasChildren ? setTrail([...trail, sub]) : open(sub))}
                      accessibilityHint={hasChildren ? 'Shows more subcategories' : 'Shows products'}
                      style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.cream }]}
                    >
                      <View style={styles.tileIcon}>
                        <Ionicons name={categoryIcon(sub)} size={24} color={colors.brand} />
                      </View>
                      <Text style={styles.tileText} numberOfLines={2}>
                        {sub.name}
                      </Text>
                      {hasChildren && <Ionicons name="chevron-forward" size={12} color={colors.muted} style={styles.tileMore} />}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <Text style={[font.caption, { textAlign: 'center', marginTop: spacing.lg }]}>
            No subcategories — tap above to see every product in {current.name}.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  rail: { width: RAIL_WIDTH, flexGrow: 0, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.border },
  railItem: { alignItems: 'center', gap: 6, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  railItemActive: { backgroundColor: colors.background },
  railIndicator: { position: 'absolute', left: 0, top: spacing.sm, bottom: spacing.sm, width: 3, borderRadius: 2, backgroundColor: colors.brand },
  railIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  railText: { fontSize: 11, lineHeight: 14, textAlign: 'center', color: colors.muted },
  railTextActive: { color: colors.brandDark, fontWeight: '700' },

  pane: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 13, fontWeight: '600', color: colors.brand },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: spacing.lg,
  },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  viewAll: { fontSize: 13, fontWeight: '600', color: colors.brand },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.muted, marginTop: spacing.sm },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', margin: -spacing.xs },
  tile: {
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    minHeight: 104,
  },
  tileIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontSize: 12, lineHeight: 15, textAlign: 'center', color: colors.foreground },
  tileMore: { position: 'absolute', top: 6, right: 6 },
});
