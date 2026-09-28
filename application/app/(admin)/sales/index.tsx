import { FlatList, Pressable, Text, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../../../lib/api-client/resources';

export default function SalesListScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['sales'], queryFn: salesApi.list });

  return (
    <View style={{ flex: 1 }}>
      <Pressable style={styles.newButton} onPress={() => router.push('/(admin)/sales/new')}>
        <Text style={styles.newButtonText}>+ New sale window</Text>
      </Pressable>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item._id}
        refreshing={isLoading || isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ gap: 8, padding: 16 }}
        renderItem={({ item }) => {
          const active = new Date() >= new Date(item.startAt) && new Date() <= new Date(item.endAt);
          return (
            <View style={styles.card}>
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.meta}>
                {new Date(item.startAt).toLocaleDateString()} – {new Date(item.endAt).toLocaleDateString()}
                {active ? ' · Active' : ''}
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
  title: { fontWeight: '600' },
  meta: { color: '#8a7460', fontSize: 12 },
});
