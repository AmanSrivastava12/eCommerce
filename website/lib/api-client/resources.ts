import { api } from './client';
import {
  Address,
  Cart,
  Category,
  EffectivePrice,
  Me,
  Order,
  Product,
  Review,
  ReturnRequest,
} from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; refreshToken: string }>(
      '/auth/login',
      { email, password },
      { auth: false },
    ),
  register: (data: { email: string; password: string; name: string; role?: 'customer' | 'seller' }) =>
    api.post<{ accessToken: string; refreshToken: string }>('/auth/register', data, { auth: false }),
  refresh: (refreshToken: string) =>
    api.post<{ accessToken: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken },
      { auth: false },
    ),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, newPassword }, { auth: false }),
};

export const meApi = {
  get: () => api.get<Me>('/me'),
  update: (data: {
    name?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: Me['gender'];
    profilePictureUrl?: string;
  }) => api.patch<Me>('/me', data),
  listAddresses: () => api.get<Address[]>('/me/addresses'),
  addAddress: (data: Omit<Address, '_id'>) => api.post<Address[]>('/me/addresses', data),
  updateAddress: (id: string, data: Partial<Address>) =>
    api.patch<Address[]>(`/me/addresses/${id}`, data),
  removeAddress: (id: string) => api.delete<Address[]>(`/me/addresses/${id}`),
};

export interface ProductBrowseQuery {
  category?: string;
  search?: string;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStock?: boolean;
  sort?: string;
}

function toQueryString(query: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const productsApi = {
  browse: (query: ProductBrowseQuery = {}) =>
    api.get<Product[]>(`/products${toQueryString({ ...query })}`, { auth: false }),
  getById: (id: string) =>
    api.get<{ product: Product; price: EffectivePrice }>(`/products/${id}`, { auth: false }),
  serviceability: (id: string, pincode: string) =>
    api.get<{ serviceable: boolean; estimatedDeliveryDays: number | null }>(
      `/products/${id}/serviceability?pincode=${encodeURIComponent(pincode)}`,
      { auth: false },
    ),
  reviews: (id: string, sku?: string) =>
    api.get<Review[]>(`/products/${id}/reviews${sku ? `?sku=${encodeURIComponent(sku)}` : ''}`, {
      auth: false,
    }),
  submitReview: (
    id: string,
    data: { sku: string; rating: number; deliveryRating?: number; packagingRating?: number; title?: string; comment: string },
  ) => api.post<Review>(`/products/${id}/reviews`, data),
};

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories', { auth: false }),
};

function guestSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem('guestSessionId');
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem('guestSessionId', id);
  }
  return id;
}

// Cart routes are @Public on the backend (guests can use the cart too), but a logged-in
// user's request still needs its Authorization header attached so the server can tell
// them apart from a guest — passing `auth: false` unconditionally here would silently
// drop that header for everyone and orphan every logged-in add-to-cart call.
export const cartApi = {
  get: (isLoggedIn: boolean) =>
    api.get<Cart>(`/cart${isLoggedIn ? '' : `?guestSessionId=${guestSessionId()}`}`, { auth: isLoggedIn }),
  addItem: (productId: string, sku: string, quantity: number, isLoggedIn: boolean) =>
    api.post<Cart>(
      '/cart/items',
      { productId, sku, quantity, ...(isLoggedIn ? {} : { guestSessionId: guestSessionId() }) },
      { auth: isLoggedIn },
    ),
  updateItem: (sku: string, quantity: number, isLoggedIn: boolean) =>
    api.patch<Cart>(
      `/cart/items/${sku}`,
      { quantity, ...(isLoggedIn ? {} : { guestSessionId: guestSessionId() }) },
      { auth: isLoggedIn },
    ),
  removeItem: (sku: string, isLoggedIn: boolean) =>
    api.delete<Cart>(
      `/cart/items/${sku}${isLoggedIn ? '' : `?guestSessionId=${guestSessionId()}`}`,
      { auth: isLoggedIn },
    ),
  applyCoupon: (code: string, isLoggedIn: boolean) =>
    api.post<Cart>(
      '/cart/coupon',
      { code, ...(isLoggedIn ? {} : { guestSessionId: guestSessionId() }) },
      { auth: isLoggedIn },
    ),
  removeCoupon: (code: string, isLoggedIn: boolean) =>
    api.delete<Cart>(
      `/cart/coupon/${code}${isLoggedIn ? '' : `?guestSessionId=${guestSessionId()}`}`,
      { auth: isLoggedIn },
    ),
  merge: () => api.post<Cart>('/cart/merge', { guestSessionId: guestSessionId() }),
};

export interface WishlistItem {
  productId: string;
  sku: string;
  collectionName: string;
  addedAt: string;
}

export const wishlistApi = {
  get: () => api.get<{ items: WishlistItem[] }>('/wishlist'),
  add: (productId: string, sku: string, collectionName?: string) =>
    api.post('/wishlist/items', { productId, sku, collectionName }),
  remove: (sku: string) => api.delete(`/wishlist/items/${sku}`),
  moveToCollection: (sku: string, collectionName: string) =>
    api.patch(`/wishlist/items/${sku}`, { collectionName }),
  renameCollection: (name: string, newName: string) =>
    api.patch(`/wishlist/collections/${encodeURIComponent(name)}`, { name: newName }),
  deleteCollection: (name: string) => api.delete(`/wishlist/collections/${encodeURIComponent(name)}`),
};

export interface CheckoutBreakdown {
  subtotal: number;
  discountTotal: number;
  couponCodes: string[];
  shippingFee: number;
  tax: number;
  total: number;
  currency: string;
}

export const checkoutApi = {
  /** Step 1: price the cart server-side and get a PaymentIntent to confirm. */
  createPaymentIntent: (addressId: string) =>
    api.post<{ clientSecret: string; paymentIntentId: string; breakdown: CheckoutBreakdown; itemCount: number }>(
      '/checkout/payment-intent',
      { addressId },
    ),
};

export const ordersApi = {
  /** Step 2: turn an already-*succeeded* PaymentIntent into an order. Safe to call more than
   * once for the same intent — the backend returns the existing order instead of duplicating it. */
  place: (addressId: string, paymentIntentId: string) =>
    api.post<{ order: Order }>('/orders', { addressId, paymentIntentId }),
  list: (filter: { status?: string; from?: string; to?: string } = {}) =>
    api.get<Order[]>(`/orders${toQueryString(filter)}`),
  getById: (id: string) => api.get<Order>(`/orders/${id}`),
  cancel: (id: string) => api.post<Order>(`/orders/${id}/cancel`),
  requestReturn: (orderId: string, itemId: string, reason: string) =>
    api.post(`/orders/${orderId}/items/${itemId}/return`, { reason }),
};

export const returnsApi = {
  mine: () => api.get<ReturnRequest[]>('/me/returns'),
};

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export const paymentsApi = {
  listMethods: () => api.get<SavedPaymentMethod[]>('/me/payment-methods'),
  removeMethod: (id: string) => api.delete(`/me/payment-methods/${id}`),
};
