const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string[],
  ) {
    super(message);
  }
}

interface Init {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export async function api<T>(path: string, init: Init = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(BASE + path, {
    method: init.method ?? 'GET',
    credentials: 'include', // httpOnly session cookie
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as { error?: string; details?: string[] } | null;
  if (!res.ok) throw new ApiError(res.status, data?.error ?? res.statusText, data?.details);
  return data as T;
}

/** Friendly message from any thrown value (also covers "API not running"). */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return [e.message, ...(e.details ?? [])].join(' · ');
  if (e instanceof TypeError) return 'Cannot reach the server. Is the API running?';
  return e instanceof Error ? e.message : 'Something went wrong';
}
