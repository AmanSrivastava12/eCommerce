export interface RatingSummary {
  average: number;
  count: number;
}

export interface ProductVariant {
  sku: string;
  attributes: Record<string, string>;
  priceOverride: number | null;
  images: string[];
  /** Units currently available to sell (stock minus reserved). `null` when the SKU has no inventory record. */
  availableQty?: number | null;
}

export interface Product {
  _id: string;
  sellerId: string;
  title: string;
  categoryId: string;
  description: {
    short: string;
    sections: { heading: string; content: string }[];
    specifications: { group: string; items: { key: string; value: string }[] }[];
  };
  faqs: { question: string; answer: string }[];
  images: { main: string; gallery: string[] };
  pricing: {
    basePrice: number;
    currency: string;
    discountPercent: number | null;
    discountAmount: number | null;
    activeSaleId: string | null;
    salePrice: number | null;
  };
  variants: ProductVariant[];
  fulfillment: {
    warranty: string | null;
    isAssured: boolean;
    returnWindowDays: number | null;
    replacementWindowDays?: number | null;
    shippingFee?: number;
    shipsFromPincode: string;
    serviceablePincodes: string[] | null;
    estimatedDeliveryDays: number;
  };
  ratingSummary: RatingSummary;
  status: 'draft' | 'active' | 'inactive';
}

export interface EffectivePrice {
  effectivePrice: number;
  strikethroughPrice: number | null;
  onSale: boolean;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
}

export interface CartItem {
  productId: string;
  sku: string;
  quantity: number;
  priceAtAdd: number;
}

export interface AppliedCoupon {
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  discountApplied: number;
}

export interface Cart {
  _id: string;
  items: CartItem[];
  appliedCoupons: AppliedCoupon[];
}

export interface Address {
  _id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

export interface OrderShippingAddress {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  sku: string;
  seller_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  fulfillment_status: 'pending' | 'shipped' | 'delivered';
}

export interface Order {
  id: string;
  status: 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  cancellable_until: string | null;
  subtotal: number;
  discount_total: number;
  coupon_codes: string[];
  tax: number;
  shipping_fee: number;
  total: number;
  currency: string;
  shipping_address: OrderShippingAddress;
  shipping_phone: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface ReturnRequest {
  id: string;
  order_item_id: string;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

export interface Review {
  _id: string;
  productId: string;
  sku: string;
  userId: string;
  rating: number;
  deliveryRating: number | null;
  packagingRating: number | null;
  title: string | null;
  comment: string;
  images: string[];
  createdAt: string;
}

export interface Me {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profilePictureUrl?: string;
  role: 'customer' | 'seller' | 'admin';
  addresses: Address[];
}
