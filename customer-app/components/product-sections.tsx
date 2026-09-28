import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { productsApi } from '../lib/api-client/resources';
import { errorMessage } from '../lib/api-client/client';
import type { Product } from '../lib/api-client/types';
import { useAuth } from '../lib/auth/auth-context';
import { colors, font, formatDate, radius, spacing } from '../lib/theme';
import { Button, Field, Stars, type IconName } from './ui';

// Native ports of website/components/product/* and components/reviews/review-section.tsx.

export function FulfillmentFeatures({ fulfillment }: { fulfillment: Product['fulfillment'] }) {
  const tiles = [
    fulfillment.warranty && { icon: 'shield-checkmark-outline', title: 'Warranty', subtitle: fulfillment.warranty },
    fulfillment.returnWindowDays && {
      icon: 'refresh-outline',
      title: 'Easy Returns',
      subtitle: `${fulfillment.returnWindowDays}-day return window`,
    },
    fulfillment.returnWindowDays && {
      icon: 'swap-horizontal-outline',
      title: 'Easy Exchange',
      subtitle: `Exchange within ${fulfillment.returnWindowDays} days`,
    },
    {
      icon: 'cube-outline',
      title: 'Free Replacement',
      subtitle: fulfillment.replacementWindowDays
        ? `Replacement within ${fulfillment.replacementWindowDays} days`
        : 'If delivered damaged, defective, or wrong item',
    },
  ].filter(Boolean) as { icon: IconName; title: string; subtitle: string }[];

  return (
    <View style={styles.tiles}>
      {tiles.map((tile) => (
        <View key={tile.title} style={styles.tileCell}>
          <View style={styles.tile}>
            <Ionicons name={tile.icon} size={26} color={colors.brand} />
            <Text style={styles.tileTitle}>{tile.title}</Text>
            <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function SpecTable({ specifications }: { specifications: Product['description']['specifications'] }) {
  if (specifications.length === 0) return null;
  return (
    <View style={{ gap: spacing.lg }}>
      {specifications.map((group) => (
        <View key={group.group} style={{ gap: spacing.sm }}>
          <Text style={font.label}>{group.group}</Text>
          <View style={styles.table}>
            {group.items.map((item, i) => (
              <View key={item.key} style={[styles.tableRow, i > 0 && styles.tableDivider]}>
                <Text style={[styles.tableCell, { color: colors.muted }]}>{item.key}</Text>
                <Text style={styles.tableCell}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function FaqAccordion({ faqs }: { faqs: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (faqs.length === 0) return null;
  return (
    <View style={styles.table}>
      {faqs.map((faq, i) => {
        const open = openIndex === i;
        return (
          <View key={i} style={i > 0 && styles.tableDivider}>
            <Pressable
              style={styles.faqQuestion}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOpenIndex(open ? null : i);
              }}
            >
              <Text style={[font.label, { flex: 1 }]}>{faq.question}</Text>
              <Ionicons name={open ? 'remove' : 'add'} size={18} color={colors.brand} />
            </Pressable>
            {open && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
          </View>
        );
      })}
    </View>
  );
}

export function PincodeCheck({ productId }: { productId: string }) {
  const [pincode, setPincode] = useState('');
  const [result, setResult] = useState<{ serviceable: boolean; estimatedDeliveryDays: number | null } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    if (!pincode) return;
    setChecking(true);
    setError(null);
    try {
      setResult(await productsApi.serviceability(productId, pincode));
    } catch (err) {
      setResult(null);
      setError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={{ gap: 6 }}>
      <Text style={font.label}>Check delivery at your location</Text>
      {/* The button drops its own padding and stretches to the input's height, so the two
          line up exactly instead of the button hanging a few pixels lower. */}
      <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm }}>
        <Field
          icon="location-outline"
          value={pincode}
          onChangeText={(t) => setPincode(t.replace(/\D/g, ''))}
          onSubmitEditing={check}
          placeholder="Pincode"
          keyboardType="number-pad"
          maxLength={6}
          returnKeyType="search"
          containerStyle={{ flex: 1 }}
        />
        <Button title="Check" onPress={check} loading={checking} disabled={!pincode} style={{ paddingVertical: 0 }} />
      </View>
      {result && (
        <Text style={{ fontSize: 13, color: result.serviceable ? colors.discount : colors.danger }}>
          {result.serviceable ? `Delivered in ~${result.estimatedDeliveryDays} days` : 'Not deliverable to this pincode'}
        </Text>
      )}
      {error && <Text style={{ fontSize: 13, color: colors.danger }}>{error}</Text>}
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} hitSlop={4} accessibilityLabel={`${i} star${i > 1 ? 's' : ''}`}>
          <Ionicons name={value >= i ? 'star' : 'star-outline'} size={26} color={colors.star} />
        </Pressable>
      ))}
    </View>
  );
}

export function ReviewSection({ productId, sku }: { productId: string; sku: string }) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: reviews } = useQuery({
    queryKey: ['reviews', productId, sku],
    queryFn: () => productsApi.reviews(productId, sku),
  });

  const submit = useMutation({
    mutationFn: () => productsApi.submitReview(productId, { sku, rating, comment }),
    onSuccess: () => {
      setComment('');
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['reviews', productId, sku] });
    },
    // The backend returns distinct 403 reasons ("not logged in" vs "haven't purchased this
    // variant"), so surface its message as-is.
    onError: (err) => setFormError(errorMessage(err, 'Could not submit review')),
  });

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={font.title}>Reviews</Text>
      {(reviews ?? []).map((review) => (
        <View key={review._id} style={styles.review}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Stars rating={review.rating} size={13} />
            {review.title && (
              <Text style={[font.label, { flex: 1 }]} numberOfLines={1}>
                {review.title}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19 }}>{review.comment}</Text>
          <Text style={font.caption}>{formatDate(review.createdAt)}</Text>
        </View>
      ))}
      {reviews && reviews.length === 0 && <Text style={font.caption}>No reviews yet for this variant.</Text>}

      <View style={styles.review}>
        {!isLoggedIn ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={font.caption}>Sign in to write a review.</Text>
            <Button title="Sign in" size="sm" variant="secondary" onPress={() => router.push('/login')} />
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text style={font.label}>Rate this variant</Text>
            <StarPicker value={rating} onChange={setRating} />
            <Field
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience with this exact variant…"
              multiline
            />
            {formError && <Text style={{ fontSize: 13, color: colors.danger }}>{formError}</Text>}
            <Button
              title="Submit review"
              onPress={() => submit.mutate()}
              loading={submit.isPending}
              disabled={!comment.trim()}
            />
            <Text style={font.caption}>You can only review a product variant after receiving it in a completed order.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', margin: -spacing.xs },
  tileCell: { width: '50%', padding: spacing.xs },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  tileTitle: { fontSize: 13, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  tileSubtitle: { fontSize: 11, color: colors.muted, textAlign: 'center' },

  table: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  tableRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm },
  tableDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  tableCell: { flex: 1, fontSize: 13, color: colors.foreground },

  faqQuestion: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  faqAnswer: { fontSize: 13, color: colors.muted, lineHeight: 19, paddingHorizontal: spacing.md, paddingBottom: spacing.md },

  review: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 6 },
});
