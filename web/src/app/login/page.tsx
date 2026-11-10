'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cafe } from '@shared/catalog';
import { api, errorMessage } from '@/lib/api';
import type { User } from '@/lib/types';

const field =
  'w-full rounded-lg border border-white/10 bg-espresso-900 px-4 py-3 text-cream-50 outline-none placeholder:text-cream-300/50 focus:border-caramel-400';

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      api<{ user: User }>(mode === 'login' ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: mode === 'login' ? { email, password } : { name, email, password },
      }),
    onSuccess: ({ user }) => {
      qc.setQueryData(['me'], user);
      const next = new URLSearchParams(window.location.search).get('next');
      // Only admins go to the dashboard; the API enforces this regardless of the URL
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      router.replace(user.role === 'ADMIN' ? (safeNext ?? '/admin') : '/');
    },
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#3b2619,#120b07_70%)] px-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-espresso-800/80 p-8 backdrop-blur"
      >
        <Link href="/" className="font-display text-2xl font-semibold text-cream-50">{cafe.name}</Link>
        <h1 className="text-lg text-cream-200">{mode === 'login' ? 'Sign in to your account' : 'Create a customer account'}</h1>

        {mode === 'register' && <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={field} />}
        <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={field} />
        <input required type="password" minLength={mode === 'register' ? 8 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={field} />

        {submit.error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{errorMessage(submit.error)}</p>}

        <button disabled={submit.isPending} className="w-full rounded-full bg-caramel-400 py-3 font-semibold text-espresso-950 hover:bg-caramel-300 disabled:opacity-60">
          {submit.isPending ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <p className="text-center text-sm text-cream-300">
          {mode === 'login' ? 'New here?' : 'Already registered?'}{' '}
          <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); submit.reset(); }} className="text-caramel-300 underline-offset-4 hover:underline">
            {mode === 'login' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
        <p className="text-center text-xs text-cream-300/70">The dashboard is available to administrators only.</p>
      </form>
    </main>
  );
}
