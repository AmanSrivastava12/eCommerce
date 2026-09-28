import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius, spacing } from '../lib/theme';
import type { IconName } from './ui';

/*
 * App-wide feedback, modelled on the website's Toaster + ConfirmModal
 * (website/components/ui/toaster.tsx, confirm-modal.tsx): pill toasts at the bottom of the
 * screen and a single centered confirm dialog. Both are mounted once in the root layout;
 * call `toast.success(...)` / `await confirm({...})` from anywhere.
 */

// ---------- tiny external stores ----------

function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set: (next: T) => {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

// ---------- toasts ----------

type ToastVariant = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

const toastStore = createStore<Toast[]>([]);

function push(message: string, variant: ToastVariant) {
  const id = Math.random().toString(36).slice(2);
  toastStore.set([...toastStore.get(), { id, message, variant }].slice(-3));
  setTimeout(() => toastStore.set(toastStore.get().filter((t) => t.id !== id)), 2800);
}

export const toast = {
  success: (message: string) => push(message, 'success'),
  error: (message: string) => push(message, 'error'),
  info: (message: string) => push(message, 'info'),
};

const TOAST_STYLES: Record<ToastVariant, { bg: string; fg: string; icon: IconName }> = {
  success: { bg: colors.brand, fg: colors.brandForeground, icon: 'checkmark-circle' },
  error: { bg: colors.danger, fg: '#ffffff', icon: 'alert-circle' },
  info: { bg: colors.foreground, fg: colors.surface, icon: 'information-circle' },
};

function ToastPill({ toast: t }: { toast: Toast }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [anim]);
  const s = TOAST_STYLES[t.variant];
  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: s.bg },
        {
          opacity: anim,
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          ],
        },
      ]}
    >
      <Ionicons name={s.icon} size={16} color={s.fg} />
      <Text style={[styles.toastText, { color: s.fg }]}>{t.message}</Text>
    </Animated.View>
  );
}

// ---------- confirm ----------

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action (e.g. delete, sign out). */
  danger?: boolean;
  icon?: IconName;
}

const confirmStore = createStore<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

/** Drop-in replacement for `Alert.alert` confirmations; resolves to the user's choice. */
export function confirm(options: ConfirmOptions) {
  return new Promise<boolean>((resolve) => {
    confirmStore.get()?.resolve(false);
    confirmStore.set({ ...options, resolve });
  });
}

function closeConfirm(ok: boolean) {
  confirmStore.get()?.resolve(ok);
  confirmStore.set(null);
}

function ConfirmDialog() {
  const current = useSyncExternalStore(confirmStore.subscribe, confirmStore.get);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (current) {
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    }
  }, [current, anim]);

  return (
    <Modal visible={!!current} transparent animationType="fade" onRequestClose={() => closeConfirm(false)} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={() => closeConfirm(false)} accessibilityLabel="Dismiss" />
        {current && (
          <Animated.View
            accessibilityRole="alert"
            style={[
              styles.panel,
              {
                opacity: anim,
                transform: [
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
                  { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                ],
              },
            ]}
          >
            {current.icon && (
              <View style={[styles.panelIcon, current.danger && { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name={current.icon} size={20} color={current.danger ? colors.danger : colors.brand} />
              </View>
            )}
            <Text style={styles.panelTitle}>{current.title}</Text>
            {current.message && <Text style={styles.panelMessage}>{current.message}</Text>}
            <View style={styles.panelActions}>
              <Pressable style={({ pressed }) => [styles.cancel, pressed && { backgroundColor: colors.cream }]} onPress={() => closeConfirm(false)}>
                <Text style={styles.cancelText}>{current.cancelLabel ?? 'Cancel'}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtn,
                  { backgroundColor: current.danger ? colors.danger : colors.brand },
                  pressed && { opacity: 0.9 },
                ]}
                onPress={() => closeConfirm(true)}
              >
                <Text style={[styles.confirmText, { color: current.danger ? '#ffffff' : colors.brandForeground }]}>
                  {current.confirmLabel ?? 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

/** Mounted once in the root layout. */
export function FeedbackHost() {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.get);
  const insets = useSafeAreaInsets();
  return (
    <>
      <View pointerEvents="none" style={[styles.toastLayer, { bottom: insets.bottom + 72 }]}>
        {toasts.map((t) => (
          <ToastPill key={t.id} toast={t} />
        ))}
      </View>
      <ConfirmDialog />
    </>
  );
}

const styles = StyleSheet.create({
  toastLayer: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center', gap: spacing.sm, zIndex: 100 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    maxWidth: '100%',
    shadowColor: colors.foreground,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  toastText: { fontSize: 14, fontWeight: '500', flexShrink: 1 },

  modalRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(58, 43, 30, 0.4)' },
  panel: {
    width: '100%',
    maxWidth: 384,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 20,
    shadowColor: colors.foreground,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  panelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  panelTitle: { fontSize: 16, fontWeight: '600', color: colors.foreground },
  panelMessage: { fontSize: 14, color: colors.muted, marginTop: spacing.sm, lineHeight: 20 },
  panelActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: 20 },
  cancel: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: 9 },
  cancelText: { fontSize: 14, fontWeight: '500', color: colors.foreground },
  confirmBtn: { borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: 9 },
  confirmText: { fontSize: 14, fontWeight: '500' },
});
