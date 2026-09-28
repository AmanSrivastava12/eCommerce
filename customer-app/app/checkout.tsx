import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { checkoutApi, meApi, ordersApi, type CheckoutBreakdown } from '../lib/api-client/resources';
import { errorMessage } from '../lib/api-client/client';
import { RequireAuth } from '../lib/auth/auth-context';
import { usePayment } from '../lib/payments';
import { colors, font, formatPrice, radius, spacing } from '../lib/theme';
import { toast } from '../components/feedback';
import { AddressForm } from '../components/address-form';
import { Button, Card, EmptyState, ErrorState, Section, Skeleton } from '../components/ui';
import { KeyboardScrollView, FormKeyboardToolbar } from '../components/keyboard';

export default function CheckoutScreen() {
  return (
    <RequireAuth next="/checkout">
      <Checkout />
    </RequireAuth>
  );
}

function Checkout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const pay = usePayment();
  const { data: addresses, isLoading, isError, refetch } = useQuery({ queryKey: ['addresses'], queryFn: meApi.listAddresses });
  const [addressId, setAddressId] = useState('');
  const [showNewAddress, setShowNewAddress] = useState(false);
  // Once a PaymentIntent exists it stays pending-payment; keep it so a cancelled/failed
  // payment can be retried against the same intent instead of pricing the cart again.
  const [pending, setPending] = useState<{ paymentIntentId: string; clientSecret: string; breakdown: CheckoutBreakdown } | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const selectedId = addressId || addresses?.find((a) => a.isDefault)?._id || addresses?.[0]?._id || '';

  const placeOrder = useMutation({
    mutationFn: (paymentIntentId: string) => ordersApi.place(selectedId, paymentIntentId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Payment successful — your order is confirmed');
      router.replace(`/orders/${res.order.id}`);
    },
    onError: (err) => setPaymentError(errorMessage(err, 'Payment succeeded but we could not finish placing your order')),
  });

  const runPayment = async (paymentIntentId: string, clientSecret: string) => {
    setPaying(true);
    setPaymentError(null);
    const result = await pay(clientSecret);
    setPaying(false);
    if (result.status === 'succeeded') {
      await placeOrder.mutateAsync(paymentIntentId);
    } else if (result.status === 'failed') {
      setPaymentError(result.message ?? 'Payment failed');
    }
  };

  const startPayment = useMutation({
    mutationFn: () => checkoutApi.createPaymentIntent(selectedId),
    onSuccess: async (res) => {
      setPending(res);
      await runPayment(res.paymentIntentId, res.clientSecret);
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not start checkout')),
  });

  if (isLoading) {
    return (
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Skeleton style={{ height: 90, borderRadius: radius.lg }} />
        <Skeleton style={{ height: 90, borderRadius: radius.lg }} />
      </View>
    );
  }
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  if (pending) {
    const { paymentIntentId, clientSecret, breakdown } = pending;
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xl }}>
          <View style={styles.payIcon}>
            <Ionicons name="card-outline" size={26} color={colors.brand} />
          </View>
          <Text style={font.title}>Payment</Text>
          <Text style={[font.caption, { textAlign: 'center' }]}>Complete payment to place your order.</Text>
          <Text style={styles.amount}>{formatPrice(breakdown.total)}</Text>
          {paymentError && <Text style={{ fontSize: 13, color: colors.danger, textAlign: 'center' }}>{paymentError}</Text>}
          <Button
            title="Pay now"
            icon="lock-closed"
            style={{ alignSelf: 'stretch' }}
            loading={paying || placeOrder.isPending}
            onPress={() => runPayment(paymentIntentId, clientSecret)}
          />
        </Card>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <KeyboardScrollView withToolbar contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={font.heading}>Shipping address</Text>

        {addresses && addresses.length === 0 && !showNewAddress && (
          <EmptyState
            icon="location-outline"
            title="No saved addresses"
            subtitle="Add a shipping address before checking out."
            actionLabel="Add address"
            onAction={() => setShowNewAddress(true)}
          />
        )}

        {(addresses ?? []).map((address) => {
          const selected = address._id === selectedId;
          return (
            <Pressable key={address._id} onPress={() => setAddressId(address._id)}>
              <Card style={[styles.address, selected && styles.addressSelected]}>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={colors.brand} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={font.label}>
                    {address.label}
                    {address.isDefault ? '  · Default' : ''}
                  </Text>
                  <Text style={font.caption}>
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.postalCode}
                  </Text>
                  <Text style={font.caption}>{address.phone}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}

        {addresses && addresses.length > 0 && !showNewAddress && (
          <Button title="Add a new address" icon="add" variant="secondary" onPress={() => setShowNewAddress(true)} />
        )}

        {showNewAddress && (
          <Section title="Add a new address" icon="location-outline" action={<Button title="Close" size="sm" variant="ghost" onPress={() => setShowNewAddress(false)} />}>
            <AddressForm onSaved={() => setShowNewAddress(false)} />
          </Section>
        )}
      </KeyboardScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title="Proceed to payment"
          icon="bag-check-outline"
          loading={startPayment.isPending || paying}
          disabled={!selectedId}
          onPress={() => startPayment.mutate()}
        />
      </View>
      <FormKeyboardToolbar />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  address: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', padding: spacing.md },
  addressSelected: { borderColor: colors.brand, backgroundColor: colors.surface },
  payIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  amount: { fontSize: 28, fontWeight: '700', color: colors.foreground },
  bar: { padding: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
});
