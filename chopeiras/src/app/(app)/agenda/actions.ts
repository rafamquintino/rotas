'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { erroMsg, voltar } from '@/lib/flash';

export async function solicitarAssepsia(form: FormData) {
  const cliente = String(form.get('cliente_id'));
  const data = String(form.get('data'));
  const chopeira = String(form.get('chopeira_id') ?? '') || null;
  const obs = String(form.get('obs') ?? '') || null;
  const u = await getUsuario();
  const sb = await createClient();
  const tipo = String(form.get('tipo') ?? 'assepsia');
  const { error } = u.perfil === 'vendedor' || tipo === 'assepsia'
    ? await sb.rpc('solicitar_assepsia', { p_cliente: cliente, p_data: data, p_chopeira: chopeira, p_obs: obs })
    : await sb.from('agendamentos').insert({ cliente_id: cliente, chopeira_id: chopeira, tipo, data_prevista: data, observacoes: obs });
  if (error) voltar(`/agenda/nova?cliente=${cliente}&data=${data}`, { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(`/clientes/${cliente}`, { ok: 'Agendado! O técnico verá na agenda.' });
}

function volta(form: FormData) {
  return String(form.get('voltar') ?? '/agenda');
}

export async function cancelarAgendamento(form: FormData) {
  const sb = await createClient();
  const { error } = await sb.from('agendamentos').update({ status: 'cancelado' }).eq('id', String(form.get('id')));
  if (error) voltar(volta(form), { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(volta(form), { ok: 'Agendamento cancelado' });
}

export async function remarcar(form: FormData) {
  const data = String(form.get('data') ?? '');
  if (!data) voltar(volta(form), { erro: 'Informe a nova data' });
  const sb = await createClient();
  const { error } = await sb.from('agendamentos').update({ data_prevista: data }).eq('id', String(form.get('id')));
  if (error) voltar(volta(form), { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(volta(form), { ok: 'Agendamento remarcado' });
}

export async function atribuirTecnico(form: FormData) {
  const sb = await createClient();
  const tec = String(form.get('tecnico_id') ?? '') || null;
  const { error } = await sb.from('agendamentos').update({ tecnico_id: tec }).eq('id', String(form.get('id')));
  if (error) voltar(volta(form), { erro: erroMsg(error) });
  revalidatePath('/agenda');
  voltar(volta(form), { ok: 'Técnico definido' });
}
