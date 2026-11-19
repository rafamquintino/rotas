import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/** URLs assinadas (1h) para fotos do bucket privado. */
export async function urlsAssinadas(sb: SupabaseClient, caminhos: string[]): Promise<Record<string, string>> {
  const lista = caminhos.filter(Boolean);
  if (!lista.length) return {};
  const { data } = await sb.storage.from('fotos').createSignedUrls(lista, 3600);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl as string]));
}
