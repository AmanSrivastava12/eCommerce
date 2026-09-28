import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { categoriesApi, type ProductBrowseQuery } from '../lib/api-client/resources';
import { categoryIcon } from '../lib/category-icons';
import { colors, font, radius, spacing } from '../lib/theme';
import { SheetKeyboardAvoider } from './keyboard';
import { LayoutToggle, ProductGrid } from './product-card';
import { Button, Checkbox, Chip, Field } from './ui';

// Native port of website/components/filters/{sort-tabs,filter-sidebar}.tsx. Like the
// website's URL search params, the active sort + filters live in the route params, so the
// back button and deep links (shopwave://search?q=…&sort=rating) behave the same way.

const SORT_OPTIONS = [
  { value: '', label: 'Relevance' },
  { value: 'price-asc', label: 'Price — Low to High' },
  { value: 'price-desc', label: 'Price — High to Low' },
  { value: 'rating', label: 'Avg. Rating' },
  { value: 'newest', label: 'Newest First' },
];

const RATING_OPTIONS = [4, 3, 2, 1];

export type BrowseParams = {
  q?: string;
  category?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  inStock?: string;
};

export function useBrowseParams() {
  const params = useLocalSearchParams<BrowseParams>();
  const router = useRouter();
  const set = (next: Partial<BrowseParams>) =>
    // `undefined` removes a param; empty strings are normalised to that.
    router.setParams(Object.fromEntries(Object.entries(next).map(([k, v]) => [k, v || undefined])));
  return { params, set };
}

export function queryFromParams(params: BrowseParams): ProductBrowseQuery {
  return {
    search: params.q || undefined,
    category: params.category || undefined,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    minRating: params.minRating ? Number(params.minRating) : undefined,
    inStock: params.inStock === 'true' || undefined,
    sort: params.sort || undefined,
  };
}

export function BrowseView({
  query,
  header,
  showCategories = false,
}: {
  query: ProductBrowseQuery;
  header?: ReactNode;
  showCategories?: boolean;
}) {
  const { params, set } = useBrowseParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const activeChips = [
    params.minPrice && { key: 'minPrice', label: `Min $${params.minPrice}` },
    params.maxPrice && { key: 'maxPrice', label: `Max $${params.maxPrice}` },
    params.minRating && { key: 'minRating', label: `${params.minRating}★ & above` },
    params.inStock === 'true' && { key: 'inStock', label: 'In stock' },
  ].filter(Boolean) as { key: keyof BrowseParams; label: string }[];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.brand}
          onRefresh={async () => {
            setRefreshing(true);
            await queryClient.invalidateQueries({ queryKey: ['products'] });
            setRefreshing(false);
          }}
        />
      }
    >
      {header}

      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }} style={{ flex: 1 }}>
          {SORT_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} active={(params.sort ?? '') === o.value} onPress={() => set({ sort: o.value })} />
          ))}
        </ScrollView>
        <LayoutToggle />
        <Pressable style={styles.filterBtn} onPress={() => setFiltersOpen(true)} accessibilityLabel="Filters">
          <Ionicons name="options-outline" size={18} color={colors.brand} />
          {activeChips.length > 0 && (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{activeChips.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {activeChips.length > 0 && (
        <View style={styles.chips}>
          {activeChips.map((chip) => (
            <Chip key={chip.key} label={`${chip.label}  ✕`} active onPress={() => set({ [chip.key]: '' })} />
          ))}
          <Pressable onPress={() => set({ minPrice: '', maxPrice: '', minRating: '', inStock: '' })} style={{ justifyContent: 'center' }}>
            <Text style={styles.link}>Clear All</Text>
          </Pressable>
        </View>
      )}

      <ProductGrid query={query} />

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        params={params}
        showCategories={showCategories}
        onApply={(next) => {
          set(next);
          setFiltersOpen(false);
        }}
      />
    </ScrollView>
  );
}

function FilterSheet({
  visible,
  onClose,
  params,
  showCategories,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  params: BrowseParams;
  showCategories: boolean;
  onApply: (next: Partial<BrowseParams>) => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, enabled: showCategories });
  const [draft, setDraft] = useState<BrowseParams>(params);

  // Start each opening from the applied filters. Done when `visible` flips (not in the
  // Modal's onShow, which fires after the slide-in and could wipe anything typed meanwhile).
  useEffect(() => {
    if (visible) setDraft(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      {/* Lifts the sheet above the keyboard (price fields); the sheet and its list shrink to
          fit rather than being pushed off the top on short screens. */}
      <SheetKeyboardAvoider style={{ flexShrink: 1 }}>
        <View style={[styles.sheet, { maxHeight: windowHeight * 0.85, paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.sheetHeader}>
            <Text style={font.title}>Filters</Text>
            <Pressable onPress={() => setDraft((d) => ({ ...d, minPrice: '', maxPrice: '', minRating: '', inStock: '' }))}>
              <Text style={styles.link}>Clear All</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: spacing.xl }} keyboardShouldPersistTaps="handled">
            {showCategories && categories && categories.length > 0 && (
              <View style={{ gap: spacing.sm }}>
                <Text style={font.heading}>Categories</Text>
                <View style={styles.chips}>
                  {categories.map((c) => (
                    <Chip
                      key={c._id}
                      icon={categoryIcon(c)}
                      label={c.name}
                      onPress={() => {
                        onClose();
                        router.push(`/category/${c.slug}`);
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={{ gap: spacing.sm }}>
              <Text style={font.heading}>Price</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Field
                  prefix="$"
                  placeholder="Min"
                  keyboardType="number-pad"
                  value={draft.minPrice ?? ''}
                  onChangeText={(t) => setDraft((d) => ({ ...d, minPrice: t.replace(/\D/g, '') }))}
                  containerStyle={{ flex: 1 }}
                />
                <Text style={font.caption}>–</Text>
                <Field
                  prefix="$"
                  placeholder="Max"
                  keyboardType="number-pad"
                  value={draft.maxPrice ?? ''}
                  onChangeText={(t) => setDraft((d) => ({ ...d, maxPrice: t.replace(/\D/g, '') }))}
                  containerStyle={{ flex: 1 }}
                />
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={font.heading}>Customer Ratings</Text>
              <View style={styles.chips}>
                {RATING_OPTIONS.map((r) => (
                  <Chip
                    key={r}
                    icon="star"
                    label={`${r} & above`}
                    active={draft.minRating === String(r)}
                    onPress={() => setDraft((d) => ({ ...d, minRating: d.minRating === String(r) ? '' : String(r) }))}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={font.heading}>Availability</Text>
              <Checkbox
                label="In stock only"
                checked={draft.inStock === 'true'}
                onChange={(checked) => setDraft((d) => ({ ...d, inStock: checked ? 'true' : '' }))}
              />
            </View>
          </ScrollView>
          <Button
            title="Apply filters"
            style={{ marginTop: spacing.lg }}
            onPress={() =>
              onApply({ minPrice: draft.minPrice, maxPrice: draft.maxPrice, minRating: draft.minRating, inStock: draft.inStock })
            }
          />
        </View>
      </SheetKeyboardAvoider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterBtn: {
    width: 38,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { fontSize: 10, fontWeight: '700', color: colors.brandForeground },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  link: { fontSize: 13, fontWeight: '600', color: colors.brand },

  backdrop: { flex: 1, backgroundColor: 'rgba(58, 43, 30, 0.4)' },
  sheet: {
    flexShrink: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
});
