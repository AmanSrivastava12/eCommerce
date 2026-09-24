import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'About Us | Shopwave' };

export default function AboutUsPage() {
  return (
    <InfoPage title="About Shopwave" subtitle="India's growing destination for online shopping">
      <InfoSection heading="Who we are">
        <p>
          Shopwave started in 2019 with a simple idea: buying things online should feel as easy as
          walking into your favourite neighbourhood store, but with far more choice. What began as a
          small electronics marketplace has grown into a full-fledged shopping destination spanning
          electronics, fashion, home & kitchen, books, and everyday essentials.
        </p>
        <p>
          Today, Shopwave connects thousands of sellers with customers across the country, moving
          millions of packages a year through our own fulfilment network.
        </p>
      </InfoSection>
      <InfoSection heading="Our mission">
        <p>
          We exist to make commerce easier for everyone — buyers looking for the best possible
          selection and price, and sellers looking for a reliable platform to grow their business.
          Every feature we build, from one-click checkout to next-day delivery, is in service of that
          mission.
        </p>
      </InfoSection>
      <InfoSection heading="By the numbers">
        <ul className="list-disc space-y-1 pl-5">
          <li>10,000+ sellers onboarded across 28 states</li>
          <li>2 million+ products listed across 20+ categories</li>
          <li>Same-day and next-day delivery available in 500+ cities</li>
          <li>24x7 customer support in English and Hindi</li>
        </ul>
      </InfoSection>
      <InfoSection heading="Our values">
        <p>
          <span className="font-medium text-[var(--foreground)]">Customer first</span> — every decision
          starts with what&apos;s best for the person placing the order.
        </p>
        <p>
          <span className="font-medium text-[var(--foreground)]">Seller success</span> — we grow only
          when the businesses on our platform grow with us.
        </p>
        <p>
          <span className="font-medium text-[var(--foreground)]">Trust by default</span> — genuine
          products, transparent pricing, and honest reviews, always.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
