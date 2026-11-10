'use client';

import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from './api';
import { fallbackMenu, fallbackProducts } from './fallback';
import type { MenuCategory, Product, User } from './types';

/**
 * Fetch from the API; if it is unreachable (or the DB is still empty) fall back to
 * the shared catalog so the storefront always has something to show.
 */
async function withFallback<T>(path: string, fallback: T[]): Promise<{ items: T[]; offline: boolean }> {
  try {
    const items = await api<T[]>(path);
    if (items.length) return { items, offline: false };
    return { items: fallback, offline: true };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return { items: fallback, offline: true };
  }
}

export const useProducts = () =>
  useQuery({ queryKey: ['products'], queryFn: () => withFallback<Product>('/products', fallbackProducts) });

export const useMenu = () =>
  useQuery({ queryKey: ['menu'], queryFn: () => withFallback<MenuCategory>('/menu', fallbackMenu) });

export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    retry: false,
    staleTime: 60_000,
    queryFn: async (): Promise<User | null> => {
      try {
        return (await api<{ user: User }>('/auth/me')).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
  });
