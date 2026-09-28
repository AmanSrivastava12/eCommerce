import { deviceStorage } from './auth/token-storage';
import { createStore, useStore } from './external-store';

/**
 * How product listings are laid out:
 * - `feed`: one large card per row, stacked vertically
 * - `grid`: cards side by side (2 per row on phones, 3 on wider screens)
 * - `list`: compact rows — image on the left, name / variant / price on the right
 */
export type ProductLayout = 'feed' | 'grid' | 'list';

const STORAGE_KEY = 'productLayout';
const layoutStore = createStore<ProductLayout>('grid');

// Restore the shopper's last choice; until it loads, listings use the grid.
deviceStorage
  .get(STORAGE_KEY)
  .then((saved) => {
    if (saved === 'feed' || saved === 'grid' || saved === 'list') layoutStore.set(saved);
  })
  .catch(() => {});

export function useProductLayout() {
  return useStore(layoutStore);
}

export function setProductLayout(layout: ProductLayout) {
  layoutStore.set(layout);
  deviceStorage.set(STORAGE_KEY, layout).catch(() => {});
}
