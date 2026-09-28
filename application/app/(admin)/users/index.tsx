import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../lib/api-client/resources';

export default function UserManagementScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers(),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
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
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.meta}>{item.email} · {item.role}</Text>
          <Pressable style={styles.reject} onPress={() => deactivate.mutate(item._id)}>
            <Text style={styles.actionText}>Deactivate</Text>
          </Pressable>
        </View>
      )}
      ListEmptyComponent={!isLoading ? <Text style={styles.empty}>No users.</Text> : null}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6dac2', borderRadius: 12, padding: 12, gap: 4 },
  title: { fontWeight: '600' },
  meta: { color: '#8a7460', fontSize: 12 },
  reject: { alignSelf: 'flex-start', backgroundColor: '#b3492f', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 6 },
  actionText: { color: '#fff8ef', fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#8a7460', marginTop: 40 },
});
