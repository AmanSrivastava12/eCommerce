import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, formatPrice, radius, spacing } from '../lib/theme';
import { Badge, Button, Field, IconButton, Thumb } from './ui';

export const MAX_VARIANT_IMAGES = 4;

export interface VariantOption {
  name: string;
  value: string;
}

export interface VariantDraft {
  /** Stable React key; SKUs can be edited while typing so they can't serve as keys. */
  key: string;
  sku: string;
  options: VariantOption[];
  priceOverride: string;
  images: string[];
  /** Opening stock. Only used for variants that don't exist on the server yet. */
  stock: string;
  /** Already saved: its SKU is locked and stock is managed in the Stock section. */
  existing: boolean;
}

export type VariantErrors = Record<string, Partial<Record<'sku' | 'options' | 'priceOverride' | 'stock', string>>>;

let keySeq = 0;
export function newVariant(partial: Partial<VariantDraft> = {}): VariantDraft {
  keySeq += 1;
  return { key: `v${Date.now()}-${keySeq}`, sku: '', options: [], priceOverride: '', images: [], stock: '', existing: false, ...partial };
}

export function variantLabel(v: Pick<VariantDraft, 'options' | 'sku'>) {
  const values = v.options.map((o) => o.value.trim()).filter(Boolean);
  return values.length ? values.join(' / ') : v.sku.trim() || 'New variant';
}

/** Shape the API expects: `{ Color: 'Black', Size: 'M' }`. */
export function optionsToAttributes(options: VariantOption[]) {
  const attributes: Record<string, string> = {};
  for (const o of options) {
    if (o.name.trim() && o.value.trim()) attributes[o.name.trim()] = o.value.trim();
  }
  return attributes;
}

export function validateVariants(variants: VariantDraft[]): VariantErrors {
  const errors: VariantErrors = {};
  const add = (key: string, field: keyof VariantErrors[string], message: string) => {
    errors[key] = { ...errors[key], [field]: message };
  };
  const skuCount = new Map<string, number>();
  variants.forEach((v) => skuCount.set(v.sku.trim().toLowerCase(), (skuCount.get(v.sku.trim().toLowerCase()) ?? 0) + 1));
  const comboCount = new Map<string, number>();
  const comboOf = (v: VariantDraft) =>
    Object.entries(optionsToAttributes(v.options))
      .map(([k, val]) => `${k.toLowerCase()}=${val.toLowerCase()}`)
      .sort()
      .join('|');
  variants.forEach((v) => comboCount.set(comboOf(v), (comboCount.get(comboOf(v)) ?? 0) + 1));

  for (const v of variants) {
    const sku = v.sku.trim();
    if (!sku) add(v.key, 'sku', 'SKU is required');
    else if (!/^[A-Za-z0-9._-]{1,64}$/.test(sku)) add(v.key, 'sku', 'Use letters, numbers, dots, dashes or underscores');
    else if ((skuCount.get(sku.toLowerCase()) ?? 0) > 1) add(v.key, 'sku', 'Each variant needs a different SKU');

    if (v.options.some((o) => !o.name.trim() !== !o.value.trim())) add(v.key, 'options', 'Fill in both the option name and its value');
    else if (variants.length > 1 && !comboOf(v)) add(v.key, 'options', 'Add at least one option (e.g. Color: Black) to tell variants apart');
    else if (variants.length > 1 && (comboCount.get(comboOf(v)) ?? 0) > 1) add(v.key, 'options', 'Another variant has the same options');

    if (v.priceOverride.trim() && !(Number(v.priceOverride) > 0)) add(v.key, 'priceOverride', 'Enter a price greater than 0, or leave empty');
    if (!v.existing && !/^\d+$/.test(v.stock.trim())) add(v.key, 'stock', 'Enter the opening stock');
  }
  return errors;
}

