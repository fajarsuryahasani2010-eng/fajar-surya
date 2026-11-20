import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AppConfig } from '../types';

const TOKEN_STORAGE_KEY = 'smk_prima_unggul_token';

let cachedSupabase: SupabaseClient | null = null;

export function getSupabaseClient(url?: string | null, anonKey?: string | null): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!cachedSupabase) {
    cachedSupabase = createClient(url, anonKey);
  }
  return cachedSupabase;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || `Permintaan gagal (${response.status})`);
  }
  return payload as T;
}

export async function fetchAppConfig(): Promise<AppConfig> {
  return apiFetch<AppConfig>('/api/config');
}
