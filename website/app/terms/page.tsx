import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Terms of Use | Shopwave' };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Use" subtitle="Last updated 1 January 2026">
      <InfoSection heading="Acceptance of terms">
        <p>
          By creating an account or placing an order on Shopwave, you agree to these Terms of Use, our
          Privacy Policy, and our Return Policy. If you do not agree, please do not use the platform.
        </p>
      </InfoSection>
      <InfoSection heading="Account responsibilities">
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for
          all activity that occurs under your account. Notify us immediately at
          support@shopwave.example if you suspect unauthorised access.
        </p>
      </InfoSection>
      <InfoSection heading="Orders and pricing">
        <p>
          All prices are listed in US Dollars (USD) and are inclusive of applicable taxes unless
          stated otherwise. We reserve the right to cancel any order in cases of pricing errors,
          suspected fraud, or unavailability of stock, in which case a full refund will be issued.
        </p>
      </InfoSection>
      <InfoSection heading="Marketplace model">
        <p>
          Shopwave operates as a marketplace connecting buyers with independent sellers. Product
          listings, descriptions, and fulfilment for seller-listed items are the responsibility of the
          respective seller; Shopwave facilitates the transaction and provides buyer protection as
          described in our Return Policy.
        </p>
      </InfoSection>
      <InfoSection heading="Prohibited use">
        <p>
          You agree not to misuse the platform — including submitting false reviews, attempting to
          circumvent security measures, reselling purchased goods in violation of seller terms, or
          using automated tools to scrape or place bulk orders without authorisation.
        </p>
      </InfoSection>
      <InfoSection heading="Limitation of liability">
        <p>
          Shopwave is not liable for indirect or consequential damages arising from use of the
          platform, to the maximum extent permitted by applicable law. Nothing in these terms limits
          liability that cannot be excluded under Indian consumer protection law.
        </p>
      </InfoSection>
      <InfoSection heading="Changes to these terms">
        <p>
          We may update these Terms of Use from time to time. Continued use of Shopwave after changes
          are posted constitutes acceptance of the revised terms.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