export function VariantsEditor({
  variants,
  onChange,
  errors,
  onPickImages,
  uploadingKey,
  basePrice,
  finalPriceFor,
}: {
  variants: VariantDraft[];
  onChange: (variants: VariantDraft[]) => void;
  errors: VariantErrors;
  /** Picks and uploads photos for a variant; the parent owns uploads so they can't be lost to stale state. */
  onPickImages: (variant: VariantDraft) => void;
  /** Key of the variant whose photos are uploading, if any. */
  uploadingKey: string | null;
  basePrice: number;
  /** What a customer pays for a given base price after the product's discount. */
  finalPriceFor: (base: number) => number;
}) {
  const update = (key: string, patch: Partial<VariantDraft>) => onChange(variants.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const remove = (key: string) => onChange(variants.filter((v) => v.key !== key));

  const addVariant = () => {
    // Pre-fill the option names already in use (e.g. Color, Size) so only values are needed.
    const names = variants[0]?.options.map((o) => o.name).filter((n) => n.trim()) ?? [];
    onChange([...variants, newVariant({ options: (names.length ? names : ['']).map((name) => ({ name, value: '' })) })]);
  };

  return (
    <View style={{ gap: spacing.md }}>
      {variants.map((v, index) => {
        const e = errors[v.key] ?? {};
        const override = Number(v.priceOverride);
        const base = override > 0 ? override : basePrice;
        return (
          <View key={v.key} style={[styles.card, Object.keys(e).length > 0 && { borderColor: colors.danger }]}>
            <View style={styles.header}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{index + 1}</Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {variantLabel(v)}
              </Text>
              {v.existing ? <Badge label="Saved" tone="neutral" /> : <Badge label="New" tone="warning" />}
              {variants.length > 1 && <IconButton icon="trash-outline" color={colors.danger} onPress={() => remove(v.key)} />}
            </View>

            <Field
              label="SKU"
              placeholder="e.g. TEE-BLK-M"
              autoCapitalize="characters"
              autoCorrect={false}
              value={v.sku}
              onChangeText={(t) => update(v.key, { sku: t })}
              editable={!v.existing}
              error={e.sku}
              hint={v.existing ? "A saved variant's SKU can't be changed" : 'Unique code for this exact option'}
            />

            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Options {variants.length === 1 && <Text style={styles.muted}>(optional)</Text>}</Text>
              {v.options.map((o, i) => (
                <View key={i} style={styles.optionRow}>
                  <Field
                    containerStyle={{ flex: 1 }}
                    placeholder="Name, e.g. Color"
                    value={o.name}
                    onChangeText={(t) => update(v.key, { options: v.options.map((x, idx) => (idx === i ? { ...x, name: t } : x)) })}
                  />
                  <Field
                    containerStyle={{ flex: 1 }}
                    placeholder="Value, e.g. Black"
                    value={o.value}
                    onChangeText={(t) => update(v.key, { options: v.options.map((x, idx) => (idx === i ? { ...x, value: t } : x)) })}
                  />
                  <IconButton icon="close" color={colors.muted} onPress={() => update(v.key, { options: v.options.filter((_, idx) => idx !== i) })} />
                </View>
              ))}
              {e.options && <Text style={styles.error}>{e.options}</Text>}
              <Pressable onPress={() => update(v.key, { options: [...v.options, { name: '', value: '' }] })} hitSlop={6} style={styles.addLink}>
                <Ionicons name="add-circle-outline" size={16} color={colors.brand} />
                <Text style={styles.addLinkText}>Add option</Text>
              </Pressable>
            </View>

            <View style={styles.row}>
              <Field
                containerStyle={{ flex: 1 }}
                label="Price (optional)"
                prefix="$"
                placeholder={basePrice > 0 ? String(basePrice) : 'Product price'}
                keyboardType="decimal-pad"
                value={v.priceOverride}
                onChangeText={(t) => update(v.key, { priceOverride: t })}
                error={e.priceOverride}
                hint={base > 0 ? `Customer pays ${formatPrice(finalPriceFor(base))}` : 'Empty = product price'}
              />
              {!v.existing && (
                <Field
                  containerStyle={{ flex: 1 }}
                  label="Opening stock"
                  placeholder="0"
                  keyboardType="number-pad"
                  value={v.stock}
                  onChangeText={(t) => update(v.key, { stock: t })}
                  error={e.stock}
                />
              )}
            </View>

            <View style={{ gap: 6 }}>
              <Text style={styles.label}>
                Photos <Text style={styles.muted}>(optional, shown when this variant is selected)</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {v.images.map((uri, i) => (
                  <View key={uri + i}>
                    <Thumb uri={uri} size={56} />
                    <Pressable style={styles.removeImage} hitSlop={6} onPress={() => update(v.key, { images: v.images.filter((_, idx) => idx !== i) })}>
                      <Ionicons name="close" size={11} color={colors.brandForeground} />
                    </Pressable>
                  </View>
                ))}
                {v.images.length < MAX_VARIANT_IMAGES && (
                  <Pressable style={styles.addThumb} onPress={() => onPickImages(v)}>
                    {uploadingKey === v.key ? <ActivityIndicator color={colors.brand} /> : <Ionicons name="add" size={20} color={colors.brand} />}
                  </Pressable>
                )}
              </ScrollView>
            </View>
          </View>
        );
      })}
      <Button title="Add variant" icon="add" variant="secondary" size="sm" style={{ alignSelf: 'flex-start' }} onPress={addVariant} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  indexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { fontSize: 11, fontWeight: '700', color: colors.brandForeground },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.foreground },
  label: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  muted: { fontSize: 12, fontWeight: '400', color: colors.muted },
  error: { fontSize: 12, color: colors.danger },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  optionRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  addLinkText: { fontSize: 13, fontWeight: '600', color: colors.brand },
  addThumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImage: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
