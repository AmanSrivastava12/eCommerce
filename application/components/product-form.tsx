import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { categoriesApi } from '../lib/api-client/resources';
import type { Category, Product } from '../lib/api-client/types';
import { colors, formatPrice, radius, spacing } from '../lib/theme';
import { uploadErrorMessage, uploadProductImage } from '../lib/upload-image';
import { toast } from './feedback';
import { Button, Checkbox, Chip, Field, IconButton, Section, Segmented, Thumb } from './ui';
import { KeyboardScrollView } from './keyboard';
import {
  MAX_VARIANT_IMAGES,
  VariantsEditor,
  newVariant,
  optionsToAttributes,
  validateVariants,
  type VariantDraft,
  type VariantErrors,
} from './variants-editor';

type DiscountType = 'none' | 'percent' | 'amount';
type Status = Product['status'];

/** The top-level category that owns `categoryId` — itself, if it has no parent. */
function selectedTopId(categories: Category[] | undefined, categoryId: string): string | undefined {
  const current = categories?.find((c) => c._id === categoryId);
  if (!current) return undefined;
  return current.parentId ?? current._id;
}

function subcategoriesOf(categories: Category[] | undefined, categoryId: string): Category[] {
  const topId = selectedTopId(categories, categoryId);
  if (!topId) return [];
  return (categories ?? []).filter((c) => c.parentId === topId);
}

export interface ProductFormValues {
  title: string;
  categoryId: string;
  shortDescription: string;
  mainImage: string | null;
  gallery: string[];
  basePrice: string;
  discountType: DiscountType;
  discountValue: string;
  variants: VariantDraft[];
  shipsFromPincode: string;
  estimatedDeliveryDays: string;
  freeShipping: boolean;
  shippingFee: string;
  hasWarranty: boolean;
  warranty: string;
  hasReturn: boolean;
  returnWindowDays: string;
  hasReplacement: boolean;
  replacementWindowDays: string;
  sections: { heading: string; content: string }[];
  faqs: { question: string; answer: string }[];
  status: Status;
}

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  title: '',
  categoryId: '',
  shortDescription: '',
  mainImage: null,
  gallery: [],
  basePrice: '',
  discountType: 'none',
  discountValue: '',
  variants: [newVariant()],
  shipsFromPincode: '',
  estimatedDeliveryDays: '5',
  freeShipping: true,
  shippingFee: '',
  hasWarranty: false,
  warranty: '',
  hasReturn: false,
  returnWindowDays: '7',
  hasReplacement: false,
  replacementWindowDays: '7',
  sections: [],
  faqs: [],
  status: 'active',
};

export function productToFormValues(p: Product): ProductFormValues {
  const { pricing, fulfillment } = p;
  const discountType: DiscountType = pricing.discountPercent ? 'percent' : pricing.discountAmount ? 'amount' : 'none';
  return {
    title: p.title,
    categoryId: String(p.categoryId),
    shortDescription: p.description.short,
    mainImage: p.images.main || null,
    gallery: p.images.gallery ?? [],
    basePrice: String(pricing.basePrice),
    discountType,
    discountValue: String(pricing.discountPercent || pricing.discountAmount || ''),
    variants: p.variants.map((variant) =>
      newVariant({
        sku: variant.sku,
        options: Object.entries(variant.attributes ?? {}).map(([name, value]) => ({ name, value: String(value) })),
        priceOverride: variant.priceOverride != null ? String(variant.priceOverride) : '',
        images: variant.images ?? [],
        existing: true,
      }),
    ),
    shipsFromPincode: fulfillment.shipsFromPincode,
    estimatedDeliveryDays: String(fulfillment.estimatedDeliveryDays),
    freeShipping: !fulfillment.shippingFee,
    shippingFee: fulfillment.shippingFee ? String(fulfillment.shippingFee) : '',
    hasWarranty: !!fulfillment.warranty,
    warranty: fulfillment.warranty ?? '',
    hasReturn: !!fulfillment.returnWindowDays,
    returnWindowDays: String(fulfillment.returnWindowDays || 7),
    hasReplacement: !!fulfillment.replacementWindowDays,
    replacementWindowDays: String(fulfillment.replacementWindowDays || 7),
    sections: p.description.sections,
    faqs: p.faqs,
    status: p.status,
  };
}

