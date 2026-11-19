import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hoje, somaDias } from './format';
import { montarNotificacoes } from './notificacoes';
import type { Agendamento, Usuario } from './types';

/** Assepsias de amanhã + atrasadas, já agrupadas por técnico e vendedor. */
export async function carregarNotificacoes(sb: SupabaseClient) {
  const amanha = somaDias(hoje(), 1);
  const [{ data: ags }, { data: users }] = await Promise.all([
    sb.from('v_agendamentos').select('*').eq('status', 'agendado').eq('tipo', 'assepsia').lte('data_prevista', amanha).order('data_prevista'),
    sb.from('usuarios').select('*').eq('ativo', true),
  ]);
  const lista = ((ags ?? []) as Agendamento[]).filter((a) => a.data_prevista === amanha || a.dias_para_vencer < 0);
  return { data_referencia: amanha, agendamentos: lista, notificacoes: montarNotificacoes(lista, (users ?? []) as Usuario[]) };
}
