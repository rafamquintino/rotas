import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Perfil, Usuario } from './types';

/** Lê o "sub" do token da sessão sem ir à rede. */
function subDoToken(token?: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token!.split('.')[1], 'base64url').toString());
    return payload.exp * 1000 > Date.now() ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Usuário logado + perfil (cacheado por requisição).
 * O token já foi validado pelo middleware nesta mesma requisição e o banco valida de novo em cada
 * consulta (RLS), então aqui não repetimos a ida ao servidor de autenticação.
 */
export const getUsuario = cache(async (): Promise<Usuario> => {
  const supabase = await createClient();
  const { data: s } = await supabase.auth.getSession();
  const uid = subDoToken(s.session?.access_token);
  if (!uid) redirect('/login');
  const { data } = await supabase.from('usuarios').select('*').eq('id', uid).single();
  if (!data || !data.ativo) redirect('/login?erro=inativo');
  return data as Usuario;
});

export async function exigirPerfil(...perfis: Perfil[]) {
  const u = await getUsuario();
  if (!perfis.includes(u.perfil)) redirect('/?erro=' + encodeURIComponent('Acesso restrito ao seu perfil'));
  return u;
}
