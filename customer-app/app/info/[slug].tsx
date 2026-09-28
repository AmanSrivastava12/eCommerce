import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { INFO_PAGES, type InfoBlock } from '../../lib/info-pages';
import { colors, font, radius, spacing } from '../../lib/theme';
import { Card, EmptyState } from '../../components/ui';

function Block({ block }: { block: InfoBlock }) {
  if (block.type === 'p') return <Text style={styles.text}>{block.text}</Text>;
  if (block.type === 'jobs') {
    return (
      <View>
        {block.items.map((job, i) => (
          <View key={job.title} style={[styles.job, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={font.label}>{job.title}</Text>
              <Text style={font.caption}>{job.team}</Text>
            </View>
            <View style={styles.location}>
              <Text style={font.caption}>{job.location}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      {block.items.map((item, i) => (
        <View key={item} style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Text style={[styles.text, { width: 18 }]}>{block.type === 'ol' ? `${i + 1}.` : '•'}</Text>
          <Text style={[styles.text, { flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function InfoScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const page = INFO_PAGES[slug];

  if (!page) return <EmptyState icon="document-outline" title="Page not found" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: page.title }} />
      <View style={{ gap: 4 }}>
        <Text style={styles.title}>{page.title}</Text>
        {page.subtitle && <Text style={font.caption}>{page.subtitle}</Text>}
      </View>
      <Card style={{ gap: spacing.xl }}>
        {page.sections.map((section) => (
          <View key={section.heading} style={{ gap: spacing.sm }}>
            <Text style={font.heading}>{section.heading}</Text>
            {section.blocks.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  title: { fontSize: 22, fontWeight: '600', color: colors.foreground },
  text: { fontSize: 14, lineHeight: 21, color: colors.muted },
  job: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 10 },
  location: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
});
