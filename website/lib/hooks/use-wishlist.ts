'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '@/lib/api-client/resources';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToastStore } from '@/lib/stores/toast-store';

export function useWishlist() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const queryClient = useQueryClient();
  const push = useToastStore((s) => s.push);

  const { data } = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.get,
    enabled: isLoggedIn,
  });

  const skus = new Set((data?.items ?? []).map((i) => i.sku));

  const add = useMutation({
    mutationFn: (vars: { productId: string; sku: string; collectionName?: string }) =>
      wishlistApi.add(vars.productId, vars.sku, vars.collectionName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      push('Added to wishlist');
    },
  });

  const remove = useMutation({
    mutationFn: (sku: string) => wishlistApi.remove(sku),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      push('Removed from wishlist', 'info');
    },
  });

  const toggle = (productId: string, sku: string, collectionName?: string) => {
    if (!isLoggedIn) {
      push('Sign in to use your wishlist', 'error');
      return;
    }
    if (skus.has(sku)) remove.mutate(sku);
    else add.mutate({ productId, sku, collectionName });
  };

  return {
    isWishlisted: (sku: string) => skus.has(sku),
    toggle,
    count: data?.items.length ?? 0,
  };
}