export function computeFinalPrice(v: Pick<ProductFormValues, 'basePrice' | 'discountType' | 'discountValue'>) {
  const base = Number(v.basePrice) || 0;
  const d = Number(v.discountValue) || 0;
  if (v.discountType === 'percent') return Math.max(0, base * (1 - Math.min(d, 100) / 100));
  if (v.discountType === 'amount') return Math.max(0, base - d);
  return base;
}

// Shapes the form into the API's product payload (shared by create and update).
export function formValuesToPayload(v: ProductFormValues) {
  const discount = Number(v.discountValue) || null;
  return {
    title: v.title.trim(),
    categoryId: v.categoryId,
    description: {
      short: v.shortDescription.trim(),
      sections: v.sections.filter((s) => s.heading.trim() && s.content.trim()),
      specifications: [],
    },
    faqs: v.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    images: { main: v.mainImage ?? '', gallery: v.gallery },
    pricing: {
      basePrice: Number(v.basePrice),
      currency: 'USD',
      discountPercent: v.discountType === 'percent' ? discount : null,
      discountAmount: v.discountType === 'amount' ? discount : null,
    },
    fulfillment: {
      warranty: v.hasWarranty && v.warranty.trim() ? v.warranty.trim() : null,
      returnWindowDays: v.hasReturn ? Number(v.returnWindowDays) : null,
      replacementWindowDays: v.hasReplacement ? Number(v.replacementWindowDays) : null,
      shippingFee: v.freeShipping ? 0 : Number(v.shippingFee) || 0,
      shipsFromPincode: v.shipsFromPincode.trim(),
      estimatedDeliveryDays: Number(v.estimatedDeliveryDays),
    },
    status: v.status,
    // The full variant list: the API adds new SKUs, updates saved ones and removes missing ones.
    variants: v.variants.map((variant) => ({
      sku: variant.sku.trim(),
      attributes: optionsToAttributes(variant.options),
      priceOverride: Number(variant.priceOverride) > 0 ? Number(variant.priceOverride) : null,
      images: variant.images,
      ...(variant.existing ? {} : { initialQuantity: Number(variant.stock) }),
    })),
  };
}

type Errors = Partial<Record<keyof ProductFormValues, string>>;

function validate(v: ProductFormValues, mode: 'create' | 'edit'): Errors {
  const e: Errors = {};
  const isPositiveInt = (s: string) => /^\d+$/.test(s) && Number(s) > 0;
  if (!v.title.trim()) e.title = 'Title is required';
  if (!v.categoryId) e.categoryId = 'Pick a category';
  if (!v.shortDescription.trim()) e.shortDescription = 'Add a short description';
  if (!(Number(v.basePrice) > 0)) e.basePrice = 'Enter a price greater than 0';
  if (v.discountType !== 'none') {
    const d = Number(v.discountValue);
    if (!(d > 0)) e.discountValue = 'Enter a discount greater than 0';
    else if (v.discountType === 'percent' && d >= 100) e.discountValue = 'Percentage must be below 100';
    else if (v.discountType === 'amount' && d >= Number(v.basePrice)) e.discountValue = 'Discount must be less than the price';
  }
  if (!v.mainImage) e.mainImage = 'Add a main photo';
  if (!v.freeShipping && !(Number(v.shippingFee) > 0)) e.shippingFee = 'Enter a shipping charge';
  if (!/^\d{4,10}$/.test(v.shipsFromPincode.trim())) e.shipsFromPincode = 'Enter a valid pincode';
  if (!isPositiveInt(v.estimatedDeliveryDays)) e.estimatedDeliveryDays = 'Enter days';
  if (v.hasWarranty && !v.warranty.trim()) e.warranty = 'Describe the warranty';
  if (v.hasReturn && !isPositiveInt(v.returnWindowDays)) e.returnWindowDays = 'Enter number of days';
  if (v.hasReplacement && !isPositiveInt(v.replacementWindowDays)) e.replacementWindowDays = 'Enter number of days';
  return e;
}

