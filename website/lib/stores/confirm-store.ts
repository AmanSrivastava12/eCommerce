import { create } from 'zustand';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action (e.g. delete). */
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
  request: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: '',
  message: undefined,
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
  resolve: null,
  request: (options) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        danger: options.danger ?? false,
        resolve,
      });
    }),
  handleConfirm: () => {
    get().resolve?.(true);
    set({ open: false, resolve: null });
  },
  handleCancel: () => {
    get().resolve?.(false);
    set({ open: false, resolve: null });
  },
}));

/** Drop-in replacement for `window.confirm` that resolves to the user's choice via the custom modal. */
export function useConfirm() {
  return useConfirmStore((s) => s.request);
}
