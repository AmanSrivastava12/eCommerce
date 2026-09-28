import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { meApi } from '../lib/api-client/resources';
import { errorMessage } from '../lib/api-client/client';
import { RequireAuth } from '../lib/auth/auth-context';
import { colors, font, radius, spacing } from '../lib/theme';
import { confirm, toast } from '../components/feedback';
import { AddressForm } from '../components/address-form';
import { Badge, Card, EmptyState, ErrorState, Section, Skeleton } from '../components/ui';
import { KeyboardScrollView, FormKeyboardToolbar } from '../components/keyboard';

export default function AddressesScreen() {
  return (
    <RequireAuth next="/addresses">
      <Addresses />
    </RequireAuth>
  );
}

function Addresses() {
  const queryClient = useQueryClient();
  const { data: addresses, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['addresses'],
    queryFn: meApi.listAddresses,
  });

  const onChanged = () => {
    queryClient.invalidateQueries({ queryKey: ['addresses'] });
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const remove = useMutation({
    mutationFn: (id: string) => meApi.removeAddress(id),
    onSuccess: () => {
      onChanged();
      toast.info('Address deleted');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
  const setDefault = useMutation({
    mutationFn: (id: string) => meApi.updateAddress(id, { isDefault: true }),
    onSuccess: onChanged,
    onError: (err) => toast.error(errorMessage(err)),
  });

  return (
    <View style={{ flex: 1 }}>
      <KeyboardScrollView withToolbar
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
      >
        {isLoading && [0, 1].map((i) => <Skeleton key={i} style={{ height: 96, borderRadius: radius.lg }} />)}

        {isError && !isLoading && <ErrorState onRetry={() => refetch()} />}

        {!isError && !isLoading && addresses?.length === 0 && (
          <EmptyState icon="location-outline" title="No saved addresses" subtitle="Add an address below so checkout is one tap next time." />
        )}

        {(addresses ?? []).map((a) => (
          <Card key={a._id} style={{ gap: 4 }}>
            <View style={styles.row}>
              <Text style={font.heading}>{a.label}</Text>
              {a.isDefault && <Badge label="Default" tone="success" />}
            </View>
            <Text style={font.caption}>
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postalCode}, {a.country}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="call-outline" size={12} color={colors.muted} />
              <Text style={font.caption}>{a.phone}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm }}>
              {!a.isDefault && (
                <Pressable onPress={() => setDefault.mutate(a._id)} hitSlop={6}>
                  <Text style={styles.link}>Set as default</Text>
                </Pressable>
              )}
              <Pressable
                hitSlop={6}
                onPress={async () => {
                  const ok = await confirm({
                    title: `Delete "${a.label}"?`,
                    message: 'This address will be removed from your account.',
                    confirmLabel: 'Delete',
                    danger: true,
                    icon: 'trash-outline',
                  });
                  if (ok) remove.mutate(a._id);
                }}
              >
                <Text style={[styles.link, { color: colors.danger }]}>Delete</Text>
              </Pressable>
            </View>
          </Card>
        ))}

        <Section title="Add a new address" icon="add-circle-outline">
          <AddressForm />
        </Section>
      </KeyboardScrollView>
      <FormKeyboardToolbar />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { fontSize: 13, fontWeight: '600', color: colors.brand },
});
