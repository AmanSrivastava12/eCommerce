import { useEffect, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { meApi } from '../../lib/api-client/resources';
import type { Me } from '../../lib/api-client/types';
import { useAuth } from '../../lib/auth/auth-context';
import { INFO_GROUPS } from '../../lib/info-pages';
import { colors, font, formatDate, radius, spacing } from '../../lib/theme';
import { confirm, toast } from '../../components/feedback';
import { Button, Card, Chip, DateField, Field, Skeleton, type IconName } from '../../components/ui';
import { KeyboardScrollView } from '../../components/keyboard';

const GENDER_OPTIONS: { value: NonNullable<Me['gender']>; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

type FormState = {
  name: string;
  phone: string;
  dateOfBirth: Date | null;
  gender: '' | NonNullable<Me['gender']>;
  profilePictureUrl: string;
};

function formFrom(me?: Me): FormState {
  return {
    name: me?.name ?? '',
    phone: me?.phone ?? '',
    dateOfBirth: me?.dateOfBirth ? new Date(me.dateOfBirth) : null,
    gender: me?.gender ?? '',
    profilePictureUrl: me?.profilePictureUrl ?? '',
  };
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function Avatar({ name, uri, size = 64 }: { name: string; uri?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.cream }}
      />
    );
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.36, fontWeight: '700', color: colors.brandForeground }}>{initials(name) || '?'}</Text>
    </View>
  );
}

function LinkRow({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && { backgroundColor: colors.cream }]}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.brand} />
      <Text style={[font.body, { flex: 1 }, danger && { color: colors.danger }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={16} color={colors.muted} />}
    </Pressable>
  );
}

function InfoLinks() {
  const router = useRouter();
  return (
    <>
      {INFO_GROUPS.map((group) => (
        <View key={group.title} style={{ gap: spacing.sm }}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {group.links.map((link, i) => (
              <View key={link.slug} style={i > 0 && styles.divider}>
                <LinkRow icon={link.icon} label={link.label} onPress={() => router.push(`/info/${link.slug}`)} />
              </View>
            ))}
          </Card>
        </View>
      ))}
      <Text style={[font.caption, { textAlign: 'center' }]}>© {new Date().getFullYear()} Shopwave. All rights reserved.</Text>
    </>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useAuth();

  if (!isReady) return null;
  if (!isLoggedIn) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
          <View style={styles.guestIcon}>
            <Ionicons name="person" size={28} color={colors.brand} />
          </View>
          <Text style={font.title}>Welcome to Shopwave</Text>
          <Text style={[font.caption, { textAlign: 'center' }]}>
            Sign in to track orders, save addresses, and keep your wishlist in sync.
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch' }}>
            <Button title="Sign In" style={{ flex: 1 }} onPress={() => router.push('/login')} />
            <Button title="Register" variant="secondary" style={{ flex: 1 }} onPress={() => router.push('/register')} />
          </View>
        </Card>
        <InfoLinks />
      </ScrollView>
    );
  }

  return <Profile />;
}