export function ProductForm({
  initialValues,
  mode,
  submitLabel,
  submitting,
  onSubmit,
  children,
}: {
  initialValues: ProductFormValues;
  mode: 'create' | 'edit';
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: ProductFormValues) => void;
  /** Extra sections rendered after the form (e.g. inventory and delete on the edit screen). */
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const [v, setV] = useState(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [variantErrors, setVariantErrors] = useState<VariantErrors>({});
  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // 'main', 'gallery' or a variant's key while its photos upload; one batch at a time.
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);

  // Photos go to S3 as soon as they're picked, so the form only ever holds public URLs.
  // `apply` uses functional updates because the form may have changed during the upload.
  const pickAndUpload = async (target: string, limit: number, apply: (urls: string[]) => void) => {
    if (uploadingTo) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: limit > 1,
      selectionLimit: limit,
    });
    if (result.canceled) return;
    setUploadingTo(target);
    try {
      apply(await Promise.all(result.assets.map(uploadProductImage)));
    } catch (error) {
      toast.error(uploadErrorMessage(error));
    } finally {
      setUploadingTo(null);
    }
  };

  const pickImages = (target: 'main' | 'gallery') =>
    target === 'main'
      ? pickAndUpload('main', 1, ([url]) => set('mainImage', url))
      : pickAndUpload('gallery', 6 - v.gallery.length, (urls) =>
          setV((prev) => ({ ...prev, gallery: [...prev.gallery, ...urls].slice(0, 6) })),
        );

  const pickVariantImages = (variant: VariantDraft) =>
    pickAndUpload(variant.key, MAX_VARIANT_IMAGES - variant.images.length, (urls) =>
      setV((prev) => ({
        ...prev,
        variants: prev.variants.map((x) =>
          x.key === variant.key ? { ...x, images: [...x.images, ...urls].slice(0, MAX_VARIANT_IMAGES) } : x,
        ),
      })),
    );

  const submit = () => {
    if (uploadingTo) {
      toast.info('Wait for the photos to finish uploading');
      return;
    }
    const found = validate(v, mode);
    const foundVariants = validateVariants(v.variants);
    setErrors(found);
    setVariantErrors(foundVariants);
    if (Object.keys(found).length === 0 && Object.keys(foundVariants).length === 0) onSubmit(v);
  };

  const finalPrice = computeFinalPrice(v);
  const base = Number(v.basePrice) || 0;
  const hasErrors = Object.values(errors).some(Boolean) || Object.keys(variantErrors).length > 0;

  return (
    <View style={{ flex: 1 }}>
      <KeyboardScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Section title="Basic details" icon="information-circle-outline">
          <Field label="Product title" placeholder="e.g. Handwoven cotton throw" value={v.title} onChangeText={(t) => set('title', t)} error={errors.title} />
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.wrap}>
              {(categories ?? []).filter((c) => !c.parentId).map((c) => (
                <Chip
                  key={c._id}
                  label={c.name}
                  active={v.categoryId === c._id || selectedTopId(categories, v.categoryId) === c._id}
                  onPress={() => set('categoryId', c._id)}
                />
              ))}
            </View>
            {subcategoriesOf(categories, v.categoryId).length > 0 && (
              <>
                <Text style={[styles.label, { marginTop: 2 }]}>Subcategory (optional, more specific)</Text>
                <View style={styles.wrap}>
                  {subcategoriesOf(categories, v.categoryId).map((c) => (
                    <Chip key={c._id} label={c.name} active={v.categoryId === c._id} onPress={() => set('categoryId', c._id)} />
                  ))}
                </View>
              </>
            )}
            {errors.categoryId && <Text style={styles.error}>{errors.categoryId}</Text>}
          </View>
          <Field
            label="Short description"
            placeholder="What makes this product special?"
            multiline
            value={v.shortDescription}
            onChangeText={(t) => set('shortDescription', t)}
            error={errors.shortDescription}
          />
        </Section>

        <Section title="Images" icon="images-outline" subtitle="A clear main photo, plus up to 6 more">
          <Pressable style={styles.mainImage} onPress={() => pickImages('main')}>
            {uploadingTo === 'main' ? (
              <View style={styles.imageEmpty}>
                <ActivityIndicator color={colors.brand} />
                <Text style={styles.linkText}>Uploading…</Text>
              </View>
            ) : v.mainImage ? (
              <>
                <Thumb uri={v.mainImage} size={88} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.label}>Main photo</Text>
                  <Text style={styles.linkText}>Tap to change</Text>
                </View>
              </>
            ) : (
              <View style={styles.imageEmpty}>
                <Ionicons name="camera-outline" size={26} color={colors.brand} />
                <Text style={styles.linkText}>Add main photo</Text>
              </View>
            )}
          </Pressable>
          {errors.mainImage && <Text style={styles.error}>{errors.mainImage}</Text>}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {v.gallery.map((uri, i) => (
              <View key={uri + i}>
                <Thumb uri={uri} size={64} />
                <Pressable style={styles.removeImage} hitSlop={6} onPress={() => set('gallery', v.gallery.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close" size={12} color={colors.brandForeground} />
                </Pressable>
              </View>
            ))}
            {v.gallery.length < 6 && (
              <Pressable style={styles.addThumb} onPress={() => pickImages('gallery')}>
                {uploadingTo === 'gallery' ? <ActivityIndicator color={colors.brand} /> : <Ionicons name="add" size={22} color={colors.brand} />}
              </Pressable>
            )}
          </ScrollView>
        </Section>

        <Section title="Pricing" icon="pricetag-outline">
          <Field label="Price (MRP)" prefix="$" placeholder="0" keyboardType="decimal-pad" value={v.basePrice} onChangeText={(t) => set('basePrice', t)} error={errors.basePrice} />
          <View style={{ gap: 6 }}>
            <Text style={styles.label}>Discount</Text>
            <Segmented
              value={v.discountType}
              onChange={(d) => set('discountType', d)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'percent', label: 'Percent (%)' },
                { value: 'amount', label: 'Flat ($)' },
              ]}
            />
          </View>
          {v.discountType !== 'none' && (
            <Field
              label={v.discountType === 'percent' ? 'Discount percentage' : 'Discount amount'}
              prefix={v.discountType === 'amount' ? '$' : undefined}
              right={v.discountType === 'percent' ? <Text style={styles.suffix}>%</Text> : undefined}
              placeholder="0"
              keyboardType="decimal-pad"
              value={v.discountValue}
              onChangeText={(t) => set('discountValue', t)}
              error={errors.discountValue}
            />
          )}
          {base > 0 && (
            <View style={styles.pricePreview}>
              <Text style={styles.previewLabel}>Customer pays</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                <Text style={styles.previewPrice}>{formatPrice(finalPrice)}</Text>
                {finalPrice < base && (
                  <>
                    <Text style={styles.strike}>{formatPrice(base)}</Text>
                    <Text style={styles.off}>{Math.round(((base - finalPrice) / base) * 100)}% off</Text>
                  </>
                )}
              </View>
            </View>
          )}
        </Section>

        <Section
          title="Variants"
          icon="layers-outline"
          subtitle="Sizes, colours or other options — each with its own SKU, price and stock"
        >
          <VariantsEditor
            variants={v.variants}
            onChange={(next) => {
              set('variants', next);
              if (Object.keys(variantErrors).length) setVariantErrors(validateVariants(next));
            }}
            errors={variantErrors}
            onPickImages={pickVariantImages}
            uploadingKey={uploadingTo}
            basePrice={base}
            finalPriceFor={(price) => computeFinalPrice({ ...v, basePrice: String(price) })}
          />
        </Section>

        <Section title="Shipping & delivery" icon="car-outline">
          <Checkbox
            checked={v.freeShipping}
            onChange={(c) => set('freeShipping', c)}
            label="Free shipping"
            description="Uncheck to charge customers a delivery fee for this product"
          />
          {!v.freeShipping && (
            <Field label="Shipping charge" prefix="$" placeholder="0" keyboardType="decimal-pad" value={v.shippingFee} onChangeText={(t) => set('shippingFee', t)} error={errors.shippingFee} />
          )}
          <View style={styles.row}>
            <Field
              containerStyle={{ flex: 1 }}
              label="Ships from pincode"
              placeholder="560001"
              keyboardType="number-pad"
              value={v.shipsFromPincode}
              onChangeText={(t) => set('shipsFromPincode', t)}
              error={errors.shipsFromPincode}
            />
            <Field
              containerStyle={{ flex: 1 }}
              label="Delivery in (days)"
              placeholder="5"
              keyboardType="number-pad"
              value={v.estimatedDeliveryDays}
              onChangeText={(t) => set('estimatedDeliveryDays', t)}
              error={errors.estimatedDeliveryDays}
            />
          </View>
        </Section>

        <Section title="Warranty & policies" icon="shield-checkmark-outline">
          <PolicyToggle checked={v.hasWarranty} onChange={(c) => set('hasWarranty', c)} label="Warranty" description="Covered by a manufacturer or seller warranty">
            <Field placeholder="e.g. 1 year manufacturer warranty" value={v.warranty} onChangeText={(t) => set('warranty', t)} error={errors.warranty} />
          </PolicyToggle>
          <PolicyToggle checked={v.hasReturn} onChange={(c) => set('hasReturn', c)} label="Returns accepted" description="Customers can return this product for a refund">
            <DaysField value={v.returnWindowDays} onChange={(t) => set('returnWindowDays', t)} error={errors.returnWindowDays} label="Return window" />
          </PolicyToggle>
          <PolicyToggle checked={v.hasReplacement} onChange={(c) => set('hasReplacement', c)} label="Replacement available" description="Customers can ask for a replacement unit">
            <DaysField value={v.replacementWindowDays} onChange={(t) => set('replacementWindowDays', t)} error={errors.replacementWindowDays} label="Replacement window" />
          </PolicyToggle>
        </Section>

        <Section
          title="Description sections"
          icon="document-text-outline"
          subtitle="Optional detailed sections shown on the product page"
        >
          {v.sections.map((s, i) => (
            <View key={i} style={styles.draft}>
              <View style={styles.draftHeader}>
                <Text style={styles.draftTitle}>Section {i + 1}</Text>
                <IconButton icon="trash-outline" color={colors.danger} onPress={() => set('sections', v.sections.filter((_, idx) => idx !== i))} />
              </View>
              <Field placeholder="Heading" value={s.heading} onChangeText={(t) => set('sections', v.sections.map((x, idx) => (idx === i ? { ...x, heading: t } : x)))} />
              <Field placeholder="Content" multiline value={s.content} onChangeText={(t) => set('sections', v.sections.map((x, idx) => (idx === i ? { ...x, content: t } : x)))} />
            </View>
          ))}
          <Button title="Add section" icon="add" variant="secondary" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => set('sections', [...v.sections, { heading: '', content: '' }])} />
        </Section>

        <Section title="FAQs" icon="help-circle-outline" subtitle="Answer common customer questions">
          {v.faqs.map((f, i) => (
            <View key={i} style={styles.draft}>
              <View style={styles.draftHeader}>
                <Text style={styles.draftTitle}>FAQ {i + 1}</Text>
                <IconButton icon="trash-outline" color={colors.danger} onPress={() => set('faqs', v.faqs.filter((_, idx) => idx !== i))} />
              </View>
              <Field placeholder="Question" value={f.question} onChangeText={(t) => set('faqs', v.faqs.map((x, idx) => (idx === i ? { ...x, question: t } : x)))} />
              <Field placeholder="Answer" multiline value={f.answer} onChangeText={(t) => set('faqs', v.faqs.map((x, idx) => (idx === i ? { ...x, answer: t } : x)))} />
            </View>
          ))}
          <Button title="Add FAQ" icon="add" variant="secondary" size="sm" style={{ alignSelf: 'flex-start' }} onPress={() => set('faqs', [...v.faqs, { question: '', answer: '' }])} />
        </Section>

        <Section title="Visibility" icon="eye-outline" subtitle="Only active products are visible to customers">
          <Segmented
            value={v.status}
            onChange={(s) => set('status', s)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </Section>

        {children}
      </KeyboardScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {hasErrors && <Text style={[styles.error, { textAlign: 'center' }]}>Please fix the highlighted fields.</Text>}
        <Button title={submitLabel} icon="checkmark" onPress={submit} loading={submitting} />
      </View>
    </View>
  );
}

