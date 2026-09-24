import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Security | Shopwave' };

export default function SecurityPage() {
  return (
    <InfoPage title="Security at Shopwave" subtitle="How we keep your account and payments safe">
      <InfoSection heading="Data encryption">
        <p>
          All traffic to and from Shopwave is encrypted in transit using TLS 1.2+. Sensitive data,
          including payment tokens, is encrypted at rest using industry-standard AES-256 encryption.
        </p>
      </InfoSection>
      <InfoSection heading="Payment security">
        <p>
          We never store your full card number or CVV on our servers. All card transactions are
          processed through PCI-DSS Level 1 certified payment partners, and every card payment is
          protected by bank-level OTP verification.
        </p>
      </InfoSection>
      <InfoSection heading="Account protection">
        <ul className="list-disc space-y-1 pl-5">
          <li>Two-factor authentication available via SMS or authenticator app</li>
          <li>Login alerts sent by email for sign-ins from a new device</li>
          <li>Automatic session expiry after periods of inactivity</li>
          <li>One-tap option to log out of all devices from Account Settings</li>
        </ul>
      </InfoSection>
      <InfoSection heading="Spotting fraud">
        <p>
          Shopwave will never call or message you asking for your OTP, password, or full card number.
          If you receive such a request claiming to be from Shopwave, please do not share any details
          and report it to security@shopwave.example immediately.
        </p>
      </InfoSection>
      <InfoSection heading="Responsible disclosure">
        <p>
          Found a security vulnerability? We welcome reports from independent researchers. Please email
          details to security@shopwave.example — we investigate every report and acknowledge valid
          findings within 5 business days.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
