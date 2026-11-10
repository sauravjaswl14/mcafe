'use client';

import { Fragment, useState, type FormEvent } from 'react';
import { BEAN_FORMS } from '@shared/catalog';
import { Button, ErrorNote, Field, FormActions, Input, Modal, PageHeader, QueryState, Select, StatusBadge, Table, Tabs, Td, Textarea } from '@/components/admin/ui';
import { confirmDelete, useAdminMutation, useAdminQuery } from '@/lib/admin';
import { api } from '@/lib/api';
import { money, shortDate } from '@/lib/format';
import type { Product, PurchaseOrder, Supplier } from '@/lib/types';

export default function PurchasesPage() {
  const [tab, setTab] = useState<'orders' | 'suppliers'>('orders');
  return (
    <>
      <PageHeader title="Purchases" subtitle="Order stock from suppliers. Receiving a delivery adds it to inventory." />
      <Tabs tabs={[{ id: 'orders', label: 'Purchase orders' }, { id: 'suppliers', label: 'Suppliers' }]} value={tab} onChange={setTab} />
      {tab === 'orders' ? <PurchaseOrders /> : <Suppliers />}
    </>
  );
}

// ───────────── Purchase orders ─────────────
interface Line { variantId: number; label: string; quantity: number; unitCost: number }

