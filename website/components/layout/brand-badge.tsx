import Image from 'next/image';
import Link from 'next/link';

export function BrandBadge() {
  return (
    <Link
      href="/"
      aria-label="Shopwave home"
      className="fixed bottom-4 left-4 z-50 flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl shadow-lg ring-1 ring-black/10 transition hover:scale-105"
    >
      <Image src="/icon.svg" alt="Shopwave" width={40} height={40} priority />
    </Link>
  );
}
