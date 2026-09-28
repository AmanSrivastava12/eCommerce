import { api } from './client';
import {
  Address,
  AddressInput,
  BankAccount,
  Category,
  Coupon,
  SellerFinance,
  SellerOrderDetail,
  SellerOrderSummary, InventoryItem, Me, OrderItem, Product, ReturnRequest, Review, Sale } from './types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; refreshToken: string }>('/auth/login', { email, password }, { auth: false }),
  register: (data: { name: string; email: string; password: string; businessName: string }) =>
    api.post<{ accessToken: string; refreshToken: string }>(
      '/auth/register',
      { ...data, role: 'seller' },
      { auth: false },
    ),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (token: string, newPassword: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, newPassword }, { auth: false }),
};

export const meApi = {
  get: () => api.get<Me>('/me'),
  update: (data: { name?: string; phone?: string; dateOfBirth?: string; gender?: Me['gender'] }) =>
    api.patch<Me>('/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>('/me/password', { currentPassword, newPassword }),
};

export const addressesApi = {
  list: () => api.get<Address[]>('/me/addresses'),
  create: (data: AddressInput) => api.post<Address[]>('/me/addresses', data),
  update: (id: string, data: Partial<AddressInput>) => api.patch<Address[]>(`/me/addresses/${id}`, data),
  remove: (id: string) => api.delete<Address[]>(`/me/addresses/${id}`),
};

export const sellerProductsApi = {
  list: () => api.get<Product[]>('/seller/products'),
  create: (data: unknown) => api.post<Product>('/seller/products', data),
  update: (id: string, data: unknown) => api.patch<Product>(`/seller/products/${id}`, data),
  remove: (id: string) => api.delete(`/seller/products/${id}`),
};

export const uploadsApi = {
  presignProductImage: (contentType: string) =>
    api.post<{ url: string; fields: Record<string, string>; publicUrl: string }>('/seller/uploads/product-image', {
      contentType,
    }),
};

export const categoriesApi = {
  list: () => api.get<Category[]>('/categories', { auth: false }),
};

export const inventoryApi = {
  list: () => api.get<InventoryItem[]>('/seller/inventory'),
  update: (sku: string, data: { quantity?: number; lowStockThreshold?: number }) =>
    api.patch<InventoryItem>(`/seller/inventory/${sku}`, data),
};

export const sellerOrdersApi = {
  groups: (filter: { status?: string } = {}) =>
    api.get<SellerOrderSummary[]>(`/seller/order-groups${filter.status ? `?status=${filter.status}` : ''}`),
  get: (orderId: string) => api.get<SellerOrderDetail>(`/seller/orders/${orderId}`),
  list: (filter: { status?: string } = {}) =>
    api.get<OrderItem[]>(`/seller/orders${filter.status ? `?status=${filter.status}` : ''}`),
  fulfill: (orderId: string, itemId: string, status: 'shipped' | 'delivered') =>
    api.post(`/seller/orders/${orderId}/items/${itemId}/fulfill`, { status }),
};

export const sellerReturnsApi = {
  list: () => api.get<ReturnRequest[]>('/seller/returns'),
  update: (id: string, status: 'approved' | 'rejected' | 'completed') =>
    api.patch<ReturnRequest>(`/seller/returns/${id}`, { status }),
};

export const financeApi = {
  get: () => api.get<SellerFinance>('/seller/finance'),
  withdraw: (amount?: number) => api.post('/seller/finance/payouts', amount ? { amount } : {}),
  setBankAccount: (data: { accountHolderName: string; bankName: string; accountNumber: string; ifsc: string }) =>
    api.put<BankAccount>('/seller/finance/bank-account', data),
};

export const sellerReviewsApi = {
  list: () => api.get<Review[]>('/seller/reviews'),
};

export const salesApi = {
  list: () => api.get<Sale[]>('/sales', { auth: false }),
  create: (data: { name: string; slug: string; startAt: string; endAt: string }) =>
    api.post<Sale>('/admin/sales', data),
  update: (id: string, data: Partial<Sale>) => api.patch<Sale>(`/admin/sales/${id}`, data),
};

export const couponsApi = {
  list: () => api.get<Coupon[]>('/admin/coupons'),
  create: (data: unknown) => api.post<Coupon>('/admin/coupons', data),
  update: (id: string, data: unknown) => api.patch<Coupon>(`/admin/coupons/${id}`, data),
};

export const adminApi = {
  listSellers: (status?: string) => api.get<Me[]>(`/admin/sellers${status ? `?status=${status}` : ''}`),
  verifySeller: (id: string, status: 'verified' | 'rejected') =>
    api.patch(`/admin/sellers/${id}/verify`, { status }),
  listUsers: (role?: string) => api.get<Me[]>(`/admin/users${role ? `?role=${role}` : ''}`),
  deactivateUser: (id: string) => api.patch(`/admin/users/${id}/deactivate`),
  listReturns: () => api.get<ReturnRequest[]>('/admin/returns'),
  updateReturn: (id: string, status: 'approved' | 'rejected' | 'completed') =>
    api.patch<ReturnRequest>(`/admin/returns/${id}`, { status }),
};
