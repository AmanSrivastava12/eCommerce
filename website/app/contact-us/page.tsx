import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Contact Us | Shopwave' };

export default function ContactUsPage() {
  return (
    <InfoPage title="Contact Us" subtitle="We're here to help, seven days a week">
      <InfoSection heading="Customer support">
        <p>For order issues, returns, refunds, or account questions, our support team typically responds within 24 hours.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Email: support@shopwave.example</li>
          <li>Phone: 1800-123-4567 (toll-free, 8 AM – 11 PM, all days)</li>
          <li>Live chat: available from the Help icon once you&apos;re signed in</li>
        </ul>
      </InfoSection>
      <InfoSection heading="Seller support">
        <p>Already selling on Shopwave, or want to start? Reach our seller success team.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Email: sellers@shopwave.example</li>
          <li>Phone: 1800-987-6543 (10 AM – 7 PM, Mon–Sat)</li>
        </ul>
      </InfoSection>
      <InfoSection heading="Corporate office">
        <p>
          Shopwave Technologies Pvt. Ltd.
          <br />
          4th Floor, Prestige Tech Park, Outer Ring Road,
          <br />
          Bengaluru, Karnataka 560103, India
        </p>
      </InfoSection>
      <InfoSection heading="Press & media">
        <p>For media inquiries and press kits, write to press@shopwave.example.</p>
      </InfoSection>
    </InfoPage>
  );
}
