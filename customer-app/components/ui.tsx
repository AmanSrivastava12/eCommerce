import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, font, radius, spacing } from '../lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------- Buttons ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  size = 'md',
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const palette = BUTTON_PALETTE[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        icon && <Ionicons name={icon} size={size === 'sm' ? 14 : 18} color={palette.fg} />
      )}
      <Text style={[styles.buttonText, size === 'sm' && styles.buttonTextSm, { color: palette.fg }]}>{title}</Text>
    </Pressable>
  );
}

const BUTTON_PALETTE: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.brand, fg: colors.brandForeground, border: colors.brand },
  secondary: { bg: colors.card, fg: colors.brand, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.brand, border: 'transparent' },
  danger: { bg: colors.card, fg: colors.danger, border: colors.dangerSoft },
};

export function IconButton({ icon, onPress, color = colors.brand }: { icon: IconName; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={18} color={color} />
    </Pressable>
  );
}

// ---------- Inputs ----------

export function Field({
  label,
  error,
  hint,
  icon,
  right,
  prefix,
  style,
  containerStyle,
  ...inputProps
}: TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: IconName;
  right?: ReactNode;
  prefix?: string;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.field, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputFocused,
          !!error && { borderColor: colors.danger },
          inputProps.multiline && { alignItems: 'flex-start' },
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color={colors.muted} />}
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          placeholderTextColor={colors.muted}
          {...inputProps}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, inputProps.multiline && styles.inputMultiline, style]}
        />
        {right}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// Every password input in the app goes through this so the show/hide toggle is consistent.
export function PasswordField(props: Omit<ComponentProps<typeof Field>, 'secureTextEntry' | 'right'>) {
  const [visible, setVisible] = useState(false);
  return (
    <Field
      icon="lock-closed-outline"
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      right={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
        </Pressable>
      }
    />
  );
}

export function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
  containerStyle,
}: {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(false);
  const iso = value ? value.toISOString().slice(0, 10) : '';

  // The native picker has no web implementation; fall back to a typed YYYY-MM-DD input.
  if (Platform.OS === 'web') {
    return (
      <Field
        label={label}
        containerStyle={containerStyle}
        icon="calendar-outline"
        placeholder="YYYY-MM-DD"
        defaultValue={iso}
        onChangeText={(text) => {
          const d = new Date(text);
          if (/^\d{4}-\d{2}-\d{2}$/.test(text) && !isNaN(d.getTime())) onChange(d);
        }}
      />
    );
  }

  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.inputWrap} onPress={() => setOpen(true)}>
        <Ionicons name="calendar-outline" size={18} color={colors.muted} />
        <Text style={[styles.input, !value && { color: colors.muted }]}>
          {value ? value.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select date'}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ?? new Date(1995, 0, 1)}
          mode="date"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, date) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'set' && date) onChange(date);
          }}
        />
      )}
      {open && Platform.OS === 'ios' && <Button title="Done" size="sm" variant="secondary" onPress={() => setOpen(false)} />}
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={styles.checkRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        {checked && <Ionicons name="checkmark" size={14} color={colors.brandForeground} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.checkLabel}>{label}</Text>
        {description && <Text style={styles.hint}>{description}</Text>}
      </View>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, active && styles.segmentActive]}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {icon && <Ionicons name={icon} size={13} color={active ? colors.brandForeground : colors.foreground} />}
      <Text style={[styles.chipText, active && { color: colors.brandForeground }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- Layout / display ----------

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Section({
  title,
  icon,
  subtitle,
  action,
  children,
}: {
  title: string;
  icon?: IconName;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card style={{ gap: spacing.md }}>
      <View style={styles.sectionHeader}>
        {icon && (
          <View style={styles.sectionIcon}>
            <Ionicons name={icon} size={16} color={colors.brand} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={font.heading}>{title}</Text>
          {subtitle && <Text style={font.caption}>{subtitle}</Text>}
        </View>
        {action}
      </View>
      {children}
    </Card>
  );
}

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

const BADGE_TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surface, fg: colors.muted },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.cream, fg: colors.brandDark },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  brand: { bg: colors.brand, fg: colors.brandForeground },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const t = BADGE_TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'active':
    case 'delivered':
    case 'completed':
    case 'approved':
    case 'verified':
    case 'paid':
      return 'success';
    case 'pending':
    case 'placed':
    case 'shipped':
    case 'requested':
    case 'draft':
      return 'warning';
    case 'cancelled':
    case 'rejected':
    case 'inactive':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={colors.star}
        />
      ))}
    </View>
  );
}

