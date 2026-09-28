import { InfoPage, InfoSection } from '@/components/layout/info-page';

export const metadata = { title: 'Careers | Shopwave' };

const OPENINGS = [
  { title: 'Senior Backend Engineer (Node.js)', location: 'Bengaluru', team: 'Platform Engineering' },
  { title: 'React Native Developer', location: 'Bengaluru / Remote', team: 'Seller Experience' },
  { title: 'Product Manager, Checkout', location: 'Bengaluru', team: 'Growth' },
  { title: 'Warehouse Operations Lead', location: 'Pune', team: 'Supply Chain' },
  { title: 'Customer Support Associate', location: 'Hyderabad', team: 'Customer Experience' },
  { title: 'Data Analyst, Pricing', location: 'Remote', team: 'Analytics' },
];

export default function CareersPage() {
  return (
    <InfoPage title="Careers at Shopwave" subtitle="Help us build the future of shopping in India">
      <InfoSection heading="Why Shopwave">
        <p>
          We&apos;re a small team solving big logistics, technology, and trust problems at scale.
          You&apos;ll ship things that millions of people use, work with people who care deeply about
          the details, and have real ownership over what you build.
        </p>
      </InfoSection>
      <InfoSection heading="What we offer">
        <ul className="list-disc space-y-1 pl-5">
          <li>Competitive salary with performance-linked ESOPs</li>
          <li>Comprehensive health insurance for you and your family</li>
          <li>Flexible work-from-home policy and unlimited paid leave</li>
          <li>Annual learning stipend for courses, books, and conferences</li>
        </ul>
      </InfoSection>
      <InfoSection heading="Open positions">
        <div className="divide-y divide-[var(--border)]">
          {OPENINGS.map((job) => (
            <div key={job.title} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div>
                <p className="font-medium text-[var(--foreground)]">{job.title}</p>
                <p className="text-xs text-[var(--muted)]">{job.team}</p>
              </div>
              <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted)]">
                {job.location}
              </span>
            </div>
          ))}
        </div>
        <p className="pt-2">
          Don&apos;t see a role that fits? Send your resume to careers@shopwave.example — we&apos;re
          always looking for great people.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
