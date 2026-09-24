import { Product } from './schemas/product.schema';
import { Sale } from '../sales/schemas/sale.schema';

export function computeEffectivePrice(
  pricing: Product['pricing'],
  activeSale: Pick<Sale, 'startAt' | 'endAt'> | null,
) {
  const now = new Date();
  const saleIsActive =
    activeSale && now >= new Date(activeSale.startAt) && now <= new Date(activeSale.endAt);

  if (saleIsActive && pricing.salePrice != null) {
    return { effectivePrice: pricing.salePrice, strikethroughPrice: pricing.basePrice, onSale: true };
  }

  let effectivePrice = pricing.basePrice;
  if (pricing.discountPercent) {
    effectivePrice = pricing.basePrice * (1 - pricing.discountPercent / 100);
  } else if (pricing.discountAmount) {
    effectivePrice = Math.max(0, pricing.basePrice - pricing.discountAmount);
  }
  const discounted = effectivePrice !== pricing.basePrice;
  return {
    effectivePrice: Number(effectivePrice.toFixed(2)),
    strikethroughPrice: discounted ? pricing.basePrice : null,
    onSale: false,
  };
}

export function checkServiceability(
  fulfillment: Product['fulfillment'],
  pincode: string,
): { serviceable: boolean; estimatedDeliveryDays: number | null } {
  if (!fulfillment.serviceablePincodes || fulfillment.serviceablePincodes.length === 0) {
    return { serviceable: true, estimatedDeliveryDays: fulfillment.estimatedDeliveryDays };
  }
  const serviceable = fulfillment.serviceablePincodes.includes(pincode);
  return {
    serviceable,
    estimatedDeliveryDays: serviceable ? fulfillment.estimatedDeliveryDays : null,
  };
}
