'use client';
import { createBrowserClient } from '@supabase/ssr';
import { COOKIE_SESSAO, urlNavegador } from './config';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      urlNavegador(),
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookieOptions: COOKIE_SESSAO },
    );
  }
  return client;
}
