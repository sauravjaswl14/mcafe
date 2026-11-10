'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, useMotionValueEvent, useScroll, useSpring } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { cafe } from '@shared/catalog';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { useMe } from '@/lib/queries';

const links = [
  { href: '#story', label: 'Story' },
  { href: '#coffee', label: 'Coffee' },
  { href: '#menu', label: 'Menu' },
  { href: '#visit', label: 'Visit' },
];

export function Navbar() {
  const { count, setOpen } = useCart();
  const me = useMe();
  const qc = useQueryClient();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  // Slide away while scrolling down, spring back on scroll up
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 240);
  });

  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => qc.setQueryData(['me'], null),
  });

  return (
    <motion.header
      animate={{ y: hidden ? '-100%' : '0%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="fixed inset-x-0 top-0 z-40 border-b border-white/5 bg-espresso-950/70 backdrop-blur-md"
    >
      <motion.div style={{ scaleX: progress }} className="absolute inset-x-0 top-0 h-0.5 origin-left bg-caramel-400" />
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a href="#top" className="font-display text-xl font-semibold tracking-tight text-cream-50">
          {cafe.name}
        </a>

        <ul className="hidden items-center gap-8 text-sm text-cream-200 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-caramel-300">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 text-sm">
          {me.data ? (
            <>
              {me.data.role === 'ADMIN' && (
                <Link href="/admin" className="rounded-full bg-caramel-400/15 px-3 py-1.5 font-medium text-caramel-300 hover:bg-caramel-400/25">
                  Dashboard
                </Link>
              )}
              <button onClick={() => logout.mutate()} className="hidden text-cream-300 hover:text-cream-50 sm:block">
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="text-cream-200 hover:text-cream-50">
              Sign in
            </Link>
          )}

          <button
            onClick={() => setOpen(true)}
            className="relative rounded-full bg-caramel-400 px-4 py-1.5 font-semibold text-espresso-950 transition hover:bg-caramel-300"
            aria-label={`Open cart, ${count} items`}
          >
            Cart
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-espresso-950 px-1 text-xs text-caramel-300"
              >
                {count}
              </motion.span>
            )}
          </button>
        </div>
      </nav>
    </motion.header>
  );
}
