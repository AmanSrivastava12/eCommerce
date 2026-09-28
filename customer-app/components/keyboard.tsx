import { forwardRef, type ComponentProps, type ComponentRef } from 'react';
import { Platform } from 'react-native';
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  KeyboardToolbar,
  type KeyboardToolbarProps,
} from 'react-native-keyboard-controller';
import { colors } from '../lib/theme';

/*
 * Keyboard handling for every screen with text inputs.
 *
 * Android runs edge-to-edge, where the OS no longer resizes the window when the keyboard
 * opens — so React Native's KeyboardAvoidingView (with `behavior` unset on Android) left
 * inputs hidden behind the keyboard. These wrappers use react-native-keyboard-controller,
 * which tracks the keyboard itself and behaves the same on Android and iOS.
 *
 * - `KeyboardScrollView`: use instead of ScrollView on any screen with inputs; it scrolls
 *   the focused field just above the keyboard.
 * - `FormKeyboardToolbar`: Prev / Next / Done bar above the keyboard for multi-field forms.
 *   Render it as the last child of a full-screen stack screen (not on tab screens — its
 *   hidden state sits just below the screen, which would overlap the tab bar), and pass
 *   `withToolbar` to the screen's KeyboardScrollView so fields clear it.
 * - `SheetKeyboardAvoider`: wraps the content of a bottom sheet inside a `Modal`, lifting
 *   it above the keyboard (Android modals are separate windows, handled by `automaticOffset`).
 *
 * `KeyboardProvider` must wrap the app once (root layout).
 */

export { KeyboardProvider } from 'react-native-keyboard-controller';

/** Gap kept between the focused input and the top of the keyboard. */
const FIELD_GAP = 24;
const TOOLBAR_HEIGHT = 42;

type KeyboardScrollViewProps = ComponentProps<typeof KeyboardAwareScrollView> & {
  /** Set when the screen renders a FormKeyboardToolbar, so fields clear it too. */
  withToolbar?: boolean;
};

export const KeyboardScrollView = forwardRef<ComponentRef<typeof KeyboardAwareScrollView>, KeyboardScrollViewProps>(
  function KeyboardScrollView({ withToolbar, ...props }, ref) {
    return (
      <KeyboardAwareScrollView
        ref={ref}
        bottomOffset={FIELD_GAP + (withToolbar ? TOOLBAR_HEIGHT : 0)}
        keyboardShouldPersistTaps="handled"
        // Dragging the content dismisses the keyboard (following the finger on iOS).
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        {...props}
      />
    );
  },
);

const TOOLBAR_THEME = {
  primary: colors.brand,
  disabled: colors.border,
  background: colors.surface,
  ripple: colors.cream,
};

export function FormKeyboardToolbar(props: Omit<KeyboardToolbarProps, 'theme'>) {
  return <KeyboardToolbar theme={{ light: TOOLBAR_THEME, dark: TOOLBAR_THEME }} {...props} />;
}

export function SheetKeyboardAvoider(props: ComponentProps<typeof KeyboardAvoidingView>) {
  return <KeyboardAvoidingView behavior="padding" automaticOffset {...props} />;
}
