import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Perfil, Usuario } from './types';

/** Usuário logado + perfil (cacheado por requisição). */
export const getUsuario = cache(async (): Promise<Usuario> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
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
