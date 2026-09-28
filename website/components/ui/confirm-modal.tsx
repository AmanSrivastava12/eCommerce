'use client';

import { useConfirmStore } from '@/lib/stores/confirm-store';
import { Modal } from './modal';

/** Mounted once in the root layout — every `useConfirm()` call anywhere in the app renders through this. */
export function ConfirmModal() {
  const { open, title, message, confirmLabel, cancelLabel, danger, handleConfirm, handleCancel } =
    useConfirmStore();

  return (
    <Modal open={open} onClose={handleCancel} labelledBy="confirm-modal-title">
      <h2 id="confirm-modal-title" className="text-base font-semibold text-[var(--foreground)]">
        {title}
      </h2>
      {message && <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button
          title={cancelLabel}
          onClick={handleCancel}
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--cream)]"
        >
          {cancelLabel}
        </button>
        <button
          title={confirmLabel}
          onClick={handleConfirm}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            danger
              ? 'bg-[var(--danger)] text-white hover:opacity-90'
              : 'bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand-dark)]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
