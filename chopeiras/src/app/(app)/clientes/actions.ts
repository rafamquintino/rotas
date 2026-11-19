'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { erroMsg, voltar } from '@/lib/flash';

export async function salvarCliente(form: FormData) {
  const u = await getUsuario();
  const id = String(form.get('id') ?? '');
  const txt = (k: string) => String(form.get(k) ?? '').trim() || null;
  const dados: Record<string, unknown> = {
    nome: txt('nome'),
    cidade: txt('cidade'),
    endereco: txt('endereco'),
    contato: txt('contato'),
    telefone: txt('telefone'),
    tipo: txt('tipo') ?? 'bar',
    freq_assepsia_dias: Number(form.get('freq_assepsia_dias') || 15),
    freq_manutencao_dias: Number(form.get('freq_manutencao_dias') || 90),
    observacoes: txt('observacoes'),
  };
  // Vendedor só cadastra na própria carteira; gestor escolhe o vendedor
  if (u.perfil === 'gestor') dados.vendedor_id = txt('vendedor_id');
  else if (!id) dados.vendedor_id = u.id;

  const sb = await createClient();
  const r = id
    ? await sb.from('clientes').update(dados).eq('id', id).select('id').single()
    : await sb.from('clientes').insert(dados).select('id').single();
  if (r.error) voltar(id ? `/clientes/${id}/editar` : '/clientes/novo', { erro: erroMsg(r.error) });
  revalidatePath('/', 'layout');
  voltar(`/clientes/${r.data!.id}`, { ok: id ? 'Cliente atualizado' : 'Cliente cadastrado' });
}

export async function inativarCliente(form: FormData) {
  const id = String(form.get('id'));
  const ativo = form.get('ativo') === 'true';
  const sb = await createClient();
  const { error } = await sb.from('clientes').update({ ativo }).eq('id', id);
  if (error) voltar(`/clientes/${id}`, { erro: erroMsg(error) });
  if (!ativo) {
    await sb.from('agendamentos').update({ status: 'cancelado' }).eq('cliente_id', id).eq('status', 'agendado');
  }
  revalidatePath('/', 'layout');
  voltar(`/clientes/${id}`, { ok: ativo ? 'Cliente reativado' : 'Cliente inativado' });
}

export async function excluirCliente(form: FormData) {
  const id = String(form.get('id'));
  const sb = await createClient();
  const { error } = await sb.from('clientes').delete().eq('id', id);
  if (error) voltar(`/clientes/${id}`, { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar('/clientes', { ok: 'Cliente excluído' });
}
