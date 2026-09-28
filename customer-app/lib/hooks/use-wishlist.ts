import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { wishlistApi } from '../api-client/resources';
import { useAuth } from '../auth/auth-context';
import { toast } from '../../components/feedback';

export function useWishlist() {
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

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
      toast.success('Added to wishlist');
    },
  });

  const remove = useMutation({
    mutationFn: (sku: string) => wishlistApi.remove(sku),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.info('Removed from wishlist');
    },
  });

  const toggle = (productId: string, sku: string, collectionName?: string) => {
    if (!isLoggedIn) {
      toast.error('Sign in to use your wishlist');
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
