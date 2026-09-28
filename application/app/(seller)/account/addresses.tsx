import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addressesApi } from '../../../lib/api-client/resources';
import type { Address } from '../../../lib/api-client/types';
import { Badge, Button, EmptyState } from '../../../components/ui';
import { colors, radius, spacing } from '../../../lib/theme';
import { confirm, toast } from '../../../components/feedback';
import { errorMessage } from '../../../lib/api-client/client';

function addressIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes('home')) return 'home-outline' as const;
  if (l.includes('warehouse') || l.includes('pickup')) return 'business-outline' as const;
  if (l.includes('work') || l.includes('office') || l.includes('store')) return 'briefcase-outline' as const;
  return 'location-outline' as const;
}

export default function AddressesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['addresses'], queryFn: addressesApi.list });

  const store = (addresses: Address[]) => queryClient.setQueryData(['addresses'], addresses);
  const makeDefault = useMutation({
    mutationFn: (id: string) => addressesApi.update(id, { isDefault: true }),
    onSuccess: (list) => {
      store(list);
      toast.success('Primary address updated');
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not update address')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: (list) => {
      store(list);
      toast.success('Address deleted');
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not delete address')),
  });

  // Keep the default address first so the primary one is always at the top.
  const addresses = [...(data ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

  return (
    <FlatList
      data={addresses}
      keyExtractor={(a) => a._id}
      refreshing={isRefetching}
      onRefresh={refetch}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Button title="Add new address" icon="add" onPress={() => router.push('/(seller)/account/address-form')} />
      }
      renderItem={({ item }) => (
        <View style={[styles.card, item.isDefault && styles.cardDefault]}>
          <View style={styles.header}>
            <Ionicons name={addressIcon(item.label)} size={18} color={colors.brand} />
            <Text style={styles.label}>{item.label}</Text>
            {item.isDefault && <Badge label="Primary" tone="brand" />}
          </View>
          <Text style={styles.text}>
            {item.line1}
            {item.line2 ? `, ${item.line2}` : ''}
          </Text>
          <Text style={styles.text}>
            {item.city}, {item.state} {item.postalCode}, {item.country}
          </Text>
          <Text style={styles.phone}>
            <Ionicons name="call-outline" size={12} color={colors.muted} /> {item.phone}
          </Text>
          <View style={styles.actions}>
            <Button
              title="Edit"
              icon="create-outline"
              size="sm"
              variant="secondary"
              onPress={() => router.push({ pathname: '/(seller)/account/address-form', params: { id: item._id } })}
            />
            {!item.isDefault && (
              <Button
                title="Make primary"
                icon="star-outline"
                size="sm"
                variant="secondary"
                loading={makeDefault.isPending && makeDefault.variables === item._id}
                onPress={() => makeDefault.mutate(item._id)}
              />
            )}
            <Button
              title="Delete"
              icon="trash-outline"
              size="sm"
              variant="danger"
              onPress={async () => {
                const ok = await confirm({
                  title: 'Delete this address?',
                  message: `"${item.label}" — ${item.line1}, ${item.city} will be removed.`,
                  confirmLabel: 'Delete',
                  danger: true,
                  icon: 'trash-outline',
                });
                if (ok) remove.mutate(item._id);
              }}
            />
          </View>
        </View>
      )}
      ListEmptyComponent={
        isLoading ? null : <EmptyState icon="location-outline" title="No saved addresses" subtitle="Add your business or pickup address." />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 3,
  },
  cardDefault: { borderColor: colors.brandLight },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  label: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.foreground, textTransform: 'capitalize' },
  text: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  phone: { fontSize: 12, color: colors.muted, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
});
