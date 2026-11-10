'use client';

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { api } from './api';

export const useAdminQuery = <T,>(key: QueryKey, path: string) =>
  useQuery({ queryKey: key, queryFn: () => api<T>(path) });

/** Mutation that refreshes the listed query keys after success. */
export function useAdminMutation<V, R = unknown>(fn: (v: V) => Promise<R>, invalidate: QueryKey[], onSuccess?: (r: R) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (r) => {
      await Promise.all(invalidate.map((queryKey) => qc.invalidateQueries({ queryKey })));
      onSuccess?.(r);
    },
  });
}

export const confirmDelete = (what: string) => window.confirm(`Delete ${what}? This can't be undone.`);
