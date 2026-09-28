import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, sellerProductsApi } from '../../../../lib/api-client/resources';
import { errorMessage } from '../../../../lib/api-client/client';
import type { InventoryItem, Product } from '../../../../lib/api-client/types';
import { ProductForm, formValuesToPayload, productToFormValues, type ProductFormValues } from '../../../../components/product-form';
import { variantLabel } from '../../../../components/variants-editor';
import { Badge, Button, Field, Section } from '../../../../components/ui';
import { colors, radius, spacing } from '../../../../lib/theme';
import { confirm, toast } from '../../../../components/feedback';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: products } = useQuery({ queryKey: ['seller-products'], queryFn: sellerProductsApi.list });
  const { data: inventory } = useQuery({ queryKey: ['seller-inventory'], queryFn: inventoryApi.list });
  const product = products?.find((p) => p._id === id);

  const update = useMutation({
    mutationFn: (v: ProductFormValues) => sellerProductsApi.update(id, formValuesToPayload(v)),
    onSuccess: () => {
      toast.success('Product updated');
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['seller-inventory'] });
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not save product')),
  });

  const remove = useMutation({
    mutationFn: () => sellerProductsApi.remove(id),
    onSuccess: () => {
      toast.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      queryClient.invalidateQueries({ queryKey: ['seller-inventory'] });
      router.back();
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not delete product')),
  });

  const save = async (v: ProductFormValues) => {
    if (!product) return;
    const kept = new Set(v.variants.map((x) => x.sku.trim()));
    const removed = product.variants.filter((x) => !kept.has(x.sku));
    if (removed.length) {
      const ok = await confirm({
        title: `Remove ${removed.length} variant${removed.length === 1 ? '' : 's'}?`,
        message: `${removed.map((r) => r.sku).join(', ')} and ${removed.length === 1 ? 'its' : 'their'} stock will be deleted. Customers won't be able to buy ${removed.length === 1 ? 'it' : 'them'} any more.`,
        confirmLabel: 'Remove and save',
        danger: true,
        icon: 'trash-outline',
      });
      if (!ok) return;
    }
    update.mutate(v);
  };

  if (!product) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const stockBySku = new Map((inventory ?? []).map((i) => [i.sku, i]));

  return (
    <ProductForm
      key={product._id}
      mode="edit"
      initialValues={productToFormValues(product)}
      submitLabel="Save changes"
      submitting={update.isPending}
      onSubmit={save}
    >
      <Section
        title="Stock"
        icon="archive-outline"
        subtitle="Per saved variant. New variants get their opening stock when you save."
      >
        {product.variants.map((variant, i) => (
          <StockRow key={variant.sku} variant={variant} item={stockBySku.get(variant.sku)} first={i === 0} loading={!inventory} />
        ))}
      </Section>

      <Button
        title="Delete product"
        icon="trash-outline"
        variant="danger"
        loading={remove.isPending}
        onPress={async () => {
          const ok = await confirm({
            title: 'Delete this product?',
            message: `"${product.title}" and all ${product.variants.length} of its variants will be removed from your store. This cannot be undone.`,
            confirmLabel: 'Delete',
            danger: true,
            icon: 'trash-outline',
          });
          if (ok) remove.mutate();
        }}
      />
    </ProductForm>
  );
}

function StockRow({
  variant,
  item,
  first,
  loading,
}: {
  variant: Product['variants'][number];
  item: InventoryItem | undefined;
  first: boolean;
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('');

  const save = useMutation({
    mutationFn: () =>
      inventoryApi.update(variant.sku, {
        quantity: quantity ? Number(quantity) : undefined,
        lowStockThreshold: threshold ? Number(threshold) : undefined,
      }),
    onSuccess: () => {
      setQuantity('');
      setThreshold('');
      toast.success(`Stock updated for ${variant.sku}`);
      queryClient.invalidateQueries({ queryKey: ['seller-inventory'] });
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not update stock')),
  });

  const available = item ? item.quantity - item.reserved_qty : null;
  const low = item ? item.quantity <= item.low_stock_threshold : false;
  const label = variantLabel({
    sku: variant.sku,
    options: Object.entries(variant.attributes ?? {}).map(([name, value]) => ({ name, value: String(value) })),
  });

  return (
    <View style={[styles.row, !first && styles.divider]}>
      <View style={styles.rowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.variantName} numberOfLines={1}>
            {label}
          </Text>
          <Text style={styles.muted}>SKU {variant.sku}</Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : item ? (
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Badge label={available === 0 ? 'Out of stock' : low ? `Low · ${available} left` : `${available} in stock`} tone={available === 0 ? 'danger' : low ? 'warning' : 'success'} />
            <Text style={styles.muted}>Alert at {item.low_stock_threshold}</Text>
          </View>
        ) : (
          <Badge label="No stock record" tone="neutral" />
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
        <Field containerStyle={{ flex: 1 }} label="Set quantity" placeholder={item ? String(item.quantity) : '0'} keyboardType="number-pad" value={quantity} onChangeText={setQuantity} />
        <Field containerStyle={{ flex: 1 }} label="Low-stock alert" placeholder={item ? String(item.low_stock_threshold) : '5'} keyboardType="number-pad" value={threshold} onChangeText={setThreshold} />
        <Button title="Save" size="sm" variant="secondary" style={styles.saveBtn} onPress={() => save.mutate()} loading={save.isPending} disabled={!item || (!quantity && !threshold)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  divider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  variantName: { fontSize: 14, fontWeight: '600', color: colors.foreground },
  muted: { fontSize: 12, color: colors.muted },
  saveBtn: { paddingVertical: 11, borderRadius: radius.md },
});
