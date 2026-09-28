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

export type AddressInput = Omit<Address, '_id'>;

export interface Me {
  _id: string;
  email: string;
  name: string;
  role: 'customer' | 'seller' | 'admin';
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  profilePictureUrl?: string;
  addresses?: Address[];
  createdAt?: string;
  sellerProfile?: {
    businessName: string;
    verificationStatus: 'pending' | 'verified' | 'rejected';
    payoutDetails?: BankAccount;
    ratingSummary: {
      overall: { average: number; count: number };
      productQuality: { average: number; count: number };
      deliveryTimeliness: { average: number; count: number };
      packaging: { average: number; count: number };
    };
  };
}

export interface Product {
  _id: string;
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
  variants: { sku: string; attributes: Record<string, string>; priceOverride: number | null; images: string[] }[];
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
  ratingSummary: { average: number; count: number };
  status: 'draft' | 'active' | 'inactive';
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  imageUrl?: string | null;
}

export interface InventoryItem {
  sku: string;
  quantity: number;
  reserved_qty: number;
  low_stock_threshold: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  fulfillment_status: 'pending' | 'shipped' | 'delivered';
  order?: { id: string; status: string; created_at: string; total: number };
}

export interface ReturnRequest {
  id: string;
  order_item_id: string;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'completed';
  created_at?: string;
}

export interface Review {
  _id: string;
  productId: string;
  sku: string;
  rating: number;
  deliveryRating?: number | null;
  packagingRating?: number | null;
  title?: string | null;
  comment: string;
  images?: string[];
  createdAt?: string;
}

export interface Sale {
  _id: string;
  name: string;
  slug: string;
  startAt: string;
  endAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  minCartValue?: number | null;
  maxDiscountAmount?: number | null;
  validFrom: string;
  validTo: string;
  usageLimitPerUser?: number | null;
  active: boolean;
}

export type Settlement =
  | 'awaiting_payment'
  | 'cancelled'
  | 'in_transit'
  | 'return_window'
  | 'return_requested'
  | 'refunded'
  | 'settled';

export interface SellerOrderLine {
  id: string;
  productId: string;
  sku: string;
  title: string;
  image: string | null;
  quantity: number;
  unitPrice: number;
  mrp: number;
  productDiscount: number;
  subtotal: number;
  fulfillmentStatus: 'pending' | 'shipped' | 'delivered';
  shippedAt: string | null;
  deliveredAt: string | null;
  returnWindowDays: number;
  returnWindowEndsAt: string | null;
  settlement: Settlement;
  returnRequest: {
    id: string;
    reason: string;
    status: ReturnRequest['status'];
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface SellerOrderSummary {
  id: string;
  status: 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  currency: string;
  itemCount: number;
  sellerSubtotal: number;
  hasReturn: boolean;
  returnStatus: ReturnRequest['status'] | null;
  items: SellerOrderLine[];
}

export interface SellerOrderDetail {
  id: string;
  status: SellerOrderSummary['status'];
  createdAt: string;
  updatedAt: string;
  cancellableUntil: string | null;
  currency: string;
  customer: { name: string };
  shippingAddress: Partial<Address> & Record<string, unknown>;
  shippingPhone: string;
  items: SellerOrderLine[];
  breakdown: {
    mrpTotal: number;
    productDiscount: number;
    sellerSubtotal: number;
    couponCodes: string[];
    couponDiscount: number;
    shipping: number;
    tax: number;
    customerPaid: number;
    refunded: number;
    sellerEarnings: number;
  };
  orderTotals: { subtotal: number; discount: number; shipping: number; tax: number; total: number; otherSellersItems: boolean };
  payment: {
    status: 'succeeded' | 'requires_payment' | 'failed' | 'cancelled';
    method: string;
    amount: number;
    currency: string;
    reference: string | null;
    paidAt: string | null;
  };
}

export interface Transaction {
  id: string;
  type: 'sale' | 'refund' | 'payout';
  direction: 'in' | 'out';
  amount: number;
  date: string;
  status: string;
  description: string;
  orderId?: string;
  sku?: string;
  productId?: string;
  image?: string | null;
  availableOn?: string | null;
  reference?: string;
}

export interface BankAccount {
  bankAccountRef: string;
  accountHolderName?: string;
  bankName?: string;
  ifsc?: string;
  accountLast4?: string;
}

export interface SellerFinance {
  wallet: {
    inProcess: number;
    onHold: number;
    available: number;
    lifetimeEarnings: number;
    totalRefunded: number;
    totalPaidOut: number;
  };
  bankAccount: BankAccount | null;
  transactions: Transaction[];
}
