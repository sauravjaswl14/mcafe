'use client';

import { useMemo, useState } from 'react';
import { Card, Input, PageHeader, QueryState, Stat, Table, Td } from '@/components/admin/ui';
import { useAdminQuery } from '@/lib/admin';
import { dateTime, money, pretty, toDateInput } from '@/lib/format';
import type { SaleRow } from '@/lib/types';

interface SalesResponse { sales: SaleRow[]; totalAmount: number; count: number }

export default function SalesPage() {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 29); return toDateInput(d); });
  const [to, setTo] = useState(() => toDateInput(new Date()));

  // `to` is inclusive: send end-of-day in local time
  const qs = new URLSearchParams({ from: new Date(`${from}T00:00:00`).toISOString(), to: new Date(`${to}T23:59:59.999`).toISOString() });
  const { data, isLoading, error } = useAdminQuery<SalesResponse>(['sales', from, to], `/sales?${qs}`);

  const byMethod = useMemo(() => {
    const m = new Map<string, number>();
    data?.sales.forEach((s) => m.set(s.method, (m.get(s.method) ?? 0) + s.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <>
      <PageHeader
        title="Sales"
        subtitle="Every completed order becomes a sale"
        actions={
          <div className="flex items-center gap-2 text-sm">
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <span className="text-espresso-600">to</span>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          </div>
        }
      />
      <QueryState isLoading={isLoading} error={error} />
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total sales" value={money(data.totalAmount)} />
            <Stat label="Transactions" value={data.count} />
            <Stat label="Average sale" value={data.count ? money(Math.round(data.totalAmount / data.count)) : '—'} />
          </div>

          {byMethod.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 font-display text-lg font-semibold">By payment method</h2>
              <ul className="flex flex-wrap gap-x-10 gap-y-2 text-sm">
                {byMethod.map(([m, amt]) => <li key={m}><span className="text-espresso-600">{pretty(m)}</span> <strong className="ml-1">{money(amt)}</strong></li>)}
              </ul>
            </Card>
          )}

          <Table head={['Paid', 'Order', 'Customer', 'Items', 'Method', 'Amount']} empty="No sales in this period.">
            {data.sales.map((s) => (
              <tr key={s.id}>
                <Td className="text-xs text-espresso-600">{dateTime(s.paidAt)}</Td>
                <Td>#{s.order.id}</Td>
                <Td>{s.order.customerName}</Td>
                <Td className="max-w-xs truncate text-xs text-espresso-600">{s.order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</Td>
                <Td>{pretty(s.method)}</Td>
                <Td className="font-medium">{money(s.amount)}</Td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </>
  );
}
