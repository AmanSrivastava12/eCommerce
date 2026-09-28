import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { sellerProductsApi } from './api-client/resources';
import type { Product } from './api-client/types';

// Reviews only carry a product id / SKU, so screens resolve the
// title and images from the seller's own catalog (already cached under ['seller-products']).
export function useProductLookup() {
  const { data } = useQuery({ queryKey: ['seller-products'], queryFn: sellerProductsApi.list });
  return useMemo(() => {
    const byId = new Map<string, Product>();
    const bySku = new Map<string, Product>();
    for (const p of data ?? []) {
      byId.set(p._id, p);
      for (const v of p.variants) bySku.set(v.sku, p);
    }
    return (productId?: string | null, sku?: string | null): Product | undefined =>
      (productId ? byId.get(productId) : undefined) ?? (sku ? bySku.get(sku) : undefined);
  }, [data]);
}

export function productImage(product: Product | undefined, sku?: string | null) {
  if (!product) return null;
  const variant = product.variants.find((v) => v.sku === sku);
  return variant?.images?.[0] || product.images.main || null;
}
