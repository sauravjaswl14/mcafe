'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { cafe } from '@shared/catalog';
import { Button } from '@/components/admin/ui';
import { api, errorMessage } from '@/lib/api';
import { useMe } from '@/lib/queries';

const NAV = [
  { href: '/admin', label: 'Overview', icon: '◧' },
  { href: '/admin/orders', label: 'Orders', icon: '🧾' },
  { href: '/admin/sales', label: 'Sales', icon: '💰' },
  { href: '/admin/products', label: 'Coffee products', icon: '☕' },
  { href: '/admin/menu', label: 'Menu', icon: '🍔' },
  { href: '/admin/purchases', label: 'Purchases', icon: '📦' },
  { href: '/admin/hms', label: 'Hotel (HMS)', icon: '🛏' },
];

/**
 * Authorization gate for the whole dashboard.
 * Renders nothing from the dashboard until /auth/me confirms role === ADMIN.
 * (Every /api route it calls is ALSO admin-protected on the server.)
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      qc.setQueryData(['me'], null);
      router.replace('/login');
    },
  });

  useEffect(() => {
    if (me.isSuccess && me.data === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me.isSuccess, me.data, router, pathname]);

  if (me.isLoading || (me.isSuccess && me.data === null)) {
    return <div className="flex min-h-screen items-center justify-center bg-cream-50 text-espresso-600">Checking access…</div>;
  }

  if (me.isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 px-6 text-center text-espresso-800">
        <p className="font-display text-2xl">Can&apos;t reach the server</p>
        <p className="text-sm text-espresso-600">{errorMessage(me.error)}</p>
        <Button onClick={() => me.refetch()}>Try again</Button>
      </div>
    );
  }

  if (me.data && me.data.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 px-6 text-center text-espresso-800">
        <p className="font-display text-4xl">403</p>
        <p className="max-w-sm text-espresso-600">Signed in as {me.data.email}. The dashboard is for administrators only.</p>
        <div className="flex gap-2">
          <Link href="/" className="rounded-lg border border-espresso-800/20 px-4 py-2 text-sm hover:bg-cream-100">Back to the café</Link>
          <Button onClick={() => logout.mutate()}>Sign out</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-espresso-900 md:flex">
      <aside className="border-b border-espresso-800/10 bg-espresso-900 text-cream-100 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 md:block md:py-6">
          <Link href="/admin" className="font-display text-xl font-semibold text-cream-50">{cafe.name}</Link>
          <p className="hidden text-xs text-cream-300 md:mt-1 md:block">Admin dashboard</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map((n) => {
            const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-caramel-400 font-semibold text-espresso-950' : 'text-cream-200 hover:bg-white/10'}`}
              >
                <span aria-hidden="true">{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/10 p-4 text-sm md:absolute md:bottom-0 md:block md:w-64">
          <p className="truncate text-cream-50">{me.data?.name}</p>
          <p className="truncate text-xs text-cream-300">{me.data?.email}</p>
          <div className="mt-3 flex gap-3 text-xs">
            <Link href="/" className="text-caramel-300 hover:underline">View site</Link>
            <button onClick={() => logout.mutate()} className="text-cream-300 hover:text-cream-50">Sign out</button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 sm:p-8">{children}</main>
    </div>
  );
}
