import { useState } from 'react';
import { Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyboardScrollView } from '../../../components/keyboard';
import { salesApi } from '../../../lib/api-client/resources';

export default function NewSaleScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const create = useMutation({
    mutationFn: () => salesApi.create({ name, slug, startAt, endAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      router.back();
    },
  });

  return (
    <KeyboardScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />
      <Text style={styles.label}>Slug</Text>
      <TextInput style={styles.input} value={slug} onChangeText={setSlug} autoCapitalize="none" />
      <Text style={styles.label}>Start (ISO date)</Text>
      <TextInput style={styles.input} value={startAt} onChangeText={setStartAt} placeholder="2026-01-01T00:00:00Z" />
      <Text style={styles.label}>End (ISO date)</Text>
      <TextInput style={styles.input} value={endAt} onChangeText={setEndAt} placeholder="2026-01-07T23:59:59Z" />
      <Pressable style={styles.submit} onPress={() => create.mutate()} disabled={create.isPending}>
        <Text style={styles.submitText}>{create.isPending ? 'Creating…' : 'Create sale'}</Text>
      </Pressable>
    </KeyboardScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 4 },
  label: { fontSize: 13, color: '#8a7460', marginTop: 12 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6dac2', borderRadius: 10, padding: 10, marginTop: 4 },
  submit: { backgroundColor: '#6f4a2f', borderRadius: 999, padding: 14, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff8ef', fontWeight: '600' },
});
