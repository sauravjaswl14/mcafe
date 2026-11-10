'use client';

import { useState, type FormEvent } from 'react';
import { Badge, Button, Card, ErrorNote, Field, FormActions, Input, Modal, PageHeader, QueryState, Select, Textarea } from '@/components/admin/ui';
import { confirmDelete, useAdminMutation, useAdminQuery } from '@/lib/admin';
import { api } from '@/lib/api';
import { money } from '@/lib/format';
import type { MenuCategory, MenuItem } from '@/lib/types';

interface ItemDraft { categoryId: number; name: string; description: string; price: number; available: boolean }

export default function MenuAdminPage() {
  const { data, isLoading, error } = useAdminQuery<MenuCategory[]>(['admin-menu'], '/menu/admin/all');
  const keys = [['admin-menu'], ['menu']];

  const [catModal, setCatModal] = useState<MenuCategory | 'new' | null>(null);
  const [catName, setCatName] = useState('');
  const [itemModal, setItemModal] = useState<MenuItem | 'new' | null>(null);
  const [item, setItem] = useState<ItemDraft>({ categoryId: 0, name: '', description: '', price: 0, available: true });

  const saveCat = useAdminMutation(
    () =>
      catModal === 'new'
        ? api('/menu/categories', { method: 'POST', body: { name: catName, sortOrder: data?.length ?? 0 } })
        : api(`/menu/categories/${(catModal as MenuCategory).id}`, { method: 'PUT', body: { name: catName, sortOrder: (catModal as MenuCategory).sortOrder } }),
    keys,
    () => setCatModal(null),
  );
  const delCat = useAdminMutation((c: MenuCategory) => api(`/menu/categories/${c.id}`, { method: 'DELETE' }), keys);

  const saveItem = useAdminMutation(
    () =>
      itemModal === 'new'
        ? api('/menu/items', { method: 'POST', body: item })
        : api(`/menu/items/${(itemModal as MenuItem).id}`, { method: 'PUT', body: item }),
    keys,
    () => setItemModal(null),
  );
  const delItem = useAdminMutation((i: MenuItem) => api(`/menu/items/${i.id}`, { method: 'DELETE' }), keys);
  const toggleItem = useAdminMutation(
    (i: MenuItem) => api(`/menu/items/${i.id}`, { method: 'PUT', body: { categoryId: i.categoryId, name: i.name, description: i.description, price: i.price, available: !i.available } }),
    keys,
  );

  const openCat = (c: MenuCategory | 'new') => { setCatName(c === 'new' ? '' : c.name); saveCat.reset(); setCatModal(c); };
  const openItem = (i: MenuItem | 'new', categoryId?: number) => {
    setItem(i === 'new' ? { categoryId: categoryId ?? data?.[0]?.id ?? 0, name: '', description: '', price: 0, available: true } : { categoryId: i.categoryId, name: i.name, description: i.description, price: i.price, available: i.available });
    saveItem.reset();
    setItemModal(i);
  };

  const submitCat = (e: FormEvent) => { e.preventDefault(); saveCat.mutate(undefined); };
  const submitItem = (e: FormEvent) => { e.preventDefault(); saveItem.mutate(undefined); };

  return (
    <>
      <PageHeader
        title="Menu"
        subtitle="Categories and items are fully dynamic. Add sandwiches, hot dogs, burgers, rolls or anything else."
        actions={<><Button variant="secondary" onClick={() => openCat('new')}>+ Category</Button><Button onClick={() => openItem('new')} disabled={!data?.length}>+ Item</Button></>}
      />
      <QueryState isLoading={isLoading} error={error} />
      <ErrorNote error={delCat.error ?? delItem.error ?? toggleItem.error} />

      <div className="space-y-6">
        {data?.length === 0 && <Card className="p-10 text-center text-sm text-espresso-600">No categories yet. Create one to get started.</Card>}
        {data?.map((c) => (
          <Card key={c.id} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-espresso-800/10 bg-cream-50 px-5 py-3">
              <h2 className="font-display text-lg font-semibold">{c.name} <span className="ml-1 text-sm font-normal text-espresso-600">({c.items.length})</span></h2>
              <div className="flex gap-1">
                <Button small variant="ghost" onClick={() => openItem('new', c.id)}>+ Item</Button>
                <Button small variant="ghost" onClick={() => openCat(c)}>Rename</Button>
                <Button small variant="ghost" className="!text-red-600" onClick={() => confirmDelete(`category "${c.name}" and its ${c.items.length} items`) && delCat.mutate(c)}>Delete</Button>
              </div>
            </div>
            <ul className="divide-y divide-espresso-800/5">
              {c.items.length === 0 && <li className="px-5 py-6 text-sm text-espresso-600">No items in this category.</li>}
              {c.items.map((i) => (
                <li key={i.id} className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${i.available ? '' : 'opacity-60'}`}>
                  <div className="min-w-0">
                    <p className="font-medium">{i.name}</p>
                    {i.description && <p className="truncate text-xs text-espresso-600">{i.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{money(i.price)}</span>
                    <Badge tone={i.available ? 'green' : 'gray'}>{i.available ? 'Available' : 'Hidden'}</Badge>
                    <Button small variant="ghost" onClick={() => toggleItem.mutate(i)}>{i.available ? 'Hide' : 'Show'}</Button>
                    <Button small variant="ghost" onClick={() => openItem(i)}>Edit</Button>
                    <Button small variant="ghost" className="!text-red-600" onClick={() => confirmDelete(i.name) && delItem.mutate(i)}>Delete</Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Modal open={catModal !== null} onClose={() => setCatModal(null)} title={catModal === 'new' ? 'New category' : 'Rename category'}>
        <form onSubmit={submitCat} className="space-y-4">
          <Field label="Name"><Input required autoFocus minLength={2} value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Burgers" /></Field>
          <ErrorNote error={saveCat.error} />
          <FormActions onCancel={() => setCatModal(null)} pending={saveCat.isPending} />
        </form>
      </Modal>

      <Modal open={itemModal !== null} onClose={() => setItemModal(null)} title={itemModal === 'new' ? 'New menu item' : 'Edit menu item'}>
        <form onSubmit={submitItem} className="space-y-4">
          <Field label="Category">
            <Select value={item.categoryId} onChange={(e) => setItem({ ...item, categoryId: Number(e.target.value) })}>
              {data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Name"><Input required minLength={2} value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} /></Field>
          <Field label="Description"><Textarea value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} /></Field>
          <Field label="Price"><Input type="number" min={0} required value={item.price} onChange={(e) => setItem({ ...item, price: Number(e.target.value) })} /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.available} onChange={(e) => setItem({ ...item, available: e.target.checked })} /> Available to order</label>
          <ErrorNote error={saveItem.error} />
          <FormActions onCancel={() => setItemModal(null)} pending={saveItem.isPending} />
        </form>
      </Modal>
    </>
  );
}
