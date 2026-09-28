import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../lib/api-client/resources';

export default function AdminDashboardScreen() {
  const { data: pendingSellers } = useQuery({
    queryKey: ['admin-sellers', 'pending'],
    queryFn: () => adminApi.listSellers('pending'),
  });
  const { data: returns } = useQuery({ queryKey: ['admin-returns'], queryFn: adminApi.listReturns });

  const pendingReturns = returns?.filter((r) => r.status === 'requested').length ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Platform overview</Text>
      <View style={styles.grid}>
        <Stat label="Pending seller approvals" value={pendingSellers?.length ?? 0} />
        <Stat label="Pending return requests" value={pendingReturns} />
      </View>
      <Text style={styles.note}>
        v1 dashboard shows simple aggregate counts, not full analytics, per the implementation plan.
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  heading: { fontSize: 18, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexBasis: '45%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6dac2', borderRadius: 12, padding: 16 },
  value: { fontSize: 28, fontWeight: '700' },
  label: { color: '#8a7460', fontSize: 12, marginTop: 4 },
  note: { color: '#a9754b', fontSize: 12, marginTop: 16 },
});
