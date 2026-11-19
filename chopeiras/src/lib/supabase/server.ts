import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { COOKIE_SESSAO, urlServidor } from './config';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    urlServidor(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: COOKIE_SESSAO,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // chamado de Server Component: o middleware renova a sessão
          }
        },
      },
    },
  );
}
