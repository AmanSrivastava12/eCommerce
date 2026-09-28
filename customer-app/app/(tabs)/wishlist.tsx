import { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { productsApi, wishlistApi } from '../../lib/api-client/resources';
import { errorMessage } from '../../lib/api-client/client';
import { useAuth } from '../../lib/auth/auth-context';
import { useCart } from '../../lib/hooks/use-cart';
import { useProductLayout } from '../../lib/product-layout';
import { LayoutToggle, ProductList } from '../../components/product-card';
import { colors, font, radius, spacing } from '../../lib/theme';
import { confirm, toast } from '../../components/feedback';
import { Button, Chip, EmptyState, ErrorState, Field, Skeleton } from '../../components/ui';
import { KeyboardScrollView } from '../../components/keyboard';

const DEFAULT_COLLECTION = 'My Wishlist';

export default function WishlistScreen() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useAuth();

  if (!isReady) return null;
  if (!isLoggedIn) {
    return (
      <EmptyState
        icon="heart-outline"
        title="Sign in to use your wishlist"
        subtitle="Save items you like by tapping the heart icon on any product."
        actionLabel="Sign in"
        onAction={() => router.push('/login')}
      />
    );
  }
  return <Wishlist />;
}

function Wishlist() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isError, refetch, isRefetching } = useQuery({ queryKey: ['wishlist'], queryFn: wishlistApi.get });
  const { addItem } = useCart();
  const layout = useProductLayout();

  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [moveMenuFor, setMoveMenuFor] = useState<{ sku: string; from: string } | null>(null);
  // The backend only knows about a collection once an item references it, so newly created
  // (still empty) collections live client-side until something is moved into them.
  const [extraCollections, setExtraCollections] = useState<string[]>([]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wishlist'] });

  const remove = useMutation({
    mutationFn: (sku: string) => wishlistApi.remove(sku),
    onSuccess: () => {
      invalidate();
      toast.info('Removed from wishlist');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const moveToCollection = useMutation({
    mutationFn: (vars: { sku: string; collectionName: string }) => wishlistApi.moveToCollection(vars.sku, vars.collectionName),
    onSuccess: (_data, vars) => {
      invalidate();
      setMoveMenuFor(null);
      setActiveCollection(vars.collectionName);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const deleteCollection = useMutation({
    mutationFn: (name: string) => wishlistApi.deleteCollection(name),
    onSuccess: (_data, name) => {
      invalidate();
      setExtraCollections((c) => c.filter((n) => n !== name));
      setActiveCollection(null);
      toast.info('Collection deleted');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const items = data?.items ?? [];
  const productQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: ['product', item.productId],
      queryFn: () => productsApi.getById(item.productId),
    })),
  });

  const isLoading = (data === undefined && !isError) || productQueries.some((q) => q.isLoading);

  const collectionNames = [...new Set([...items.map((i) => i.collectionName || DEFAULT_COLLECTION), ...extraCollections])];
  if (collectionNames.length === 0) collectionNames.push(DEFAULT_COLLECTION);
  const currentCollection =
    activeCollection && collectionNames.includes(activeCollection) ? activeCollection : collectionNames[0];
  const visibleItems = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => (item.collectionName || DEFAULT_COLLECTION) === currentCollection);

  // Saved items whose product has loaded, in collection order.
  const entries = visibleItems.flatMap(({ item, i }) => {
    const result = productQueries[i]?.data;
    return result ? [{ item, product: result.product, price: result.price }] : [];
  });

  const createCollection = () => {
    const name = newCollectionName.trim();
    if (!name || collectionNames.includes(name)) return;
    setExtraCollections((c) => [...c, name]);
    setActiveCollection(name);
    setNewCollectionName('');
    setNewCollectionOpen(false);
  };

  const onDeleteCollection = async () => {
    if (visibleItems.length === 0) {
      setExtraCollections((c) => c.filter((n) => n !== currentCollection));
      setActiveCollection(null);
      return;
    }
    const ok = await confirm({
      title: `Delete "${currentCollection}"?`,
      message: 'Items in this collection will also be removed from your wishlist.',
      confirmLabel: 'Delete',
      danger: true,
      icon: 'trash-outline',
    });
    if (ok) deleteCollection.mutate(currentCollection);
  };

  if (isError && !isLoading) return <ErrorState onRetry={() => refetch()} />;

  return (
    <KeyboardScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
    >
      {items.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.toolbar}>
            <Text style={font.caption}>
              {items.length} saved item{items.length === 1 ? '' : 's'}
            </Text>
            <LayoutToggle />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {collectionNames.map((name) => (
              <Chip
                key={name}
                label={`${name} (${items.filter((i) => (i.collectionName || DEFAULT_COLLECTION) === name).length})`}
                active={currentCollection === name}
                onPress={() => setActiveCollection(name)}
              />
            ))}
            {!newCollectionOpen && <Chip icon="add" label="New collection" onPress={() => setNewCollectionOpen(true)} />}
          </ScrollView>

          {newCollectionOpen && (
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Field
                autoFocus
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                onSubmitEditing={createCollection}
                placeholder="Collection name"
                containerStyle={{ flex: 1 }}
              />
              <Button title="Add" size="sm" onPress={createCollection} disabled={!newCollectionName.trim()} />
              <Button
                title="Cancel"
                size="sm"
                variant="ghost"
                onPress={() => {
                  setNewCollectionOpen(false);
                  setNewCollectionName('');
                }}
              />
            </View>
          )}

          {currentCollection !== DEFAULT_COLLECTION && (
            <Pressable onPress={onDeleteCollection} style={{ alignSelf: 'flex-end' }} hitSlop={8}>
              <Text style={{ fontSize: 12, color: colors.danger }}>Delete collection</Text>
            </Pressable>
          )}
        </View>
      )}

      {isLoading && (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.cell}>
              <Skeleton style={{ aspectRatio: 0.7, borderRadius: radius.lg }} />
            </View>
          ))}
        </View>
      )}

      {!isLoading && items.length === 0 && (
        <EmptyState
          icon="heart-outline"
          title="Your wishlist is empty"
          subtitle="Save items you like by tapping the heart icon on any product."
          actionLabel="Browse products"
          onAction={() => router.push('/search')}
        />
      )}

      {!isLoading && items.length > 0 && visibleItems.length === 0 && (
        <Text style={[font.caption, { textAlign: 'center', paddingVertical: 40 }]}>
          No items in "{currentCollection}" yet — use Move on any item to add it here.
        </Text>
      )}

      {!isLoading && entries.length > 0 && (
        <ProductList
          products={entries.map((e) => e.product)}
          keyOf={(_p, i) => entries[i].item.sku}
          options={(product, i) => {
            const { item, price } = entries[i];
            return {
              sku: item.sku,
              price: price.effectivePrice,
              actions: (
                <View style={[styles.cardActions, layout === 'list' && { flex: 0 }]}>
                  <Pressable
                    style={[styles.actionBtn, styles.cartBtn, layout !== 'list' && { flex: 1 }]}
                    accessibilityLabel="Add to Cart"
                    onPress={() => addItem.mutate({ productId: product._id, sku: item.sku, quantity: 1 })}
                  >
                    <Ionicons name="cart-outline" size={18} color={colors.brandForeground} />
                  </Pressable>
                  {collectionNames.length > 1 && (
                    <Pressable
                      style={styles.actionBtn}
                      accessibilityLabel="Move to"
                      onPress={() => setMoveMenuFor({ sku: item.sku, from: item.collectionName || DEFAULT_COLLECTION })}
                    >
                      <Ionicons name="folder-open-outline" size={17} color={colors.foreground} />
                    </Pressable>
                  )}
                  <Pressable style={styles.actionBtn} accessibilityLabel="Remove from wishlist" onPress={() => remove.mutate(item.sku)}>
                    <Ionicons name="trash-outline" size={17} color={colors.danger} />
                  </Pressable>
                </View>
              ),
            };
          }}
        />
      )}

      <Modal visible={!!moveMenuFor} transparent animationType="fade" onRequestClose={() => setMoveMenuFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMoveMenuFor(null)}>
          <View style={styles.menu}>
            <Text style={[font.heading, { padding: spacing.lg, paddingBottom: spacing.sm }]}>Move to</Text>
            {collectionNames
              .filter((name) => name !== moveMenuFor?.from)
              .map((name) => (
                <Pressable
                  key={name}
                  style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: colors.cream }]}
                  onPress={() => moveMenuFor && moveToCollection.mutate({ sku: moveMenuFor.sku, collectionName: name })}
                >
                  <Ionicons name="folder-outline" size={18} color={colors.brand} />
                  <Text style={font.body}>{name}</Text>
                </Pressable>
              ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.sm / 2 },
  cell: { width: '50%', padding: spacing.sm / 2 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Sits in the card's footer (grid / large cards) or beside the delivery line (list).
  cardActions: { flexDirection: 'row', gap: 6 },
  cartBtn: { backgroundColor: colors.brand, borderColor: colors.brand, paddingHorizontal: spacing.md },
  actionBtn: {
    height: 34,
    minWidth: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(58, 43, 30, 0.4)', justifyContent: 'center', padding: spacing.xl },
  menu: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingBottom: spacing.sm, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 12 },
});
