'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useCartStore } from '@/lib/stores/cart-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useToastStore } from '@/lib/stores/toast-store';
import { useConfirm } from '@/lib/stores/confirm-store';
import { useWishlist } from '@/lib/hooks/use-wishlist';
import { SearchDropdown } from './search-dropdown';
import { CategoryNav } from './category-nav';

const ACCOUNT_LINKS = [
  { href: '/account', label: 'My Profile' },
  { href: '/orders', label: 'Orders' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/addresses', label: 'Saved Addresses' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const itemCount = useCartStore((s) => s.itemCount());
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const logout = useAuthStore((s) => s.logout);
  const push = useToastStore((s) => s.push);
  const confirmDialog = useConfirm();
  const { count: wishlistCount } = useWishlist();
  const [accountOpen, setAccountOpen] = useState(false);

  const isWishlistActive = pathname === '/account/wishlist';
  const isCartActive = pathname === '/cart';
  const isAccountActive = ACCOUNT_LINKS.some((l) => pathname === l.href) || pathname.startsWith('/orders/');

  const handleLogout = async () => {
    const confirmed = await confirmDialog({
      title: 'Sign out?',
      message: 'You will need to sign in again to access your account, orders, and wishlist.',
      confirmLabel: 'Sign out',
      danger: true,
    });
    if (!confirmed) return;
    logout();
    push('Signed out', 'info');
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)]">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex shrink-0 flex-col leading-none">
          <span className="text-xl font-semibold tracking-tight text-[var(--brand)]">Shopwave</span>
        </Link>

        <div className="hidden flex-1 sm:block">
          <SearchDropdown />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-5 text-sm">
          <div className="relative">
            {isLoggedIn ? (
              <button
                onClick={() => setAccountOpen((v) => !v)}
                onBlur={() => setTimeout(() => setAccountOpen(false), 150)}
                className={`flex items-center gap-1 font-medium transition hover:text-[var(--brand)] ${
                  isAccountActive ? 'text-[var(--brand)]' : 'text-[var(--foreground)]'
                }`}
              >
                Account
                <motion.svg
                  animate={{ rotate: accountOpen ? 180 : 0 }}
                  transition={{ duration: 0.15 }}
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 fill-none stroke-current"
                  strokeWidth={2}
                >
                  <path d="m6 9 6 6 6-6" />
                </motion.svg>
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-[var(--brand)] px-5 py-1.5 font-medium text-white transition hover:bg-[var(--brand-dark)]"
              >
                Sign In
              </Link>
            )}
            <AnimatePresence>
              {accountOpen && isLoggedIn && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg"
                >
                  {ACCOUNT_LINKS.map((item) => {
                    const itemActive =
                      pathname === item.href || (item.href === '/orders' && pathname.startsWith('/orders/'));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-4 py-2 text-sm transition hover:bg-[var(--cream)] ${
                          itemActive ? 'bg-[var(--cream)] font-medium text-[var(--brand)]' : ''
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-[var(--danger)] transition hover:bg-[var(--cream)]"
                  >
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/account/wishlist"
            className={`relative flex items-center gap-1.5 font-medium transition hover:text-[var(--brand)] ${
              isWishlistActive ? 'text-[var(--brand)]' : 'text-[var(--foreground)]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
              <path d="M12 21s-6.7-4.35-9.33-8.2C.86 10.1 1.4 6.5 4.3 5.05c2.3-1.15 4.9-.3 6.2 1.7l1.5 2.3 1.5-2.3c1.3-2 3.9-2.85 6.2-1.7 2.9 1.45 3.44 5.05 1.63 7.75C18.7 16.65 12 21 12 21z" />
            </svg>
            <span className="hidden md:inline">Wishlist</span>
            <AnimatePresence>
              {wishlistCount > 0 && (
                <motion.span
                  key={wishlistCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--danger)] text-[10px] font-semibold text-white"
                >
                  {wishlistCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          <Link
            href="/cart"
            className={`relative flex items-center gap-1.5 font-medium transition hover:text-[var(--brand)] ${
              isCartActive ? 'text-[var(--brand)]' : 'text-[var(--foreground)]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={2}>
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span className="hidden md:inline">Cart</span>
            <AnimatePresence>
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-[var(--brand-foreground)]"
                >
                  {itemCount}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>

      <div className="px-4 pb-2 sm:hidden">
        <SearchDropdown />
      </div>

      <CategoryNav />
    </header>
  );
}
