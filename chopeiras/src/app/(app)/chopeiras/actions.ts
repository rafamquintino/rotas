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
  const { data, error } = await sb.rpc('devolver_ao_estoque', { p_chopeira: id, p_obs: String(form.get('obs') ?? '') || null });
  if (error) voltar(ficha(id), { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(ficha(id), {
    ok: data?.status === 'em_limpeza'
      ? 'Voltou do aluguel: a chopeira está em limpeza e fica disponível quando o técnico apontar "Pronta"'
      : 'Chopeira devolvida ao estoque',
  });
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
  if ((data?.fotos ?? []).length >= 5) return { erro: 'A chopeira já tem 5 fotos. Remova uma para adicionar outra.' };
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
    patrimonio: String(form.get('patrimonio') ?? '').trim() || null,
    condicao: String(form.get('condicao') ?? '') || null,
    ...(!id ? { fotos: form.getAll('fotos').map(String).filter(Boolean).slice(0, 5) } : {}),
  };
  if (dados.patrimonio && !/^\d{4}$/.test(dados.patrimonio)) {
    voltar(id ? `${ficha(id)}/editar` : '/cadastros/chopeiras/nova', { erro: 'O patrimônio deve ter 4 números (ex.: 0878)' });
  }
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
  if (!ativo && ch?.status === 'em_aluguel') voltar(ficha(id), { erro: 'Registre a volta do aluguel antes de inativar' });
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

export async function removerFoto(form: FormData) {
  const id = String(form.get('id'));
  const caminho = String(form.get('caminho'));
  const sb = await createClient();
  const { data } = await sb.from('chopeiras').select('fotos').eq('id', id).single();
  const { error } = await sb.from('chopeiras').update({ fotos: (data?.fotos ?? []).filter((f: string) => f !== caminho) }).eq('id', id);
  if (error) voltar(ficha(id), { erro: erroMsg(error) });
  revalidatePath(ficha(id));
  voltar(ficha(id), { ok: 'Foto removida' });
}

/** Patrimônio e condição: gestor e técnico (quem cola as etiquetas). */
export async function salvarEtiqueta(form: FormData) {
  const id = String(form.get('id'));
  const patrimonio = String(form.get('patrimonio') ?? '').trim() || null;
  if (patrimonio && !/^\d{4}$/.test(patrimonio)) voltar(ficha(id), { erro: 'O patrimônio deve ter 4 números (ex.: 0878)' });
  const sb = await createClient();
  const { error } = await sb.from('chopeiras')
    .update({ patrimonio, condicao: String(form.get('condicao') ?? '') || null })
    .eq('id', id);
  if (error) voltar(ficha(id), { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(ficha(id), { ok: 'Patrimônio e condição salvos' });
}

export async function alugar(form: FormData) {
  const id = String(form.get('id'));
  const saida = String(form.get('saida') ?? '');
  const volta = String(form.get('volta') ?? '');
  const sb = await createClient();
  const { data, error } = await sb.rpc('alugar_chopeira', {
    p_chopeira: id, p_saida: saida, p_volta: volta, p_obs: String(form.get('obs') ?? '') || null,
  });
  if (error) voltar(`${ficha(id)}/alugar?saida=${saida}&volta=${volta}`, { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(ficha(id), {
    ok: data?.status === 'em_andamento' ? 'Chopeira saiu para aluguel' : 'Reserva para o evento registrada',
  });
}

export async function cancelarAluguel(form: FormData) {
  const id = String(form.get('id'));
  const sb = await createClient();
  const { error } = await sb.rpc('cancelar_aluguel', { p_aluguel: String(form.get('aluguel')) });
  if (error) voltar(ficha(id), { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(ficha(id), { ok: 'Reserva cancelada' });
}

export async function concluirLimpeza(form: FormData) {
  const id = String(form.get('id'));
  const pronta = form.get('resultado') !== 'defeito';
  const itens = form.getAll('item').map(String);
  const marcados = new Set(form.getAll('ok').map(String));
  const sb = await createClient();
  const { error } = await sb.rpc('concluir_limpeza', {
    p_chopeira: id,
    p_checklist: itens.map((item) => ({ item, ok: marcados.has(item) })),
    p_obs: String(form.get('obs') ?? '') || null,
    p_pronta: pronta,
  });
  if (error) voltar(`${ficha(id)}/limpeza`, { erro: erroMsg(error) });
  revalidatePath('/', 'layout');
  voltar(form.get('voltar') ? String(form.get('voltar')) : ficha(id), {
    ok: pronta ? 'Limpeza registrada: chopeira disponível' : 'Chopeira enviada para manutenção',
  });
}
