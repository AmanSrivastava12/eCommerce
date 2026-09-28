// Mirrors the website's three-color system (website/app/globals.css): off-white base with
// hairline borders, cream as a sparing accent, brown for text, links and actions.
export const colors = {
  background: '#f9f5ee',
  surface: '#fbf8f2',
  card: '#ffffff',
  cream: '#f1e0bd',
  foreground: '#3a2b1e',
  muted: '#8a7460',
  border: '#e6dac2',
  brand: '#6f4a2f',
  brandDark: '#55361f',
  brandLight: '#a9754b',
  brandForeground: '#fff8ef',
  discount: '#8a5a2b',
  danger: '#b3492f',
  dangerSoft: '#f6e1da',
  success: '#4f7a3a',
  successSoft: '#e4eed9',
  warning: '#a9754b',
  star: '#a9754b',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 };

export const font = {
  title: { fontSize: 20, fontWeight: '700' as const, color: colors.foreground },
  heading: { fontSize: 16, fontWeight: '600' as const, color: colors.foreground },
  body: { fontSize: 14, color: colors.foreground },
  label: { fontSize: 13, fontWeight: '500' as const, color: colors.foreground },
  caption: { fontSize: 12, color: colors.muted },
};

// Matches the website, which prices everything in US dollars.
export function formatPrice(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  const text = abs.toLocaleString('en-US', { minimumFractionDigits: abs % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '−' : ''}$${text}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Shared stack/tab header styling so every navigator picks up the brand look.
export const headerOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.brandDark,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 18, color: colors.brandDark },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};
