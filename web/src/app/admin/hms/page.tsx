'use client';

import { useState, type FormEvent } from 'react';
import { Button, ErrorNote, Field, FormActions, Input, Modal, PageHeader, QueryState, Select, StatusBadge, Table, Tabs, Td } from '@/components/admin/ui';
import { confirmDelete, useAdminMutation, useAdminQuery } from '@/lib/admin';
import { api } from '@/lib/api';
import { money, pretty, shortDate, toDateInput } from '@/lib/format';
import type { Booking, BookingStatus, Guest, Room, RoomStatus } from '@/lib/types';

type Tab = 'bookings' | 'rooms' | 'guests';

export default function HmsPage() {
  const [tab, setTab] = useState<Tab>('bookings');
  return (
    <>
      <PageHeader title="Hotel management" subtitle="Rooms, guests and bookings. Room-service orders are billed to the stay at check-out." />
      <Tabs tabs={[{ id: 'bookings', label: 'Bookings' }, { id: 'rooms', label: 'Rooms' }, { id: 'guests', label: 'Guests' }]} value={tab} onChange={setTab} />
      {tab === 'bookings' && <Bookings />}
      {tab === 'rooms' && <Rooms />}
      {tab === 'guests' && <Guests />}
    </>
  );
}

const HMS_KEYS = [['bookings'], ['rooms'], ['guests'], ['stats']];

// ───────────── Bookings ─────────────
const NEXT: Partial<Record<BookingStatus, { to: BookingStatus; label: string }[]>> = {
  RESERVED: [{ to: 'CHECKED_IN', label: 'Check in' }, { to: 'CANCELLED', label: 'Cancel' }],
  CHECKED_IN: [{ to: 'CHECKED_OUT', label: 'Check out' }],
};

function Bookings() {
  const { data, isLoading, error } = useAdminQuery<Booking[]>(['bookings'], '/bookings');
  const rooms = useAdminQuery<Room[]>(['rooms'], '/rooms');
  const guests = useAdminQuery<Guest[]>(['guests'], '/guests');

  const [creating, setCreating] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [guestId, setGuestId] = useState('');
  const [newGuest, setNewGuest] = useState({ name: '', phone: '' });
  const [checkIn, setCheckIn] = useState(() => toDateInput(new Date()));
  const [checkOut, setCheckOut] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); return toDateInput(d); });

  const create = useAdminMutation(
    async () => {
      let gid = Number(guestId);
      if (guestId === 'new') {
        const g = await api<Guest>('/guests', { method: 'POST', body: { name: newGuest.name, phone: newGuest.phone || null } });
        gid = g.id;
      }
      return api('/bookings', { method: 'POST', body: { roomId: Number(roomId), guestId: gid, checkIn, checkOut } });
    },
    HMS_KEYS,
    () => { setCreating(false); setNewGuest({ name: '', phone: '' }); setGuestId(''); },
  );
  const move = useAdminMutation((v: { id: number; status: BookingStatus }) => api(`/bookings/${v.id}/status`, { method: 'PATCH', body: { status: v.status } }), HMS_KEYS);
  const remove = useAdminMutation((id: number) => api(`/bookings/${id}`, { method: 'DELETE' }), HMS_KEYS);

  const nights = Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000));
  const room = rooms.data?.find((r) => r.id === Number(roomId));
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(undefined); };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => { create.reset(); setCreating(true); }} disabled={!rooms.data?.length}>+ New booking</Button></div>
      <QueryState isLoading={isLoading} error={error} />
      <ErrorNote error={move.error ?? remove.error} />
      {data && (
        <Table head={['Room', 'Guest', 'Stay', 'Total', 'Status', '']} empty="No bookings yet.">
          {data.map((b) => (
            <tr key={b.id}>
              <Td className="font-medium">{b.room?.number} <span className="font-normal text-espresso-600">· {b.room?.type}</span></Td>
              <Td>{b.guest?.name}</Td>
              <Td className="text-xs">{shortDate(b.checkIn)} → {shortDate(b.checkOut)}</Td>
              <Td>{money(b.total)}{b.status === 'CHECKED_IN' && <span className="block text-[10px] text-espresso-600">so far, room only</span>}</Td>
              <Td><StatusBadge status={b.status} /></Td>
              <Td className="whitespace-nowrap text-right">
                {NEXT[b.status]?.map((a) => (
                  <Button key={a.to} small variant={a.to === 'CANCELLED' ? 'ghost' : 'primary'} className={a.to === 'CANCELLED' ? '!text-red-600' : ''} onClick={() => move.mutate({ id: b.id, status: a.to })}>{a.label}</Button>
                ))}{' '}
                {b.status !== 'CHECKED_IN' && <Button small variant="ghost" className="!text-red-600" onClick={() => confirmDelete('this booking') && remove.mutate(b.id)}>Delete</Button>}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New booking">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Room">
            <Select required value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Select…</option>
              {rooms.data?.filter((r) => r.status !== 'MAINTENANCE').map((r) => <option key={r.id} value={r.id}>{r.number} · {r.type} · {money(r.rate)}/night</option>)}
            </Select>
          </Field>
          <Field label="Guest">
            <Select required value={guestId} onChange={(e) => setGuestId(e.target.value)}>
              <option value="">Select…</option>
              <option value="new">+ New guest…</option>
              {guests.data?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
          </Field>
          {guestId === 'new' && (
            <div className="grid gap-3 rounded-xl bg-cream-50 p-3 sm:grid-cols-2">
              <Field label="Guest name"><Input required value={newGuest.name} onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })} /></Field>
              <Field label="Phone"><Input value={newGuest.phone} onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })} /></Field>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Check-in"><Input type="date" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></Field>
            <Field label="Check-out"><Input type="date" required min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></Field>
          </div>
          {room && nights > 0 && <p className="text-sm text-espresso-700">{nights} night{nights > 1 ? 's' : ''} × {money(room.rate)} = <strong>{money(nights * room.rate)}</strong></p>}
          <ErrorNote error={create.error} />
          <FormActions onCancel={() => setCreating(false)} pending={create.isPending} label="Book" />
        </form>
      </Modal>
    </>
  );
}

