import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ancestorsOf, childrenOf, useCategories } from '../../lib/categories';
import { categoryIcon } from '../../lib/category-icons';
import { BrowseView, queryFromParams, type BrowseParams } from '../../components/browse';
import { Chip, EmptyState, ErrorState } from '../../components/ui';
import { GridSkeleton } from '../../components/product-card';
import { colors, font, spacing } from '../../lib/theme';

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<BrowseParams & { slug: string }>();
  const { data: categories, isError, refetch } = useCategories();
  const category = categories?.find((c) => c.slug === params.slug);

  if (!category) {
    return (
      <>
        <Stack.Screen options={{ title: 'Category' }} />
        {isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : categories ? (
          <EmptyState icon="pricetags-outline" title="Category not found" />
        ) : (
          <View style={{ padding: spacing.lg }}>
            <GridSkeleton />
          </View>
        )}
      </>
    );
  }

  const ancestors = ancestorsOf(categories!, category);
  const subcategories = childrenOf(categories!, category._id);

  return (
    <>
      <Stack.Screen options={{ title: category.name }} />
      <BrowseView
        // GET /products?category= matches that exact category; subcategories are reached via
        // the chips below (or the category drawer).
        query={{ ...queryFromParams(params), search: undefined, category: category._id }}
        showCategories
        header={
          <View style={{ gap: spacing.sm }}>
            <View style={styles.breadcrumb}>
              <Text style={styles.crumb} onPress={() => router.navigate('/')}>
                Home
              </Text>
              {ancestors.map((a) => (
                <View key={a._id} style={styles.crumbPart}>
                  <Ionicons name="chevron-forward" size={12} color={colors.muted} />
                  <Text style={styles.crumb} onPress={() => router.push(`/category/${a.slug}`)}>
                    {a.name}
                  </Text>
                </View>
              ))}
              <View style={styles.crumbPart}>
                <Ionicons name="chevron-forward" size={12} color={colors.muted} />
                <Text style={[styles.crumb, { color: colors.foreground, fontWeight: '600' }]}>{category.name}</Text>
              </View>
            </View>

            {subcategories.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {subcategories.map((sub) => (
                  <Chip key={sub._id} icon={categoryIcon(sub)} label={sub.name} onPress={() => router.push(`/category/${sub.slug}`)} />
                ))}
              </ScrollView>
            )}
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  breadcrumb: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  crumbPart: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crumb: { ...font.caption, fontSize: 13 },
});
