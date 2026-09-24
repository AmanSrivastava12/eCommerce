import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Shipping Policy | Shopwave' };

export default function ShippingPage() {
  return (
    <InfoPage title="Shipping Information" subtitle="How we get your order to your door">
      <InfoSection heading="Delivery timelines">
        <p>
          Delivery estimates are shown on every product page and again at checkout, based on your
          pincode and the seller&apos;s dispatch location. Most orders arrive within 2–7 business days;
          items marked &quot;Assured&quot; on eligible pincodes can arrive as fast as next-day.
        </p>
      </InfoSection>
      <InfoSection heading="Shipping charges">
        <ul className="list-disc space-y-1 pl-5">
          <li>Free delivery on orders above $50</li>
          <li>A flat $4.99 delivery fee applies to orders below $50</li>
          <li>Shopwave Plus members get free delivery on every order, with no minimum</li>
        </ul>
      </InfoSection>
      <InfoSection heading="Order tracking">
        <p>
          Once your order is shipped, you&apos;ll receive a tracking link by email and SMS. You can
          also track any order in real time from Your Orders → Track Package, which shows live status
          updates from dispatch to out-for-delivery.
        </p>
      </InfoSection>
      <InfoSection heading="Serviceable areas">
        <p>
          We currently deliver to over 19,000 pincodes across India. Some large or fragile items
          (furniture, large appliances) may have a smaller serviceable area — this is always shown on
          the product page before you order.
        </p>
      </InfoSection>
      <InfoSection heading="Delayed or missing packages">
        <p>
          If your package hasn&apos;t arrived by the estimated date, please wait 48 hours past the
          estimate (couriers occasionally run late) before reaching out to support — after that we&apos;ll
          investigate immediately and either expedite delivery or issue a full refund.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
