import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Payments | Shopwave' };

export default function PaymentsPage() {
  return (
    <InfoPage title="Payment Options" subtitle="Safe, secure, and flexible ways to pay">
      <InfoSection heading="Accepted payment methods">
        <ul className="list-disc space-y-1 pl-5">
          <li>Credit & debit cards (Visa, Mastercard, American Express, Discover)</li>
          <li>Shopwave Wallet — instant refunds credited here can be reused on any order</li>
          <li>Cash on Delivery (available on eligible orders under $5,000)</li>
          <li>EMI — No-cost EMI available on select cards for orders above $300</li>
        </ul>
      </InfoSection>
      <InfoSection heading="Is it safe to save my card?">
        <p>
          Yes. Shopwave never stores your full card number on our servers. Card details are tokenised
          and processed through PCI-DSS compliant payment partners, so your data stays encrypted at
          every step of the transaction.
        </p>
      </InfoSection>
      <InfoSection heading="Payment failed but amount deducted?">
        <p>
          If an amount is debited from your account but the order doesn&apos;t show as confirmed,
          don&apos;t worry — failed transactions are automatically reversed to your original payment
          method within 5–7 business days. You can track this from Orders → Payment Status.
        </p>
      </InfoSection>
      <InfoSection heading="Gift cards & Shopwave Wallet">
        <p>
          Gift cards can be redeemed at checkout and combined with one other payment method. Wallet
          balance from refunds or cashback is applied automatically before any other payment method is
          charged.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
