import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../lib/api-client/resources';

export default function SellerVerificationScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-sellers', 'pending'],
    queryFn: () => adminApi.listSellers('pending'),
  });

  const verify = useMutation({
    mutationFn: (vars: { id: string; status: 'verified' | 'rejected' }) =>
      adminApi.verifySeller(vars.id, vars.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-sellers'] }),
  });

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(item) => item._id}
      refreshing={isLoading || isRefetching}
      onRefresh={refetch}
      contentContainerStyle={{ gap: 8, padding: 16 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.sellerProfile?.businessName ?? item.name}</Text>
          <Text style={styles.meta}>{item.email}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <Pressable style={styles.approve} onPress={() => verify.mutate({ id: item._id, status: 'verified' })}>
              <Text style={styles.actionText}>Approve</Text>
            </Pressable>
            <Pressable style={styles.reject} onPress={() => verify.mutate({ id: item._id, status: 'rejected' })}>
              <Text style={styles.actionText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      )}
      ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No pending sellers.</Text> : null}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6dac2', borderRadius: 12, padding: 12, gap: 4 },
  title: { fontWeight: '600' },
  meta: { color: '#8a7460', fontSize: 12 },
  approve: { backgroundColor: '#4f7a3a', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  reject: { backgroundColor: '#b3492f', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  actionText: { color: '#fff8ef', fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#8a7460', marginTop: 40 },
});
