import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { addressesApi, meApi, sellerProductsApi } from '../../../lib/api-client/resources';
import { errorMessage } from '../../../lib/api-client/client';
import type { Me } from '../../../lib/api-client/types';
import { useAuth } from '../../../lib/auth/auth-context';
import { useSellerRating } from '../../../lib/use-seller-rating';
import { Badge, Button, Card, Chip, DateField, Field, InfoRow, Section, Stars, statusTone, type IconName } from '../../../components/ui';
import { colors, formatDate, radius, spacing } from '../../../lib/theme';
import { confirm, toast } from '../../../components/feedback';
import { KeyboardScrollView } from '../../../components/keyboard';

const GENDERS: { value: NonNullable<Me['gender']>; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function SellerAccountScreen() {
  const router = useRouter();
  const { me, logout, refreshMe } = useAuth();
  const { summary: rating } = useSellerRating();
  const { data: products } = useQuery({ queryKey: ['seller-products'], queryFn: sellerProductsApi.list });
  const { data: addresses } = useQuery({ queryKey: ['addresses'], queryFn: addressesApi.list });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [gender, setGender] = useState<Me['gender']>();

  const resetForm = () => {
    setName(me?.name ?? '');
    setPhone(me?.phone ?? '');
    setDob(me?.dateOfBirth ? new Date(me.dateOfBirth) : null);
    setGender(me?.gender);
  };
  useEffect(resetForm, [me]);

  const update = useMutation({
    mutationFn: () =>
      meApi.update({
        name: name.trim(),
        phone: phone.trim(),
        dateOfBirth: dob ? dob.toISOString() : undefined,
        gender,
      }),
    onSuccess: async () => {
      await refreshMe();
      setEditing(false);
      toast.success('Profile updated');
    },
    onError: (e) => toast.error(errorMessage(e, 'Could not save profile')),
  });

  if (!me) return null;

  const primary = addresses?.find((a) => a.isDefault) ?? addresses?.[0];
  const activeProducts = products?.filter((p) => p.status === 'active').length ?? 0;
  const initials = me.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const verification = me.sellerProfile?.verificationStatus ?? 'pending';

  const saveProfile = () => {
    if (!name.trim()) return toast.error('Name is required');
    if (phone.trim() && !/^\+?[\d\s-]{7,15}$/.test(phone.trim())) return toast.error('Enter a valid contact number');
    update.mutate();
  };

  return (
    <KeyboardScrollView contentContainerStyle={styles.container}>
      <Card style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.name}>{me.name}</Text>
          <Text style={styles.business} numberOfLines={1}>
            {me.sellerProfile?.businessName}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Badge label={verification === 'verified' ? 'Verified seller' : `Verification ${verification}`} tone={statusTone(verification)} />
            {me.createdAt && <Text style={styles.caption}>Since {new Date(me.createdAt).getFullYear()}</Text>}
          </View>
        </View>
      </Card>

      <View style={styles.stats}>
        <Pressable style={[styles.stat, { flex: 1.4 }]} onPress={() => router.push('/(seller)/reviews')}>
          <Text style={styles.caption}>Average rating</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={styles.statValue}>{rating.count ? rating.average.toFixed(1) : '–'}</Text>
            <Text style={styles.caption}>/ 5</Text>
          </View>
          <Stars rating={rating.average} size={13} />
          <Text style={styles.caption}>
            from {rating.count} review{rating.count === 1 ? '' : 's'}
          </Text>
        </Pressable>
        <Stat icon="cube-outline" label="Products" value={products?.length ?? 0} sub={`${activeProducts} active`} />
      </View>

      <Section
        title="Personal details"
        icon="person-outline"
        action={
          !editing && (
            <Button title="Edit" icon="create-outline" size="sm" variant="secondary" onPress={() => setEditing(true)} />
          )
        }
      >
        {editing ? (
          <View style={{ gap: spacing.md }}>
            <Field label="Full name" icon="person-outline" value={name} onChangeText={setName} />
            <Field label="Email" icon="mail-outline" value={me.email} editable={false} hint="Contact support to change your login email" />
            <Field label="Contact number" icon="call-outline" keyboardType="phone-pad" placeholder="+91 98765 43210" value={phone} onChangeText={setPhone} />
            <DateField label="Date of birth" value={dob} onChange={setDob} maximumDate={new Date()} />
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.wrap}>
                {GENDERS.map((g) => (
                  <Chip key={g.value} label={g.label} active={gender === g.value} onPress={() => setGender(g.value)} />
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  resetForm();
                  setEditing(false);
                }}
              />
              <Button title="Save" icon="checkmark" style={{ flex: 1 }} loading={update.isPending} onPress={saveProfile} />
            </View>
          </View>
        ) : (
          <View>
            <InfoRow icon="person-outline" label="Name" value={me.name} />
            <InfoRow icon="mail-outline" label="Email" value={me.email} />
            <InfoRow icon="call-outline" label="Contact" value={me.phone} />
            <InfoRow icon="calendar-outline" label="Date of birth" value={formatDate(me.dateOfBirth)} />
            <InfoRow icon="male-female-outline" label="Gender" value={GENDERS.find((g) => g.value === me.gender)?.label} />
            <InfoRow icon="storefront-outline" label="Business" value={me.sellerProfile?.businessName} />
          </View>
        )}
      </Section>

      <Section
        title="Primary address"
        icon="location-outline"
        action={<Button title="Manage" size="sm" variant="secondary" onPress={() => router.push('/(seller)/account/addresses')} />}
      >
        {primary ? (
          <View style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 2 }}>
              <Text style={styles.addressLabel}>{primary.label}</Text>
              {primary.isDefault && <Badge label="Default" tone="warning" />}
            </View>
            <Text style={styles.addressText}>
              {primary.line1}
              {primary.line2 ? `, ${primary.line2}` : ''}
            </Text>
            <Text style={styles.addressText}>
              {primary.city}, {primary.state} {primary.postalCode}
            </Text>
            <Text style={styles.addressText}>{primary.country}</Text>
            <Text style={styles.caption}>Phone: {primary.phone}</Text>
          </View>
        ) : (
          <Button title="Add an address" icon="add" variant="secondary" onPress={() => router.push('/(seller)/account/address-form')} />
        )}
      </Section>

      <Section title="Security" icon="shield-checkmark-outline">
        <MenuRow
          icon="lock-closed-outline"
          label="Change password"
          hint="Update it using your current password"
          onPress={() => router.push('/(seller)/account/change-password')}
        />
        <MenuRow
          icon="key-outline"
          label="Reset password"
          hint="Forgot it? We'll email you a reset link"
          onPress={() => router.push({ pathname: '/(auth)/forgot-password', params: { email: me.email } })}
        />
      </Section>

      <Button
        title="Sign out"
        icon="log-out-outline"
        variant="danger"
        onPress={async () => {
          const ok = await confirm({
            title: 'Sign out?',
            message: "You'll need to sign in again to manage your store.",
            confirmLabel: 'Sign out',
            danger: true,
            icon: 'log-out-outline',
          });
          if (!ok) return;
          await logout();
          toast.info('Signed out');
        }}
      />
    </KeyboardScrollView>
  );
}

function Stat({ icon, label, value, sub }: { icon: IconName; label: string; value: number; sub: string }) {
  return (
    <View style={[styles.stat, { flex: 1 }]}>
      <Ionicons name={icon} size={18} color={colors.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.caption}>
        {label} · {sub}
      </Text>
    </View>
  );
}

function MenuRow({ icon, label, hint, onPress }: { icon: IconName; label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={colors.brand} />
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {hint && <Text style={styles.caption}>{hint}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.brandForeground, fontSize: 22, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: colors.foreground },
  business: { fontSize: 14, color: colors.muted },
  caption: { fontSize: 12, color: colors.muted },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 3,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.foreground },
  label: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addressLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground, textTransform: 'capitalize' },
  addressText: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 4 },
  menuLabel: { fontSize: 15, fontWeight: '500', color: colors.foreground },
});
