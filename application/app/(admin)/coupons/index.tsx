import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { couponsApi } from '../../../lib/api-client/resources';
import type { Coupon } from '../../../lib/api-client/types';

export default function CouponsListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['coupons'], queryFn: couponsApi.list });

  const toggleActive = useMutation({
    mutationFn: (coupon: Coupon) => couponsApi.update(coupon._id, { active: !coupon.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coupons'] }),
  });

  return (
    <View style={{ flex: 1 }}>
      <Pressable style={styles.newButton} onPress={() => router.push('/(admin)/coupons/new')}>
        <Text style={styles.newButtonText}>+ New coupon</Text>
      </Pressable>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item._id}
        refreshing={isLoading || isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ gap: 8, padding: 16 }}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>No coupons yet — create one to offer customers a discount.</Text> : null
        }
        renderItem={({ item }) => {
          const now = new Date();
          const expired = new Date(item.validTo) < now;
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.title}>{item.code}</Text>
                <Pressable onPress={() => toggleActive.mutate(item)} style={[styles.badge, item.active && !expired ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={item.active && !expired ? styles.badgeTextActive : styles.badgeTextInactive}>
                    {expired ? 'Expired' : item.active ? 'Active' : 'Inactive'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.meta}>
                {item.discountType === 'percent' ? `${item.discountValue}% off` : `$${item.discountValue} off`}
                {item.minCartValue ? ` · Min cart $${item.minCartValue}` : ''}
                {item.maxDiscountAmount ? ` · Capped at $${item.maxDiscountAmount}` : ''}
              </Text>
              <Text style={styles.meta}>
                Valid {new Date(item.validFrom).toLocaleDateString()} – {new Date(item.validTo).toLocaleDateString()}
                {item.usageLimitPerUser ? ` · ${item.usageLimitPerUser}x per customer` : ''}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  newButton: { margin: 16, backgroundColor: '#6f4a2f', borderRadius: 999, padding: 12, alignItems: 'center' },
  newButtonText: { color: '#fff8ef', fontWeight: '600' },
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6dac2', borderRadius: 12, padding: 12, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '600', fontSize: 15 },
  meta: { color: '#8a7460', fontSize: 12 },
  empty: { textAlign: 'center', color: '#8a7460', marginTop: 32, paddingHorizontal: 24 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeActive: { backgroundColor: '#e4eed9' },
  badgeInactive: { backgroundColor: '#f6e1da' },
  badgeTextActive: { color: '#4f7a3a', fontSize: 11, fontWeight: '600' },
  badgeTextInactive: { color: '#b3492f', fontSize: 11, fontWeight: '600' },
});
