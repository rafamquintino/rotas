'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function entrar(_: unknown, form: FormData) {
  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');
  if (!email || !senha) return { erro: 'Preencha e-mail e senha.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: 'E-mail ou senha incorretos.' };
  redirect('/');
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function recuperarSenha(_: unknown, form: FormData) {
  const email = String(form.get('email') ?? '').trim();
  if (!email) return { erro: 'Informe o e-mail.' };
  const supabase = await createClient();
  const h = await headers();
  const origem = h.get('origin') ?? `https://${h.get('host')}`;
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origem}/auth/callback?next=/mais/senha` });
  return { ok: 'Se o e-mail estiver cadastrado, você receberá o link para trocar a senha.' };
}
