'use client';

import { Fragment, useMemo, useState, type FormEvent } from 'react';
import { BEAN_FORMS } from '@shared/catalog';
import { Button, ErrorNote, Field, FormActions, Input, Modal, PageHeader, QueryState, Select, StatusBadge, Table, Tabs, Td, Textarea } from '@/components/admin/ui';
import { useAdminMutation, useAdminQuery } from '@/lib/admin';
import { api } from '@/lib/api';
import { dateTime, money, pretty } from '@/lib/format';
import type { Booking, MenuCategory, Order, OrderStatus, OrderType, PaymentMethod, Product } from '@/lib/types';

const FILTERS: { id: OrderStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' }, { id: 'PENDING', label: 'Pending' }, { id: 'PREPARING', label: 'Preparing' },
  { id: 'READY', label: 'Ready' }, { id: 'COMPLETED', label: 'Completed' }, { id: 'CANCELLED', label: 'Cancelled' },
];
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { PENDING: 'PREPARING', PREPARING: 'READY', READY: 'COMPLETED' };

interface Line { key: string; name: string; price: number; quantity: number }

export default function OrdersPage() {
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const { data, isLoading, error } = useAdminQuery<Order[]>(['orders', filter], filter === 'ALL' ? '/orders' : `/orders?status=${filter}`);
  const [open, setOpen] = useState<number | null>(null);
  const [paying, setPaying] = useState<Order | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [creating, setCreating] = useState(false);

  const keys = [['orders'], ['sales'], ['stats'], ['admin-products'], ['products']];
  const setStatus = useAdminMutation(
    (v: { id: number; status: OrderStatus; paymentMethod?: PaymentMethod }) => api(`/orders/${v.id}/status`, { method: 'PATCH', body: { status: v.status, paymentMethod: v.paymentMethod } }),
    keys,
    () => setPaying(null),
  );

  const advance = (o: Order) => {
    const next = NEXT[o.status];
    if (!next) return;
    if (next === 'COMPLETED') {
      setMethod(o.bookingId ? 'ROOM_CHARGE' : 'CASH');
      setPaying(o);
    } else setStatus.mutate({ id: o.id, status: next });
  };

  return (
    <>
      <PageHeader title="Orders" subtitle="Online, dine-in, takeaway and room-service orders" actions={<Button onClick={() => setCreating(true)}>+ New order</Button>} />
      <Tabs tabs={FILTERS} value={filter} onChange={setFilter} />
      <QueryState isLoading={isLoading} error={error} />
      <ErrorNote error={setStatus.error} />

      {data && (
        <Table head={['#', 'Customer', 'Type', 'Total', 'Status', 'Placed', '']} empty="No orders in this view.">
          {data.map((o) => (
            <Fragment key={o.id}>
              <tr className="cursor-pointer hover:bg-cream-50" onClick={() => setOpen(open === o.id ? null : o.id)}>
                <Td className="font-medium">#{o.id}</Td>
                <Td>
                  {o.customerName}
                  {o.booking && <span className="block text-xs text-espresso-600">Room {o.booking.room.number}</span>}
                </Td>
                <Td>{pretty(o.type)}</Td>
                <Td>{money(o.total)}</Td>
                <Td><StatusBadge status={o.status} /></Td>
                <Td className="text-xs text-espresso-600">{dateTime(o.createdAt)}</Td>
                <Td className="whitespace-nowrap text-right" >
                  <span onClick={(e) => e.stopPropagation()}>
                    {NEXT[o.status] && <Button small onClick={() => advance(o)}>{NEXT[o.status] === 'COMPLETED' ? 'Complete & pay' : `Mark ${pretty(NEXT[o.status]!).toLowerCase()}`}</Button>}{' '}
                    {(o.status === 'PENDING' || o.status === 'PREPARING' || o.status === 'READY') && (
                      <Button small variant="ghost" className="!text-red-600" onClick={() => window.confirm(`Cancel order #${o.id}? Coffee stock will be returned.`) && setStatus.mutate({ id: o.id, status: 'CANCELLED' })}>Cancel</Button>
                    )}
                  </span>
                </Td>
              </tr>
              {open === o.id && (
                <tr className="bg-cream-50">
                  <td colSpan={7} className="px-6 py-4 text-sm">
                    <ul className="space-y-1">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between"><span>{i.quantity} × {i.name}</span><span>{money(i.quantity * i.unitPrice)}</span></li>
                      ))}
                    </ul>
                    {(o.customerPhone || o.notes) && <p className="mt-3 text-xs text-espresso-600">{o.customerPhone && `📞 ${o.customerPhone}  `}{o.notes && `📝 ${o.notes}`}</p>}
                    {o.sale && <p className="mt-2 text-xs text-emerald-700">Paid via {pretty(o.sale.method)} · {dateTime(o.sale.paidAt)}</p>}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </Table>
      )}

      <Modal open={paying !== null} onClose={() => setPaying(null)} title={`Complete order #${paying?.id ?? ''}`}>
        {paying && (
          <div className="space-y-4">
            <p className="text-sm text-espresso-700">Total due: <strong>{money(paying.total)}</strong>. Completing records the sale.</p>
            <Field label="Payment method">
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                <option value="CASH">Cash</option><option value="CARD">Card</option><option value="ONLINE">Online</option>
                {paying.bookingId && <option value="ROOM_CHARGE">Charge to room</option>}
              </Select>
            </Field>
            <ErrorNote error={setStatus.error} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPaying(null)}>Back</Button>
              <Button disabled={setStatus.isPending} onClick={() => setStatus.mutate({ id: paying.id, status: 'COMPLETED', paymentMethod: method })}>Record payment</Button>
            </div>
          </div>
        )}
      </Modal>

      <NewOrderModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function NewOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const menu = useAdminQuery<MenuCategory[]>(['admin-menu'], '/menu/admin/all');
  const products = useAdminQuery<Product[]>(['admin-products'], '/products/admin/all');
  const bookings = useAdminQuery<Booking[]>(['bookings'], '/bookings');

  const [type, setType] = useState<OrderType>('DINE_IN');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState('');

  const catalog = useMemo(() => {
    const m = (menu.data ?? []).flatMap((c) => c.items.filter((i) => i.available).map((i) => ({ key: `m:${i.id}`, group: c.name, name: i.name, price: i.price })));
    const v = (products.data ?? []).filter((p) => p.active).flatMap((p) => p.variants.filter((x) => x.active && x.stock > 0).map((x) => ({ key: `v:${x.id}`, group: 'Coffee', name: `${p.name} · ${BEAN_FORMS[x.form]} ${x.sizeGrams}g`, price: x.price })));
    return [...m, ...v];
  }, [menu.data, products.data]);
  const groups = [...new Set(catalog.map((c) => c.group))];
  const checkedIn = (bookings.data ?? []).filter((b) => b.status === 'CHECKED_IN');

  const create = useAdminMutation(
    () =>
      api('/orders', {
        method: 'POST',
        body: {
          type, customerName: name, customerPhone: phone || undefined, notes: notes || undefined,
          bookingId: type === 'ROOM_SERVICE' && bookingId ? Number(bookingId) : undefined,
          items: lines.map((l) => (l.key.startsWith('v:') ? { variantId: Number(l.key.slice(2)), quantity: l.quantity } : { menuItemId: Number(l.key.slice(2)), quantity: l.quantity })),
        },
      }),
    [['orders'], ['stats'], ['admin-products'], ['products']],
    () => { setLines([]); setName(''); setPhone(''); setNotes(''); setBookingId(''); onClose(); },
  );

  const addLine = () => {
    const c = catalog.find((x) => x.key === pick);
    if (!c) return;
    setLines((ls) => (ls.some((l) => l.key === c.key) ? ls.map((l) => (l.key === c.key ? { ...l, quantity: l.quantity + 1 } : l)) : [...ls, { key: c.key, name: c.name, price: c.price, quantity: 1 }]));
    setPick('');
  };
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);

  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(undefined); };

  return (
    <Modal open={open} onClose={onClose} title="New order" wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Order type">
            <Select value={type} onChange={(e) => setType(e.target.value as OrderType)}>
              <option value="DINE_IN">Dine in</option><option value="TAKEAWAY">Takeaway</option><option value="ROOM_SERVICE">Room service</option>
            </Select>
          </Field>
          {type === 'ROOM_SERVICE' ? (
            <Field label="Room (checked-in guests)">
              <Select required value={bookingId} onChange={(e) => { setBookingId(e.target.value); const b = checkedIn.find((x) => x.id === Number(e.target.value)); if (b?.guest && !name) setName(b.guest.name); }}>
                <option value="">Select a room…</option>
                {checkedIn.map((b) => <option key={b.id} value={b.id}>Room {b.room?.number} · {b.guest?.name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Customer / table"><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Table 4" /></Field>
          )}
          {type === 'ROOM_SERVICE' && <Field label="Name on order"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>}
          <Field label="Phone (optional)"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Add item">
              <Select value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Choose…</option>
                {groups.map((g) => (
                  <optgroup key={g} label={g}>
                    {catalog.filter((c) => c.group === g).map((c) => <option key={c.key} value={c.key}>{c.name} · {money(c.price)}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="button" variant="secondary" disabled={!pick} onClick={addLine}>Add</Button>
        </div>

        <ul className="divide-y divide-espresso-800/10 rounded-xl border border-espresso-800/10 text-sm">
          {lines.length === 0 && <li className="px-4 py-5 text-center text-espresso-600">No items yet.</li>}
          {lines.map((l) => (
            <li key={l.key} className="flex items-center justify-between gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 truncate">{l.name}</span>
              <Input type="number" min={1} max={50} className="!w-20" value={l.quantity} onChange={(e) => setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x)))} />
              <span className="w-24 text-right">{money(l.price * l.quantity)}</span>
              <Button type="button" small variant="ghost" className="!text-red-600" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>✕</Button>
            </li>
          ))}
        </ul>

        <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <p className="text-right font-display text-xl font-semibold">Total {money(total)}</p>
        <ErrorNote error={create.error} />
        <FormActions onCancel={onClose} pending={create.isPending || lines.length === 0} label="Create order" />
      </form>
    </Modal>
  );
}
