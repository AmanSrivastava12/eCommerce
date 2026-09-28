import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Privacy Policy | Shopwave' };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" subtitle="Last updated 1 January 2026">
      <InfoSection heading="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Account details you provide — name, email, phone number, delivery addresses</li>
          <li>Order and browsing history, to personalise recommendations</li>
          <li>Payment metadata (never full card numbers), via our payment partners</li>
          <li>Device and usage data such as IP address and app version, for security and analytics</li>
        </ul>
      </InfoSection>
      <InfoSection heading="How we use your data">
        <p>
          We use your data to process orders, provide customer support, personalise your shopping
          experience, prevent fraud, and — where you&apos;ve opted in — send you offers and updates.
          We do not sell your personal data to third parties.
        </p>
      </InfoSection>
      <InfoSection heading="Sharing with sellers and partners">
        <p>
          When you place an order, we share the minimum information needed to fulfil it — your name,
          delivery address, and phone number — with the relevant seller and logistics partner. Sellers
          are contractually required to use this data solely for order fulfilment.
        </p>
      </InfoSection>
      <InfoSection heading="Cookies">
        <p>
          We use cookies and similar technologies to keep you signed in, remember your cart, and
          understand how the site is used so we can improve it. You can control cookie preferences
          through your browser settings.
        </p>
      </InfoSection>
      <InfoSection heading="Your rights">
        <p>
          You can access, correct, or delete your personal data at any time from Account Settings, or
          by writing to privacy@shopwave.example. You may also opt out of marketing communications from
          the Notifications tab in your account.
        </p>
      </InfoSection>
      <InfoSection heading="Data retention">
        <p>
          We retain order and transaction records for as long as required by applicable tax and
          consumer protection law, and delete account data within 90 days of a verified deletion
          request, except where retention is legally required.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
