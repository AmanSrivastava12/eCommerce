import { Product } from '@/lib/api-client/types';

export function SpecTable({ specifications }: { specifications: Product['description']['specifications'] }) {
  if (specifications.length === 0) return null;
  return (
    <div className="space-y-4">
      {specifications.map((group) => (
        <div key={group.group}>
          <h3 className="mb-2 text-sm font-medium text-[var(--foreground)]">{group.group}</h3>
          <dl className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] text-sm">
            {group.items.map((item) => (
              <div key={item.key} className="grid grid-cols-2 gap-2 p-2">
                <dt className="text-[var(--muted)]">{item.key}</dt>
                <dd className="text-[var(--foreground)]">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
