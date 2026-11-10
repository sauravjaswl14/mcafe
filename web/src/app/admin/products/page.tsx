'use client';

import { useState, type FormEvent } from 'react';
import { BEAN_FORMS } from '@shared/catalog';
import { Badge, Button, ErrorNote, Field, FormActions, Input, Modal, PageHeader, QueryState, Select, Table, Td, Textarea } from '@/components/admin/ui';
import { confirmDelete, useAdminMutation, useAdminQuery } from '@/lib/admin';
import { api } from '@/lib/api';
import { money, pretty } from '@/lib/format';
import type { BeanForm, Product, RoastKey } from '@/lib/types';

interface VariantDraft { id?: number; form: BeanForm; sizeGrams: number; price: number; stock: number }
interface Draft { slug: string; name: string; origin: string; roast: RoastKey; flavors: string; description: string; active: boolean; variants: VariantDraft[] }

const blank: Draft = {
  slug: '', name: '', origin: '', roast: 'MEDIUM', flavors: '', description: '', active: true,
  variants: [{ form: 'WHOLE_BEANS', sizeGrams: 250, price: 0, stock: 0 }],
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function ProductsPage() {
  const { data, isLoading, error } = useAdminQuery<Product[]>(['admin-products'], '/products/admin/all');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);

  const keys = [['admin-products'], ['products'], ['stats']];
  const save = useAdminMutation(
    () => {
      const body = {
        ...draft,
        flavors: draft.flavors.split(',').map((f) => f.trim()).filter(Boolean),
      };
      return editing === 'new' ? api('/products', { method: 'POST', body }) : api(`/products/${(editing as Product).id}`, { method: 'PUT', body });
    },
    keys,
    () => setEditing(null),
  );
  const remove = useAdminMutation(
    (p: Product) => api<{ archived?: boolean; message?: string } | undefined>(`/products/${p.id}`, { method: 'DELETE' }),
    keys,
    (r) => r?.archived && window.alert(r.message),
  );
  const toggle = useAdminMutation(
    (p: Product) =>
      api(`/products/${p.id}`, {
        method: 'PUT',
        body: { ...p, active: !p.active, variants: p.variants.filter((v) => v.active).map(({ id, form, sizeGrams, price, stock }) => ({ id, form, sizeGrams, price, stock })) },
      }),
    keys,
  );

  const openNew = () => { setDraft(blank); save.reset(); setEditing('new'); };
  const openEdit = (p: Product) => {
    setDraft({
      slug: p.slug, name: p.name, origin: p.origin, roast: p.roast, flavors: p.flavors.join(', '), description: p.description, active: p.active,
      variants: p.variants.filter((v) => v.active).map(({ id, form, sizeGrams, price, stock }) => ({ id, form, sizeGrams, price, stock })),
    });
    save.reset();
    setEditing(p);
  };

  const setVariant = (i: number, patch: Partial<VariantDraft>) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v, k) => (k === i ? { ...v, ...patch } : v)) }));

  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(undefined); };

  return (
    <>
      <PageHeader title="Coffee products" subtitle="Beans, ground and packaged coffee with sizes, prices and stock" actions={<Button onClick={openNew}>+ New coffee</Button>} />
      <QueryState isLoading={isLoading} error={error} />
      {data && (
        <Table head={['Coffee', 'Roast', 'Variants', 'Status', '']} empty="No coffees yet. Add your first one.">
          {data.map((p) => (
            <tr key={p.id} className={p.active ? '' : 'opacity-60'}>
              <Td>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-espresso-600">{p.origin} · {p.flavors.join(', ')}</p>
              </Td>
              <Td>{pretty(p.roast)}</Td>
              <Td>
                <ul className="space-y-0.5 text-xs">
                  {p.variants.filter((v) => v.active).map((v) => (
                    <li key={v.id}>{BEAN_FORMS[v.form]} {v.sizeGrams}g · {money(v.price)} · <span className={v.stock <= 10 ? 'font-semibold text-amber-700' : ''}>{v.stock} in stock</span></li>
                  ))}
                </ul>
              </Td>
              <Td><Badge tone={p.active ? 'green' : 'gray'}>{p.active ? 'Visible' : 'Hidden'}</Badge></Td>
              <Td className="whitespace-nowrap text-right">
                <Button small variant="ghost" onClick={() => toggle.mutate(p)}>{p.active ? 'Hide' : 'Show'}</Button>
                <Button small variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                <Button small variant="ghost" className="!text-red-600" onClick={() => confirmDelete(p.name) && remove.mutate(p)}>Delete</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <ErrorNote error={remove.error ?? toggle.error} />

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New coffee' : 'Edit coffee'} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value, slug: editing === 'new' ? slugify(e.target.value) : draft.slug })} /></Field>
            <Field label="URL slug" hint="lowercase-with-dashes"><Input required value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} /></Field>
            <Field label="Origin"><Input required value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} /></Field>
            <Field label="Roast">
              <Select value={draft.roast} onChange={(e) => setDraft({ ...draft, roast: e.target.value as RoastKey })}>
                <option value="LIGHT">Light</option><option value="MEDIUM">Medium</option><option value="DARK">Dark</option>
              </Select>
            </Field>
          </div>
          <Field label="Flavor notes" hint="Comma separated, e.g. Caramel, Hazelnut, Orange peel"><Input value={draft.flavors} onChange={(e) => setDraft({ ...draft, flavors: e.target.value })} /></Field>
          <Field label="Description"><Textarea required value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Visible in the shop</label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-espresso-700">Variants</p>
              <Button type="button" small variant="secondary" onClick={() => setDraft({ ...draft, variants: [...draft.variants, { form: 'WHOLE_BEANS', sizeGrams: 250, price: 0, stock: 0 }] })}>+ Add variant</Button>
            </div>
            <div className="space-y-2">
              {draft.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-2 items-end gap-2 rounded-xl bg-cream-50 p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                  <Field label="Form">
                    <Select value={v.form} onChange={(e) => setVariant(i, { form: e.target.value as BeanForm })}>
                      {(Object.keys(BEAN_FORMS) as BeanForm[]).map((f) => <option key={f} value={f}>{BEAN_FORMS[f]}</option>)}
                    </Select>
                  </Field>
                  <Field label="Size (g)"><Input type="number" min={1} required value={v.sizeGrams} onChange={(e) => setVariant(i, { sizeGrams: Number(e.target.value) })} /></Field>
                  <Field label="Price"><Input type="number" min={0} required value={v.price} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} /></Field>
                  <Field label="Stock"><Input type="number" min={0} required value={v.stock} onChange={(e) => setVariant(i, { stock: Number(e.target.value) })} /></Field>
                  <Button type="button" small variant="ghost" className="!text-red-600" disabled={draft.variants.length === 1} onClick={() => setDraft({ ...draft, variants: draft.variants.filter((_, k) => k !== i) })}>Remove</Button>
                </div>
              ))}
            </div>
          </div>

          <ErrorNote error={save.error} />
          <FormActions onCancel={() => setEditing(null)} pending={save.isPending} />
        </form>
      </Modal>
    </>
  );
}
