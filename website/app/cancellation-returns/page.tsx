import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Cancellation & Returns | Shopwave' };

export default function CancellationReturnsPage() {
  return (
    <InfoPage title="Cancellation & Returns" subtitle="Change of mind? We make it easy">
      <InfoSection heading="Cancelling an order">
        <p>
          You can cancel any order for free as long as it hasn&apos;t been shipped yet — just go to
          Your Orders and select Cancel Order. Once an item ships, cancellation is no longer possible,
          but you can still request a return after it&apos;s delivered.
        </p>
      </InfoSection>
      <InfoSection heading="Return window">
        <p>
          Most items can be returned within 7–15 days of delivery, depending on the category (shown on
          the product page under &quot;Returns&quot;). Perishables, innerwear, and made-to-order
          products are generally not eligible for return unless damaged or defective on arrival.
        </p>
      </InfoSection>
      <InfoSection heading="How returns work">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Go to Your Orders and select &quot;Request return&quot; on the item.</li>
          <li>Tell us the reason — wrong item, damaged, doesn&apos;t fit, or changed your mind.</li>
          <li>A pickup is scheduled at your address within 2–4 days, or a self-ship label is issued.</li>
          <li>Once the item passes a quality check, your refund is initiated.</li>
        </ol>
      </InfoSection>
      <InfoSection heading="Refund timelines">
        <ul className="list-disc space-y-1 pl-5">
          <li>Shopwave Wallet: instant, as soon as the return is approved</li>
          <li>Credit / debit card: 5–7 business days</li>
          <li>Cash on Delivery orders: refunded to your bank account after verification</li>
        </ul>
      </InfoSection>
      <InfoSection heading="Exchanges">
        <p>
          For sizing or colour issues on fashion items, an exchange is often faster than a return —
          select &quot;Exchange&quot; instead of &quot;Return&quot; where available, and we&apos;ll ship
          the replacement as soon as the original is picked up.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
