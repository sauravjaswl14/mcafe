'use client';

import { motion } from 'motion/react';
import { BEAN_FORMS } from '@shared/catalog';
import { Badge, Card, PageHeader, QueryState, Stat, StatusBadge } from '@/components/admin/ui';
import { useAdminQuery } from '@/lib/admin';
import { money, pretty } from '@/lib/format';
import type { Stats } from '@/lib/types';

export default function OverviewPage() {
  const { data, isLoading, error } = useAdminQuery<Stats>(['stats'], '/stats');

  return (
    <>
      <PageHeader title="Overview" subtitle="How the café, roastery and hotel are doing" />
      <QueryState isLoading={isLoading} error={error} />
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Revenue today" value={money(data.revenueToday)} hint={`${data.salesToday} sales`} />
            <Stat label="Revenue · 30 days" value={money(data.revenue30)} hint={`${data.sales30} sales`} />
            <Stat label="Purchases · 30 days" value={money(data.purchases30)} hint={`Gross margin ${money(data.margin30)}`} />
            <Stat label="Open orders" value={data.pendingOrders} hint={`${data.activeBookings} guests checked in`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <h2 className="font-display text-lg font-semibold">Revenue, last 7 days</h2>
              <RevenueBars data={data.revenueByDay} />
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Low stock</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {data.lowStock.length === 0 && <li className="text-espresso-600">Everything is well stocked.</li>}
                {data.lowStock.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2">
                    <span>{v.name} <span className="text-espresso-600">· {BEAN_FORMS[v.form]} {v.sizeGrams}g</span></span>
                    <Badge tone={v.stock === 0 ? 'red' : 'amber'}>{v.stock} left</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Orders by status</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {data.ordersByStatus.length === 0 && <li className="text-espresso-600">No orders yet.</li>}
                {data.ordersByStatus.map((o) => (
                  <li key={o.status} className="flex items-center justify-between"><StatusBadge status={o.status} /><span className="font-medium">{o.count}</span></li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Rooms</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {data.roomsByStatus.length === 0 && <li className="text-espresso-600">No rooms set up.</li>}
                {data.roomsByStatus.map((r) => (
                  <li key={r.status} className="flex items-center justify-between"><StatusBadge status={r.status} /><span className="font-medium">{r.count}</span></li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function RevenueBars({ data }: { data: Stats['revenueByDay'] }) {
  const max = Math.max(1, ...data.map((d) => d.amount));
  return (
    <div className="mt-6 flex h-52 items-end gap-3" role="img" aria-label="Revenue per day for the last seven days">
      {data.map((d, i) => (
        <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[10px] text-espresso-600">{d.amount ? money(d.amount) : ''}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${Math.max((d.amount / max) * 100, d.amount ? 4 : 1)}%` }}
            transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="w-full rounded-t-md bg-caramel-500"
          />
          <span className="text-xs text-espresso-600">{pretty(new Date(d.date + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' }))}</span>
        </div>
      ))}
    </div>
  );
}
