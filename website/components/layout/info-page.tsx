import type { ReactNode } from 'react';

export function InfoPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      <div className="space-y-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-8">
        {children}
      </div>
    </div>
  );
}

export function InfoSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-[var(--foreground)]">{heading}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-[var(--muted)]">{children}</div>
    </section>
  );
}
