'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { errorMessage } from '@/lib/api';
import { pretty } from '@/lib/format';

export const inputCls =
  'w-full rounded-lg border border-espresso-800/20 bg-white px-3 py-2 text-sm text-espresso-900 outline-none transition focus:border-caramel-500 focus:ring-2 focus:ring-caramel-400/30 disabled:bg-cream-100';

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${inputCls} ${p.className ?? ''}`} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea rows={3} {...p} className={`${inputCls} ${p.className ?? ''}`} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`${inputCls} ${p.className ?? ''}`} />;

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-espresso-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-espresso-600/70">{hint}</span>}
    </label>
  );
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-espresso-800 text-cream-50 hover:bg-espresso-700',
  secondary: 'border border-espresso-800/20 bg-white text-espresso-800 hover:bg-cream-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-espresso-700 hover:bg-espresso-800/5',
};

export function Button({ variant = 'primary', small, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${small ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'} ${variants[variant]} ${className}`}
    />
  );
}

const tones: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  blue: 'bg-sky-100 text-sky-800',
  gray: 'bg-stone-200 text-stone-700',
};

const STATUS_TONE: Record<string, string> = {
  PENDING: 'amber', PREPARING: 'blue', READY: 'blue', COMPLETED: 'green', CANCELLED: 'gray',
  ORDERED: 'amber', RECEIVED: 'green',
  AVAILABLE: 'green', OCCUPIED: 'blue', CLEANING: 'amber', MAINTENANCE: 'red',
  RESERVED: 'amber', CHECKED_IN: 'blue', CHECKED_OUT: 'green',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'gray'}>{pretty(status)}</Badge>;
}

export function Badge({ tone = 'gray', children }: { tone?: string; children: ReactNode }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone] ?? tones.gray}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-espresso-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-espresso-600">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-espresso-800/10 bg-white shadow-sm ${className}`}>{children}</div>
);

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-espresso-800/10 bg-cream-50 text-xs uppercase tracking-wider text-espresso-600">
          <tr>{head.map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-espresso-800/5">{children}</tbody>
      </table>
      {!hasRows && <p className="px-4 py-10 text-center text-sm text-espresso-600">{empty ?? 'Nothing here yet.'}</p>}
    </Card>
  );
}

export const Td = ({ children, className = '' }: { children?: ReactNode; className?: string }) => <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-6 flex gap-1 rounded-xl bg-espresso-800/5 p-1" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${value === t.id ? 'bg-white text-espresso-900 shadow-sm' : 'text-espresso-600 hover:text-espresso-900'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-espresso-950/50 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`my-8 w-full rounded-2xl bg-white p-6 shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-espresso-900">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-espresso-600 hover:text-espresso-900">×</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const ErrorNote = ({ error }: { error: unknown }) =>
  error ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(error)}</p> : null;

export const Loading = () => <p className="py-10 text-center text-sm text-espresso-600">Loading…</p>;

export function QueryState({ isLoading, error }: { isLoading: boolean; error: unknown }) {
  if (isLoading) return <Loading />;
  if (error) return <ErrorNote error={error} />;
  return null;
}

export const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <Card className="p-5">
    <p className="text-xs font-semibold uppercase tracking-wider text-espresso-600">{label}</p>
    <p className="mt-2 font-display text-3xl font-semibold text-espresso-900">{value}</p>
    {hint && <p className="mt-1 text-xs text-espresso-600/80">{hint}</p>}
  </Card>
);

export function FormActions({ onCancel, pending, label = 'Save' }: { onCancel: () => void; pending: boolean; label?: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : label}</Button>
    </div>
  );
}