function Profile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const { data: me, isLoading, refetch, isRefetching } = useQuery({ queryKey: ['me'], queryFn: meApi.get });
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(formFrom());

  useEffect(() => {
    if (me) setForm(formFrom(me));
  }, [me]);

  const update = useMutation({
    mutationFn: () =>
      meApi.update({
        name: form.name,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth ? form.dateOfBirth.toISOString().slice(0, 10) : undefined,
        gender: form.gender || undefined,
        profilePictureUrl: form.profilePictureUrl || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated);
      setIsEditing(false);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Could not update your profile. Please try again.'),
  });

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your account, orders, and wishlist.',
      confirmLabel: 'Sign out',
      danger: true,
      icon: 'log-out-outline',
    });
    if (!ok) return;
    await logout();
    toast.info('Signed out');
    router.navigate('/');
  };

  const shortcuts: { icon: IconName; label: string; href: Href }[] = [
    { icon: 'receipt-outline', label: 'Orders', href: '/orders' },
    { icon: 'heart-outline', label: 'Wishlist', href: '/wishlist' },
    { icon: 'location-outline', label: 'Saved addresses', href: '/addresses' },
  ];

  const defaultAddress = me?.addresses?.find((a) => a.isDefault) ?? me?.addresses?.[0];

  return (
    <View style={{ flex: 1 }}>
      <KeyboardScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand} />}
      >
        {isLoading || !me ? (
          <Skeleton style={{ height: 180, borderRadius: radius.lg }} />
        ) : !isEditing ? (
          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={me.name} uri={me.profilePictureUrl} />
              <View style={{ flex: 1 }}>
                <Text style={font.title}>{me.name}</Text>
                <Text style={[font.caption, { textTransform: 'capitalize' }]}>{me.role} account</Text>
              </View>
              <Button title="Edit" icon="create-outline" size="sm" variant="secondary" onPress={() => setIsEditing(true)} />
            </View>
            <View style={styles.details}>
              <Detail label="Email" value={me.email} />
              <Detail label="Phone" value={me.phone} />
              <Detail label="Date of birth" value={me.dateOfBirth ? formatDate(me.dateOfBirth) : undefined} />
              <Detail label="Gender" value={GENDER_OPTIONS.find((g) => g.value === me.gender)?.label} />
              <View style={{ paddingVertical: 10, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.detailLabel}>Default address</Text>
                  <Text style={styles.manage} onPress={() => router.push('/addresses')}>
                    Manage
                  </Text>
                </View>
                {defaultAddress ? (
                  <>
                    <Text style={font.label}>{defaultAddress.label}</Text>
                    <Text style={font.caption}>
                      {defaultAddress.line1}
                      {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ''}, {defaultAddress.city}, {defaultAddress.state}{' '}
                      {defaultAddress.postalCode}, {defaultAddress.country}
                    </Text>
                    <Text style={font.caption}>{defaultAddress.phone}</Text>
                  </>
                ) : (
                  <Text style={font.caption}>No address saved yet.</Text>
                )}
              </View>
            </View>
          </Card>
        ) : (
          <Card style={{ gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Avatar name={form.name || me.name} uri={form.profilePictureUrl || undefined} size={56} />
              <Field
                label="Profile picture URL (optional)"
                value={form.profilePictureUrl}
                onChangeText={(profilePictureUrl) => setForm((f) => ({ ...f, profilePictureUrl }))}
                placeholder="https://…"
                autoCapitalize="none"
                keyboardType="url"
                containerStyle={{ flex: 1 }}
              />
            </View>
            <Field label="Full name" value={form.name} onChangeText={(name) => setForm((f) => ({ ...f, name }))} />
            <Field label="Email" value={me.email} editable={false} hint="Contact support to change your email" style={{ color: colors.muted }} />
            <Field
              label="Phone"
              value={form.phone}
              onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
              placeholder="+91-9800000000"
              keyboardType="phone-pad"
            />
            <DateField
              label="Date of birth"
              value={form.dateOfBirth}
              maximumDate={new Date()}
              onChange={(dateOfBirth) => setForm((f) => ({ ...f, dateOfBirth }))}
            />
            <View style={{ gap: 6 }}>
              <Text style={font.label}>Gender</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {GENDER_OPTIONS.map((g) => (
                  <Chip key={g.value} label={g.label} active={form.gender === g.value} onPress={() => setForm((f) => ({ ...f, gender: g.value }))} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Save changes" style={{ flex: 1 }} loading={update.isPending} disabled={!form.name.trim()} onPress={() => update.mutate()} />
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setForm(formFrom(me));
                  setIsEditing(false);
                }}
              />
            </View>
          </Card>
        )}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {shortcuts.map((s, i) => (
            <View key={s.label} style={i > 0 && styles.divider}>
              <LinkRow icon={s.icon} label={s.label} onPress={() => router.push(s.href)} />
            </View>
          ))}
        </Card>

        <InfoLinks />

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <LinkRow icon="log-out-outline" label="Sign out" danger onPress={handleLogout} />
        </Card>
      </KeyboardScrollView>
    </View>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ paddingVertical: 10, gap: 2 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[font.body, !value && { color: colors.muted }]}>{value || 'Not added'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  avatar: { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  guestIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' },
  details: { borderTopWidth: 1, borderTopColor: colors.border },
  detailLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.muted },
  manage: { fontSize: 12, fontWeight: '600', color: colors.brand },
  groupTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.muted, marginLeft: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});
