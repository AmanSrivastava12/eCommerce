'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api-client/resources';
import { useAuthStore } from '../stores/auth-store';
import { useCartStore } from '../stores/cart-store';
import { useToastStore } from '../stores/toast-store';

export function useCart() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const setCart = useCartStore((s) => s.setCart);
  const push = useToastStore((s) => s.push);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cart', isLoggedIn],
    queryFn: async () => {
      const cart = await cartApi.get(isLoggedIn);
      setCart(cart);
      return cart;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const addItem = useMutation({
    mutationFn: (vars: { productId: string; sku: string; quantity: number }) =>
      cartApi.addItem(vars.productId, vars.sku, vars.quantity, isLoggedIn),
    onSuccess: (cart) => {
      setCart(cart);
      invalidate();
      push('Added to cart');
    },
    onError: () => push('Could not add to cart', 'error'),
  });

  const updateItem = useMutation({
    mutationFn: (vars: { sku: string; quantity: number }) =>
      cartApi.updateItem(vars.sku, vars.quantity, isLoggedIn),
    onSuccess: (cart) => {
      setCart(cart);
      invalidate();
    },
  });

  const removeItem = useMutation({
    mutationFn: (sku: string) => cartApi.removeItem(sku, isLoggedIn),
    onSuccess: (cart) => {
      setCart(cart);
      invalidate();
    },
  });

  const applyCoupon = useMutation({
    mutationFn: (code: string) => cartApi.applyCoupon(code, isLoggedIn),
    onSuccess: (cart) => {
      setCart(cart);
      invalidate();
    },
  });

  const removeCoupon = useMutation({
    mutationFn: (code: string) => cartApi.removeCoupon(code, isLoggedIn),
    onSuccess: (cart) => {
      setCart(cart);
      invalidate();
    },
  });

  return { ...query, addItem, updateItem, removeItem, applyCoupon, removeCoupon };
}
