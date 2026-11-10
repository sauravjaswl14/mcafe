'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/format';
import type { Order } from '@/lib/types';

const field =
  'w-full rounded-lg border border-white/10 bg-espresso-900 px-3 py-2 text-sm text-cream-50 outline-none placeholder:text-cream-300/50 focus:border-caramel-400';

export function CartDrawer() {
  const { items, total, open, setOpen, setQty, clear } = useCart();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [placed, setPlaced] = useState<Order | null>(null);

  const hasOffline = items.some((i) => i.offline);

  const place = useMutation({
    mutationFn: () =>
      api<Order>('/orders', {
        method: 'POST',
        body: {
          type: 'ONLINE',
          customerName: name,
          customerPhone: phone || undefined,
          notes: notes || undefined,
          items: items.map((i) => (i.kind === 'variant' ? { variantId: i.id, quantity: i.quantity } : { menuItemId: i.id, quantity: i.quantity })),
        },
      }),
    onSuccess: (order) => {
      setPlaced(order);
      clear();
      setNotes('');
      qc.invalidateQueries({ queryKey: ['products'] }); // stock changed
    },
  });

  const close = () => {
    setOpen(false);
    setTimeout(() => {
      setPlaced(null);
      place.reset();
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-label="Shopping cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 36 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-espresso-800 text-cream-100 shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <h2 className="font-display text-2xl font-semibold text-cream-50">{placed ? 'Order placed' : 'Your cart'}</h2>
              <button onClick={close} aria-label="Close cart" className="text-2xl leading-none text-cream-300 hover:text-cream-50">×</button>
            </header>

            {placed ? (
              <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }} className="flex h-16 w-16 items-center justify-center rounded-full bg-caramel-400 text-3xl text-espresso-950">✓</motion.div>
                <p className="mt-6 font-display text-2xl text-cream-50">Thank you, {placed.customerName}!</p>
                <p className="mt-2 text-cream-200">Order #{placed.id} · {money(placed.total)}</p>
                <p className="mt-1 text-sm text-cream-300">We&apos;ll have it ready shortly.</p>
                <button onClick={close} className="mt-8 rounded-full bg-caramel-400 px-6 py-2 font-semibold text-espresso-950">Keep browsing</button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-8 text-center text-cream-300">Your cart is empty. Add some coffee ☕</div>
            ) : (
              <>
                <ul data-lenis-prevent className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  <AnimatePresence initial={false}>
                    {items.map((i) => (
                      <motion.li key={i.key} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-cream-50">{i.name}</p>
                          {i.detail && <p className="text-xs text-cream-300">{i.detail}</p>}
                          <p className="mt-1 text-sm text-caramel-300">{money(i.price)}</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border border-white/10 px-1 py-1">
                          <button onClick={() => setQty(i.key, i.quantity - 1)} className="h-6 w-6 rounded-full hover:bg-white/10" aria-label="Decrease">−</button>
                          <span className="w-5 text-center text-sm">{i.quantity}</span>
                          <button onClick={() => setQty(i.key, i.quantity + 1)} className="h-6 w-6 rounded-full hover:bg-white/10" aria-label="Increase">+</button>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    place.mutate();
                  }}
                  className="space-y-3 border-t border-white/10 px-6 py-5"
                >
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className={field} />
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes: grind size, allergies…" rows={2} className={field} />

                  {hasOffline && <p className="rounded-lg bg-caramel-400/10 p-3 text-xs text-caramel-300">The server isn&apos;t reachable, so ordering is disabled. Start the API and refresh.</p>}
                  {place.error && <p className="rounded-lg bg-red-500/10 p-3 text-xs text-red-300">{errorMessage(place.error)}</p>}

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-cream-200">Total</span>
                    <span className="font-display text-2xl font-semibold text-cream-50">{money(total)}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={place.isPending || hasOffline}
                    className="w-full rounded-full bg-caramel-400 py-3 font-semibold text-espresso-950 transition hover:bg-caramel-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {place.isPending ? 'Placing order…' : 'Place order'}
                  </button>
                  <p className="text-center text-xs text-cream-300">Pay when you pick up.</p>
                </form>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
