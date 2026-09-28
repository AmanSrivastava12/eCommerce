import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api-client/resources';
import { errorMessage } from '../api-client/client';
import { Cart } from '../api-client/types';
import { useAuth } from '../auth/auth-context';
import { toast } from '../../components/feedback';

// Same behaviour as website/lib/hooks/use-cart.ts. The website mirrors the cart into a
// zustand store for the header badge; here the badge reads this query directly.
export function useCart() {
  const { isReady, isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cart', isLoggedIn],
    queryFn: () => cartApi.get(isLoggedIn),
    enabled: isReady,
  });

  const setCart = (cart: Cart) => queryClient.setQueryData(['cart', isLoggedIn], cart);

  const addItem = useMutation({
    mutationFn: (vars: { productId: string; sku: string; quantity: number }) =>
      cartApi.addItem(vars.productId, vars.sku, vars.quantity, isLoggedIn),
    onSuccess: (cart) => {
      setCart(cart);
      toast.success('Added to cart');
    },
    onError: (err) => toast.error(errorMessage(err, 'Could not add to cart')),
  });

  const updateItem = useMutation({
    mutationFn: (vars: { sku: string; quantity: number }) => cartApi.updateItem(vars.sku, vars.quantity, isLoggedIn),
    onSuccess: setCart,
    onError: (err) => toast.error(errorMessage(err, 'Could not update quantity')),
  });

  const removeItem = useMutation({
    mutationFn: (sku: string) => cartApi.removeItem(sku, isLoggedIn),
    onSuccess: setCart,
    onError: (err) => toast.error(errorMessage(err, 'Could not remove item')),
  });

  const applyCoupon = useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code, isLoggedIn),
    onSuccess: setCart,
  });

  const removeCoupon = useMutation({
    mutationFn: (code: string) => cartApi.removeCoupon(code, isLoggedIn),
    onSuccess: setCart,
  });

  return {
    ...query,
    itemCount: query.data?.items.length ?? 0,
    addItem,
    updateItem,
    removeItem,
    applyCoupon,
    removeCoupon,
  };
}
