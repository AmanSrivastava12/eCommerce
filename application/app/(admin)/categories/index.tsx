import { useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api-client/client';
import { categoriesApi } from '../../../lib/api-client/resources';
import type { Category } from '../../../lib/api-client/types';

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function CategoryManagementScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);

  const categories = data ?? [];
  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);

  const create = useMutation({
    mutationFn: () => api.post('/categories', { name, slug: slug || slugify(name), parentId }),
    onSuccess: () => {
      setName('');
      setSlug('');
      setSlugTouched(false);
      setParentId(null);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });

  const renderCategory = (item: Category, isChild: boolean) => (
    <View key={item._id} style={[styles.card, isChild && styles.childCard]}>
      <Text style={styles.title}>{item.name}</Text>
      <Pressable onPress={() => remove.mutate(item._id)}>
        <Text style={styles.deleteText}>Delete</Text>
      </Pressable>
    </View>
  );

  return (
    <FlatList
      data={topLevel}
      keyExtractor={(item) => item._id}
      refreshing={isLoading || isRefetching}
      onRefresh={refetch}
      contentContainerStyle={{ gap: 8, padding: 16 }}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.formTitle}>Add category</Text>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (!slugTouched) setSlug(slugify(t));
            }}
          />
          <TextInput
            style={styles.input}
            placeholder="Slug"
            value={slug}
            onChangeText={(t) => {
              setSlug(t);
              setSlugTouched(true);
            }}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Parent category (optional — leave unselected for a top-level category)</Text>
          <View style={styles.chipRow}>
            <Pressable
              style={[styles.chip, parentId === null && styles.chipActive]}
              onPress={() => setParentId(null)}
            >
              <Text style={parentId === null ? styles.chipTextActive : styles.chipText}>None (top-level)</Text>
            </Pressable>
            {topLevel.map((c) => (
              <Pressable
                key={c._id}
                style={[styles.chip, parentId === c._id && styles.chipActive]}
                onPress={() => setParentId(c._id)}
              >
                <Text style={parentId === c._id ? styles.chipTextActive : styles.chipText}>{c.name}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.addButton, (!name.trim() || create.isPending) && styles.addButtonDisabled]}
            onPress={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
          >
            <Text style={styles.addButtonText}>
              {create.isPending ? 'Adding…' : parentId ? 'Add subcategory' : 'Add category'}
            </Text>
          </Pressable>

          <Text style={[styles.formTitle, { marginTop: 20 }]}>All categories</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ gap: 8 }}>
          {renderCategory(item, false)}
          {childrenOf(item._id).map((child) => renderCategory(child, true))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  form: { gap: 8, marginBottom: 12 },
  formTitle: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  label: { fontSize: 12, color: '#8a7460', marginTop: 8 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6dac2', borderRadius: 10, padding: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { borderWidth: 1, borderColor: '#e6dac2', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#ffffff' },
  chipActive: { backgroundColor: '#6f4a2f', borderColor: '#6f4a2f' },
  chipText: { fontSize: 13, color: '#3a2b1e' },
  chipTextActive: { fontSize: 13, color: '#fff8ef', fontWeight: '600' },
  addButton: { backgroundColor: '#6f4a2f', borderRadius: 999, padding: 10, alignItems: 'center', marginTop: 8 },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#fff8ef', fontWeight: '600' },
  card: {
    borderWidth: 1,
    borderColor: '#e6dac2',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  childCard: { marginLeft: 20, backgroundColor: '#faf6ef' },
  title: { fontWeight: '600' },
  deleteText: { color: '#b3492f' },
});
