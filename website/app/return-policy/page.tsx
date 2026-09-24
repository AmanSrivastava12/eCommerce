import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Return Policy | Shopwave' };

export default function ReturnPolicyPage() {
  return (
    <InfoPage title="Return Policy" subtitle="Effective from 1 January 2026">
      <InfoSection heading="Overview">
        <p>
          Shopwave wants you to be completely satisfied with your purchase. This policy explains when
          and how you can return an item, and it applies in addition to any category-specific return
          window shown on a product page.
        </p>
      </InfoSection>
      <InfoSection heading="Eligibility">
        <ul className="list-disc space-y-1 pl-5">
          <li>Item must be unused, unwashed, and in its original packaging with tags intact</li>
          <li>All original accessories, freebies, and invoices must be included</li>
          <li>Return must be initiated within the window shown on the product page (typically 7–15 days)</li>
        </ul>
      </InfoSection>
      <InfoSection heading="Non-returnable categories">
        <p>
          For hygiene and safety reasons, the following are not eligible for return unless received
          damaged or defective: innerwear and lingerie, personal care and cosmetics, perishable goods,
          made-to-order or personalised items, and digital gift cards.
        </p>
      </InfoSection>
      <InfoSection heading="Quality check">
        <p>
          Returned items go through a quality check at our fulfilment centre before a refund is
          released. If an item fails this check (e.g. signs of use, missing parts), it will be shipped
          back to you and the return will not be processed.
        </p>
      </InfoSection>
      <InfoSection heading="Seller-fulfilled items">
        <p>
          For items sold and shipped directly by a third-party seller, return eligibility and pickup
          arrangements are coordinated between you and the seller, with Shopwave stepping in to
          mediate if a resolution isn&apos;t reached within 5 business days.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
