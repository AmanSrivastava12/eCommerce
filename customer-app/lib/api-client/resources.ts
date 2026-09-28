import { api, ApiError, endSession } from './client';
import { tokenStorage } from '../auth/token-storage';
import { Address, Cart, Category, EffectivePrice, Me, Order, Product, Review, ReturnRequest } from './types';

// Mirrors website/lib/api-client/resources.ts endpoint-for-endpoint.

type Tokens = { accessToken: string; refreshToken: string };

export const authApi = {
  login: (email: string, password: string) => api.post<Tokens>('/auth/login', { email, password }, { auth: false }),
  register: (data: { email: string; password: string; name: string }) =>
    api.post<Tokens>('/auth/register', { ...data, role: 'customer' }, { auth: false }),
  forgotPassword: (email: string) => api.post<{ message: string }>('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, newPassword }, { auth: false }),
};

export type AddressInput = Omit<Address, '_id'>;

// A token can outlive its user (e.g. after the database is re-seeded): the API then answers
// GET /me with an empty 200 (or a 404). That session is unusable, so end it — the app signs
// out and asks the customer to sign in again instead of erroring on every account screen.
async function getMe() {
  try {
    const me = await api.get<Me | null>('/me');
    if (me) return me;
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err;
  }
  await endSession();
  throw new ApiError(401, { message: 'Your session has expired. Please sign in again.' });
}

export const meApi = {
  get: getMe,
  update: (data: {
    name?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: Me['gender'];
    profilePictureUrl?: string;
  }) => api.patch<Me>('/me', data),
  listAddresses: () => api.get<Address[]>('/me/addresses'),
  addAddress: (data: AddressInput) => api.post<Address[]>('/me/addresses', data),
  updateAddress: (id: string, data: Partial<AddressInput>) => api.patch<Address[]>(`/me/addresses/${id}`, data),
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
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== false)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const productsApi = {
  browse: (query: ProductBrowseQuery = {}) => api.get<Product[]>(`/products${toQueryString({ ...query })}`, { auth: false }),
  getById: (id: string) => api.get<{ product: Product; price: EffectivePrice }>(`/products/${id}`, { auth: false }),
  serviceability: (id: string, pincode: string) =>
    api.get<{ serviceable: boolean; estimatedDeliveryDays: number | null }>(
      `/products/${id}/serviceability?pincode=${encodeURIComponent(pincode)}`,
      { auth: false },
    ),
  reviews: (id: string, sku?: string) =>
    api.get<Review[]>(`/products/${id}/reviews${sku ? `?sku=${encodeURIComponent(sku)}` : ''}`, { auth: false }),
  submitReview: (
    id: string,
    data: { sku: string; rating: number; deliveryRating?: number; packagingRating?: number; title?: string; comment: string },
  ) => api.post<Review>(`/products/${id}/reviews`, data),
};

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories', { auth: false }),
};

// Cart routes are @Public on the backend (guests can use the cart too), but a signed-in
// user's request still needs its Authorization header so the server can tell them apart
// from a guest — hence `auth: isLoggedIn` rather than `auth: false`.
async function guestParams(isLoggedIn: boolean) {
  return isLoggedIn ? {} : { guestSessionId: await tokenStorage.guestSessionId() };
}

export const cartApi = {
  get: async (isLoggedIn: boolean) =>
    api.get<Cart>(`/cart${toQueryString(await guestParams(isLoggedIn))}`, { auth: isLoggedIn }),
  addItem: async (productId: string, sku: string, quantity: number, isLoggedIn: boolean) =>
    api.post<Cart>('/cart/items', { productId, sku, quantity, ...(await guestParams(isLoggedIn)) }, { auth: isLoggedIn }),
  updateItem: async (sku: string, quantity: number, isLoggedIn: boolean) =>
    api.patch<Cart>(`/cart/items/${encodeURIComponent(sku)}`, { quantity, ...(await guestParams(isLoggedIn)) }, { auth: isLoggedIn }),
  removeItem: async (sku: string, isLoggedIn: boolean) =>
    api.delete<Cart>(`/cart/items/${encodeURIComponent(sku)}${toQueryString(await guestParams(isLoggedIn))}`, {
      auth: isLoggedIn,
    }),
  applyCoupon: async (code: string, isLoggedIn: boolean) =>
    api.post<Cart>('/cart/coupon', { code, ...(await guestParams(isLoggedIn)) }, { auth: isLoggedIn }),
  removeCoupon: async (code: string, isLoggedIn: boolean) =>
    api.delete<Cart>(`/cart/coupon/${encodeURIComponent(code)}${toQueryString(await guestParams(isLoggedIn))}`, {
      auth: isLoggedIn,
    }),
  merge: async () => api.post<Cart>('/cart/merge', { guestSessionId: await tokenStorage.guestSessionId() }),
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
  remove: (sku: string) => api.delete(`/wishlist/items/${encodeURIComponent(sku)}`),
  moveToCollection: (sku: string, collectionName: string) =>
    api.patch(`/wishlist/items/${encodeURIComponent(sku)}`, { collectionName }),
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
  list: (filter: { status?: string; from?: string; to?: string } = {}) => api.get<Order[]>(`/orders${toQueryString(filter)}`),
  getById: (id: string) => api.get<Order>(`/orders/${id}`),
  cancel: (id: string) => api.post<Order>(`/orders/${id}/cancel`),
  requestReturn: (orderId: string, itemId: string, reason: string) =>
    api.post(`/orders/${orderId}/items/${itemId}/return`, { reason }),
};

export const returnsApi = {
  mine: () => api.get<ReturnRequest[]>('/me/returns'),
};
