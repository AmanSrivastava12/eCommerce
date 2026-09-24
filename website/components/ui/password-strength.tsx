const LEVELS = [
  { label: 'Very weak', color: '#b3492f' },
  { label: 'Weak', color: '#c77b3a' },
  { label: 'Fair', color: '#b5943a' },
  { label: 'Good', color: '#7a9a4a' },
  { label: 'Strong', color: '#4a8a4f' },
] as const;

export function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const score = passwordScore(password);
  const { label, color } = LEVELS[score];
  const checks = [
    { met: password.length >= 8, label: 'At least 8 characters' },
    { met: /[a-z]/.test(password) && /[A-Z]/.test(password), label: 'Upper & lowercase letters' },
    { met: /\d/.test(password), label: 'At least one number' },
    { met: /[^A-Za-z0-9]/.test(password), label: 'At least one symbol' },
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i < score ? color : 'var(--border)' }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color }}>
          {label}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li
            key={c.label}
            className={`flex items-center gap-1 text-[11px] ${
              c.met ? 'text-[var(--discount)]' : 'text-[var(--muted)]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current" strokeWidth={3}>
              {c.met ? <path d="M20 6 9 17l-5-5" /> : <circle cx="12" cy="12" r="9" strokeWidth={1.5} />}
            </svg>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
