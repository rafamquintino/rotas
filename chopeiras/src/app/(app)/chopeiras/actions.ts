'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { erroMsg, voltar } from '@/lib/flash';
import type { StatusChopeira } from '@/lib/types';

const ficha = (id: string) => `/chopeiras/${id}`;

export async function enviarParaCliente(form: FormData) {
  const id = String(form.get('id'));
  const cliente = String(form.get('cliente_id') ?? '');
  const data = String(form.get('data') ?? '') || null;
  const obs = String(form.get('obs') ?? '') || null;
  if (!cliente) voltar(`${ficha(id)}/enviar`, { erro: 'Escolha o cliente' });
  const sb = await createClient();
  const { error } = await sb.rpc('enviar_para_cliente', { p_chopeira: id, p_cliente: cliente, p_data: data, p_obs: obs });
  if (error) voltar(`${ficha(id)}/enviar`, { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(ficha(id), { ok: 'Chopeira enviada para o cliente. Assepsia e preventiva agendadas.' });
}

export async function devolverAoEstoque(form: FormData) {
  const id = String(form.get('id'));
  const sb = await createClient();
  const { error } = await sb.rpc('devolver_ao_estoque', { p_chopeira: id, p_obs: String(form.get('obs') ?? '') || null });
  if (error) voltar(ficha(id), { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(ficha(id), { ok: 'Chopeira devolvida ao estoque' });
}

export async function alterarStatus(form: FormData) {
  const id = String(form.get('id'));
  const status = String(form.get('status')) as StatusChopeira;
  const sb = await createClient();
  const { error } = await sb.rpc('alterar_status_chopeira', { p_chopeira: id, p_status: status, p_obs: String(form.get('obs') ?? '') || null });
  if (error) voltar(ficha(id), { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(ficha(id), { ok: 'Status atualizado' });
}

export async function salvarObservacoes(form: FormData) {
  const id = String(form.get('id'));
  const sb = await createClient();
  const { error } = await sb.from('chopeiras').update({ observacoes: String(form.get('observacoes') ?? '') || null }).eq('id', id);
  if (error) voltar(ficha(id), { erro: erroMsg(error) });
  voltar(ficha(id), { ok: 'Observações salvas' });
}

/** Foto já enviada ao Storage pelo navegador (comprimida); aqui só registramos o caminho. */
export async function registrarFoto(id: string, caminho: string) {
  const sb = await createClient();
  const { data } = await sb.from('chopeiras').select('fotos').eq('id', id).single();
  const { error } = await sb.from('chopeiras').update({ fotos: [...(data?.fotos ?? []), caminho] }).eq('id', id);
  if (error) return { erro: erroMsg(error) };
  revalidatePath(ficha(id));
  return { ok: true };
}

export async function salvarChopeira(form: FormData) {
  const id = String(form.get('id') ?? '');
  const num = (k: string) => (form.get(k) ? Number(form.get(k)) : null);
  const dados = {
    numero_serie: String(form.get('numero_serie') ?? '').trim() || null,
    modelo_id: String(form.get('modelo_id') ?? '') || null,
    marca: String(form.get('marca')),
    voltagem: String(form.get('voltagem')),
    vias: num('vias'),
    capacidade_lph: num('capacidade_lph'),
    observacoes: String(form.get('observacoes') ?? '') || null,
    ...(form.get('codigo') ? { codigo: String(form.get('codigo')).trim().toUpperCase() } : {}),
  };
  const sb = await createClient();
  const r = id
    ? await sb.from('chopeiras').update(dados).eq('id', id).select('id').single()
    : await sb.from('chopeiras').insert(dados).select('id').single();
  if (r.error) voltar(id ? `${ficha(id)}/editar` : '/cadastros/chopeiras/nova', { erro: erroMsg(r.error) });
  revalidatePath('/', 'layout');
  voltar(ficha(r.data!.id), { ok: id ? 'Chopeira atualizada' : 'Chopeira cadastrada' });
}

export async function inativarChopeira(form: FormData) {
  const id = String(form.get('id'));
  const ativo = form.get('ativo') === 'true';
  const sb = await createClient();
  const { data: ch } = await sb.from('chopeiras').select('status').eq('id', id).single();
  if (!ativo && ch?.status === 'em_cliente') voltar(ficha(id), { erro: 'Recolha a chopeira do cliente antes de inativar' });
  const { error } = await sb.from('chopeiras').update({ ativo }).eq('id', id);
  if (error) voltar(ficha(id), { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(ficha(id), { ok: ativo ? 'Chopeira reativada' : 'Chopeira inativada' });
}

export async function excluirChopeira(form: FormData) {
  const id = String(form.get('id'));
  const sb = await createClient();
  const { error } = await sb.from('chopeiras').delete().eq('id', id);
  if (error) voltar(ficha(id), { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar('/chopeiras', { ok: 'Chopeira excluída' });
}