// ───────────── Rooms ─────────────
interface RoomDraft { number: string; type: string; capacity: number; rate: number; status: RoomStatus }
const ROOM_STATUSES: RoomStatus[] = ['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE'];

function Rooms() {
  const { data, isLoading, error } = useAdminQuery<Room[]>(['rooms'], '/rooms');
  const [editing, setEditing] = useState<Room | 'new' | null>(null);
  const [d, setD] = useState<RoomDraft>({ number: '', type: 'Standard', capacity: 2, rate: 0, status: 'AVAILABLE' });

  const save = useAdminMutation(
    () => (editing === 'new' ? api('/rooms', { method: 'POST', body: d }) : api(`/rooms/${(editing as Room).id}`, { method: 'PUT', body: d })),
    HMS_KEYS,
    () => setEditing(null),
  );
  const setStatus = useAdminMutation(
    (v: { room: Room; status: RoomStatus }) => api(`/rooms/${v.room.id}`, { method: 'PUT', body: { number: v.room.number, type: v.room.type, capacity: v.room.capacity, rate: v.room.rate, status: v.status } }),
    HMS_KEYS,
  );
  const remove = useAdminMutation((id: number) => api(`/rooms/${id}`, { method: 'DELETE' }), HMS_KEYS);

  const open = (r: Room | 'new') => {
    setD(r === 'new' ? { number: '', type: 'Standard', capacity: 2, rate: 0, status: 'AVAILABLE' } : { number: r.number, type: r.type, capacity: r.capacity, rate: r.rate, status: r.status });
    save.reset();
    setEditing(r);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(undefined); };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => open('new')}>+ New room</Button></div>
      <QueryState isLoading={isLoading} error={error} />
      <ErrorNote error={setStatus.error ?? remove.error} />
      {data && (
        <Table head={['Room', 'Type', 'Sleeps', 'Rate / night', 'Status', '']} empty="No rooms yet.">
          {data.map((r) => (
            <tr key={r.id}>
              <Td className="font-medium">{r.number}</Td><Td>{r.type}</Td><Td>{r.capacity}</Td><Td>{money(r.rate)}</Td>
              <Td>
                <Select className="!w-auto !py-1 !text-xs" value={r.status} onChange={(e) => setStatus.mutate({ room: r, status: e.target.value as RoomStatus })} aria-label={`Status of room ${r.number}`}>
                  {ROOM_STATUSES.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}
                </Select>
              </Td>
              <Td className="whitespace-nowrap text-right">
                <Button small variant="ghost" onClick={() => open(r)}>Edit</Button>
                <Button small variant="ghost" className="!text-red-600" onClick={() => confirmDelete(`room ${r.number}`) && remove.mutate(r.id)}>Delete</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New room' : 'Edit room'}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Room number"><Input required value={d.number} onChange={(e) => setD({ ...d, number: e.target.value })} /></Field>
            <Field label="Type"><Input required value={d.type} onChange={(e) => setD({ ...d, type: e.target.value })} placeholder="Standard, Deluxe, Suite…" /></Field>
            <Field label="Capacity"><Input type="number" min={1} required value={d.capacity} onChange={(e) => setD({ ...d, capacity: Number(e.target.value) })} /></Field>
            <Field label="Rate per night"><Input type="number" min={0} required value={d.rate} onChange={(e) => setD({ ...d, rate: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Status">
            <Select value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as RoomStatus })}>{ROOM_STATUSES.map((s) => <option key={s} value={s}>{pretty(s)}</option>)}</Select>
          </Field>
          <ErrorNote error={save.error} />
          <FormActions onCancel={() => setEditing(null)} pending={save.isPending} />
        </form>
      </Modal>
    </>
  );
}

// ───────────── Guests ─────────────
interface GuestDraft { name: string; phone: string; email: string; idNumber: string }
const blankGuest: GuestDraft = { name: '', phone: '', email: '', idNumber: '' };

function Guests() {
  const { data, isLoading, error } = useAdminQuery<Guest[]>(['guests'], '/guests');
  const [editing, setEditing] = useState<Guest | 'new' | null>(null);
  const [d, setD] = useState<GuestDraft>(blankGuest);

  const save = useAdminMutation(
    () => {
      const body = { name: d.name, phone: d.phone || null, email: d.email || null, idNumber: d.idNumber || null };
      return editing === 'new' ? api('/guests', { method: 'POST', body }) : api(`/guests/${(editing as Guest).id}`, { method: 'PUT', body });
    },
    HMS_KEYS,
    () => setEditing(null),
  );
  const remove = useAdminMutation((id: number) => api(`/guests/${id}`, { method: 'DELETE' }), HMS_KEYS);

  const open = (g: Guest | 'new') => { setD(g === 'new' ? blankGuest : { name: g.name, phone: g.phone ?? '', email: g.email ?? '', idNumber: g.idNumber ?? '' }); save.reset(); setEditing(g); };
  const submit = (e: FormEvent) => { e.preventDefault(); save.mutate(undefined); };

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => open('new')}>+ New guest</Button></div>
      <QueryState isLoading={isLoading} error={error} />
      <ErrorNote error={remove.error} />
      {data && (
        <Table head={['Guest', 'Phone', 'Email', 'ID number', '']} empty="No guests yet.">
          {data.map((g) => (
            <tr key={g.id}>
              <Td className="font-medium">{g.name}</Td><Td>{g.phone ?? '—'}</Td><Td>{g.email ?? '—'}</Td><Td>{g.idNumber ?? '—'}</Td>
              <Td className="whitespace-nowrap text-right">
                <Button small variant="ghost" onClick={() => open(g)}>Edit</Button>
                <Button small variant="ghost" className="!text-red-600" onClick={() => confirmDelete(g.name) && remove.mutate(g.id)}>Delete</Button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New guest' : 'Edit guest'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name"><Input required minLength={2} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field label="Phone"><Input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} /></Field>
          <Field label="Email"><Input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></Field>
          <Field label="ID / passport number"><Input value={d.idNumber} onChange={(e) => setD({ ...d, idNumber: e.target.value })} /></Field>
          <ErrorNote error={save.error} />
          <FormActions onCancel={() => setEditing(null)} pending={save.isPending} />
        </form>
      </Modal>
    </>
  );
}