function PolicyToggle({
  checked,
  onChange,
  label,
  description,
  children,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <View style={[styles.policy, checked && styles.policyOn]}>
      <Checkbox checked={checked} onChange={onChange} label={label} description={description} />
      {checked && <View style={{ paddingLeft: 32 }}>{children}</View>}
    </View>
  );
}

function DaysField({ label, value, onChange, error }: { label: string; value: string; onChange: (t: string) => void; error?: string }) {
  return (
    <Field
      label={label}
      keyboardType="number-pad"
      value={value}
      onChangeText={onChange}
      error={error}
      right={<Text style={styles.suffix}>days</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  label: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  error: { fontSize: 12, color: colors.danger },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  suffix: { fontSize: 14, color: colors.muted },
  linkText: { fontSize: 13, color: colors.brand, fontWeight: '600' },
  mainImage: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  imageEmpty: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.brandLight,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  addThumb: {
    width: 64,
    height: 64,
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
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.foreground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePreview: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  previewLabel: { fontSize: 12, color: colors.muted },
  previewPrice: { fontSize: 20, fontWeight: '700', color: colors.foreground },
  strike: { fontSize: 13, color: colors.muted, textDecorationLine: 'line-through' },
  off: { fontSize: 13, fontWeight: '600', color: colors.discount },
  policy: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  policyOn: { borderColor: colors.brandLight, backgroundColor: colors.surface },
  draft: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  draftHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  draftTitle: { fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
