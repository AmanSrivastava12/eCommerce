import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { productsApi } from '../lib/api-client/resources';
import { useDebouncedValue } from '../lib/hooks/use-debounce';
import { colors, font, formatPrice, radius, spacing } from '../lib/theme';
import { BrowseView, queryFromParams, useBrowseParams } from '../components/browse';

export default function SearchScreen() {
  const router = useRouter();
  const { params, set } = useBrowseParams();
  const [text, setText] = useState(params.q ?? '');
  const [focused, setFocused] = useState(false);
  const trimmed = text.trim();
  const debounced = useDebouncedValue(trimmed, 600);

  // Keep the box in sync when a new search arrives from elsewhere (e.g. a deep link).
  useEffect(() => setText(params.q ?? ''), [params.q]);

  const { data: results, isFetching } = useQuery({
    queryKey: ['search-preview', debounced],
    queryFn: () => productsApi.browse({ search: debounced }),
    enabled: debounced.length > 1,
  });

  const showPreview = focused && trimmed.length > 1 && trimmed !== (params.q ?? '');
  // While the user is still typing, show a waiting state instead of stale results.
  const isTyping = trimmed !== debounced;

  const submit = () => {
    setFocused(false);
    set({ q: trimmed });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={8}
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={22} color={colors.brandDark} />
        </Pressable>
        <View style={[styles.searchBar, focused && { borderColor: colors.brand }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onSubmitEditing={submit}
            placeholder="Search for products, brands and more"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            autoCorrect={false}
            // Opened from the Home search bar with nothing to show yet: go straight to typing.
            autoFocus={!params.q && !params.sort}
            style={styles.input}
          />
          {text.length > 0 && (
            <Pressable
              hitSlop={8}
              accessibilityLabel="Clear search"
              onPress={() => {
                setText('');
                set({ q: '' });
              }}
            >
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <BrowseView
          query={queryFromParams(params)}
          showCategories
          header={<Text style={font.title}>{params.q ? `Results for “${params.q}”` : 'Browse products'}</Text>}
        />

        {showPreview && (
          <View style={styles.preview}>
            {isTyping || isFetching ? (
              <View style={styles.previewRow}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={font.caption}>Searching…</Text>
              </View>
            ) : results && results.length > 0 ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                {results.slice(0, 6).map((product) => (
                  <Pressable
                    key={product._id}
                    style={({ pressed }) => [styles.previewRow, pressed && { backgroundColor: colors.cream }]}
                    onPress={() => {
                      setFocused(false);
                      router.push(`/product/${product._id}`);
                    }}
                  >
                    <Image source={{ uri: product.images.main }} style={styles.previewImage} />
                    <Text style={[font.body, { flex: 1 }]} numberOfLines={1}>
                      {product.title}
                    </Text>
                    <Text style={font.caption}>{formatPrice(Math.round(product.pricing.basePrice))}</Text>
                  </Pressable>
                ))}
                <Pressable style={({ pressed }) => [styles.previewRow, pressed && { backgroundColor: colors.cream }]} onPress={submit}>
                  <Text style={styles.viewAll}>View all results for “{debounced}”</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.previewRow}>
                <Text style={font.caption}>No products found.</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.foreground },

  preview: {
    position: 'absolute',
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    maxHeight: 420,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: colors.foreground,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  previewImage: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.background },
  viewAll: { fontSize: 14, fontWeight: '600', color: colors.brand },
});