export function Thumb({ uri, size = 64 }: { uri?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: radius.md };
  if (!uri || failed) {
    return (
      <View style={[styles.thumbFallback, box]}>
        <Ionicons name="image-outline" size={size * 0.4} color={colors.muted} />
      </View>
    );
  }
  return <Image source={{ uri }} style={[styles.thumb, box]} onError={() => setFailed(true)} />;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.brand} />
      </View>
      <Text style={font.heading}>{title}</Text>
      {subtitle && <Text style={[font.caption, { textAlign: 'center' }]}>{subtitle}</Text>}
      {actionLabel && onAction && <Button title={actionLabel} size="sm" onPress={onAction} style={{ marginTop: spacing.sm }} />}
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  subtitle = "We couldn't load this. Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.dangerSoft }]}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <Text style={font.heading}>{title}</Text>
      <Text style={[font.caption, { textAlign: 'center' }]}>{subtitle}</Text>
      {onRetry && <Button title="Try again" size="sm" variant="secondary" icon="refresh" onPress={onRetry} style={{ marginTop: spacing.sm }} />}
    </View>
  );
}

/** Placeholder block for loading states (the website's `.skeleton` shimmer, as a gentle pulse). */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const [anim] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return <Animated.View style={[{ backgroundColor: colors.border, borderRadius: radius.md, opacity: anim }, style]} />;
}

export function QuantityStepper({
  value,
  onChange,
  canDecrease = true,
  canIncrease = true,
  disabled,
}: {
  value: number;
  onChange: (next: number) => void;
  canDecrease?: boolean;
  canIncrease?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityLabel="Decrease quantity"
        disabled={disabled || !canDecrease}
        onPress={() => onChange(value - 1)}
        style={[styles.stepperBtn, (disabled || !canDecrease) && { opacity: 0.3 }]}
      >
        <Ionicons name="remove" size={16} color={colors.brand} />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        accessibilityLabel={canIncrease ? 'Increase quantity' : 'No more stock available'}
        disabled={disabled || !canIncrease}
        onPress={() => onChange(value + 1)}
        style={[styles.stepperBtn, (disabled || !canIncrease) && { opacity: 0.3 }]}
      >
        <Ionicons name="add" size={16} color={colors.brand} />
      </Pressable>
    </View>
  );
}

export function InfoRow({ icon, label, value }: { icon: IconName; label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  buttonSm: { paddingVertical: 7, paddingHorizontal: spacing.md, gap: 6, borderRadius: radius.sm },
  buttonText: { fontSize: 15, fontWeight: '600' },
  buttonTextSm: { fontSize: 13 },
  iconButton: { padding: 4 },

  field: { gap: 6 },
  label: font.label,
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  inputFocused: { borderColor: colors.brandLight },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.foreground },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  prefix: { fontSize: 15, color: colors.muted },
  error: { fontSize: 12, color: colors.danger },
  hint: { fontSize: 12, color: colors.muted },

  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 2 },
  checkBox: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.brandLight,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  checkLabel: { fontSize: 14, fontWeight: '500', color: colors.foreground },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.brand },
  segmentText: { fontSize: 13, fontWeight: '500', color: colors.foreground },
  segmentTextActive: { color: colors.brandForeground },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 13, color: colors.foreground },

  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  thumb: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  thumbFallback: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: 48, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  stepperBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 26, textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.foreground },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10 },
  infoLabel: { fontSize: 14, color: colors.muted, width: 110 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.foreground, textAlign: 'right' },
});

// ---------- Password strength (mirrors website/components/ui/password-strength.tsx) ----------

const STRENGTH_LEVELS = [
  { label: 'Very weak', color: '#b3492f' },
  { label: 'Weak', color: '#c77b3a' },
  { label: 'Fair', color: '#b5943a' },
  { label: 'Good', color: '#7a9a4a' },
  { label: 'Strong', color: '#4a8a4f' },
] as const;

export function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

/** Same minimum the website enforces before letting a password through. */
export const MIN_PASSWORD_SCORE = 2;

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = passwordScore(password);
  const { label, color } = STRENGTH_LEVELS[score];
  const checks = [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: /[a-z]/.test(password) && /[A-Z]/.test(password), label: 'Upper & lowercase letters' },
    { met: /\d/.test(password), label: 'At least one number' },
    { met: /[^A-Za-z0-9]/.test(password), label: 'At least one symbol' },
  ];
  return (
    <View style={{ gap: 6 }} accessibilityLabel={`Password strength: ${label}`}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < score ? color : colors.border }} />
        ))}
      </View>
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
        {checks.map((c) => (
          <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={c.met ? 'checkmark' : 'ellipse-outline'} size={12} color={c.met ? colors.discount : colors.muted} />
            <Text style={{ fontSize: 11, color: c.met ? colors.discount : colors.muted }}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