function PurchaseOrders() {
  const { data, isLoading, error } = useAdminQuery<PurchaseOrder[]>(['purchases'], '/purchases');
  const suppliers = useAdminQuery<Supplier[]>(['suppliers'], '/suppliers');
  const products = useAdminQuery<Product[]>(['admin-products'], '/products/admin/all');

  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState('');

  const keys = [['purchases'], ['admin-products'], ['products'], ['stats']];
  const create = useAdminMutation(
    () => api('/purchases', { method: 'POST', body: { supplierId: Number(supplierId), notes: notes || undefined, items: lines.map(({ variantId, quantity, unitCost }) => ({ variantId, quantity, unitCost })) } }),
    keys,
    () => { setCreating(false); setLines([]); setNotes(''); setSupplierId(''); },
  );
  const receive = useAdminMutation((id: number) => api(`/purchases/${id}/receive`, { method: 'PATCH' }), keys);
  const cancel = useAdminMutation((id: number) => api(`/purchases/${id}/cancel`, { method: 'PATCH' }), keys);
  const remove = useAdminMutation((id: number) => api(`/purchases/${id}`, { method: 'DELETE' }), keys);

  const options = (products.data ?? []).flatMap((p) => p.variants.filter((v) => v.active).map((v) => ({ id: v.id, label: `${p.name} · ${BEAN_FORMS[v.form]} ${v.sizeGrams}g`, cost: Math.round(v.price * 0.6) })));
  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  const addLine = () => {
    const o = options.find((x) => x.id === Number(pick));
    if (!o || lines.some((l) => l.variantId === o.id)) return setPick('');
    setLines([...lines, { variantId: o.id, label: o.label, quantity: 10, unitCost: o.cost }]);
    setPick('');
  };
  const patch = (id: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.variantId === id ? { ...l, ...p } : l)));
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(undefined); };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => { create.reset(); setCreating(true); }} disabled={!suppliers.data?.length}>+ New purchase order</Button></div>
      {suppliers.data?.length === 0 && <p className="mb-4 text-sm text-amber-700">Add a supplier first (Suppliers tab).</p>}
      <QueryState isLoading={isLoading} error={error} />
      <ErrorNote error={receive.error ?? cancel.error ?? remove.error} />

      {data && (
        <Table head={['PO', 'Supplier', 'Total', 'Status', 'Created', '']} empty="No purchase orders yet.">
          {data.map((po) => (
            <Fragment key={po.id}>
              <tr className="cursor-pointer hover:bg-cream-50" onClick={() => setOpen(open === po.id ? null : po.id)}>
                <Td className="font-medium">PO-{po.id}</Td>
                <Td>{po.supplier.name}</Td>
                <Td>{money(po.total)}</Td>
                <Td><StatusBadge status={po.status} /></Td>
                <Td className="text-xs text-espresso-600">{shortDate(po.createdAt)}</Td>
                <Td className="whitespace-nowrap text-right">
                  <span onClick={(e) => e.stopPropagation()}>
                    {po.status === 'ORDERED' && (
                      <>
                        <Button small onClick={() => window.confirm(`Mark PO-${po.id} as received? Stock will increase.`) && receive.mutate(po.id)}>Receive</Button>{' '}
                        <Button small variant="ghost" onClick={() => cancel.mutate(po.id)}>Cancel</Button>
                      </>
                    )}
                    {po.status !== 'RECEIVED' && <Button small variant="ghost" className="!text-red-600" onClick={() => confirmDelete(`PO-${po.id}`) && remove.mutate(po.id)}>Delete</Button>}
                  </span>
                </Td>
              </tr>
              {open === po.id && (
                <tr className="bg-cream-50">
                  <td colSpan={6} className="px-6 py-4 text-sm">
                    <ul className="space-y-1">
                      {po.items.map((i) => (
                        <li key={i.id} className="flex justify-between"><span>{i.quantity} × {i.variant.product.name} · {BEAN_FORMS[i.variant.form]} {i.variant.sizeGrams}g @ {money(i.unitCost)}</span><span>{money(i.quantity * i.unitCost)}</span></li>
                      ))}
                    </ul>
                    {po.notes && <p className="mt-2 text-xs text-espresso-600">📝 {po.notes}</p>}
                    {po.receivedAt && <p className="mt-2 text-xs text-emerald-700">Received {shortDate(po.receivedAt)}</p>}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </Table>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New purchase order" wide>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Supplier">
            <Select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select…</option>
              {suppliers.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="Add product variant">
                <Select value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">Choose…</option>
                  {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </Select>
              </Field>
            </div>
            <Button type="button" variant="secondary" disabled={!pick} onClick={addLine}>Add</Button>
          </div>
          <ul className="divide-y divide-espresso-800/10 rounded-xl border border-espresso-800/10 text-sm">
            {lines.length === 0 && <li className="px-4 py-5 text-center text-espresso-600">No lines yet.</li>}
            {lines.map((l) => (
              <li key={l.variantId} className="grid grid-cols-[1fr_5rem_6rem_auto] items-center gap-3 px-4 py-2">
                <span className="truncate">{l.label}</span>
                <Input type="number" min={1} aria-label="Quantity" value={l.quantity} onChange={(e) => patch(l.variantId, { quantity: Math.max(1, Number(e.target.value)) })} />
                <Input type="number" min={0} aria-label="Unit cost" value={l.unitCost} onChange={(e) => patch(l.variantId, { unitCost: Math.max(0, Number(e.target.value)) })} />
                <Button type="button" small variant="ghost" className="!text-red-600" onClick={() => setLines(lines.filter((x) => x.variantId !== l.variantId))}>✕</Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-espresso-600">Per line: quantity, then unit cost (prefilled at about 60% of the selling price).</p>
          <Field label="Notes"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <p className="text-right font-display text-xl font-semibold">Total {money(total)}</p>
          <ErrorNote error={create.error} />
          <FormActions onCancel={() => setCreating(false)} pending={create.isPending || lines.length === 0} label="Create PO" />
        </form>
      </Modal>
    </>
  );
}

// ───────────── Suppliers ─────────────
interface SupDraft { name: string; phone: string; email: string; address: string }
const blank: SupDraft = { name: '', phone: '', email: '', address: '' };

function Suppliers() {
  const { data, isLoading, error } = useAdminQuery<Supplier[]>(['suppliers'], '/suppliers');
  const [editing, setEditing] = useState<Supplier | 'new' | null>(null);
  const [d, setD] = useState<SupDraft>(blank);

  const keys = [['suppliers']];
  const save = useAdminMutation(
    () => {
      const body = { name: d.name, phone: d.phone || null, email: d.email || null, address: d.address || null };
      return editing === 'new' ? api('/suppliers', { method: 'POST', body }) : api(`/suppliers/${(editing as Supplier).id}`, { method: 'PUT', body });
    },
    keys,
    () => setEditing(null),
  );
  const remove = useAdminMutation((id: number) => api(`/suppliers/${id}`, { method: 'DELETE' }), keys);

  const open = (s: Supplier | 'new') => { setD(s === 'new' ? blank : { name: s.name, phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '' }); save.reset(); setEditing(s); };
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(undefined); };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => open('new')}>+ New supplier</Button></div>
      <QueryState isLoading={isLoading} error={error} />
      <ErrorNote error={remove.error} />
      {data && (
        <Table head={['Supplier', 'Phone', 'Email', 'Address', '']} empty="No suppliers yet.">
          {data.map((s) => (
            <tr key={s.id}>
              <Td className="font-medium">{s.name}</Td><Td>{s.phone ?? '—'}</Td><Td>{s.email ?? '—'}</Td><Td>{s.address ?? '—'}</Td>
              <Td className="whitespace-nowrap text-right">
                <Button small variant="ghost" onClick={() => open(s)}>Edit</Button>
                <Button small variant="ghost" className="!text-red-600" onClick={() => confirmDelete(s.name) && remove.mutate(s.id)}>Delete</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New supplier' : 'Edit supplier'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name"><Input required value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field label="Phone"><Input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></Field>
          <Field label="Address"><Input value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} /></Field>
          <ErrorNote error={save.error} />
          <FormActions onCancel={() => setEditing(null)} pending={save.isPending} />
        </form>
      </Modal>
    </>
  );
}
