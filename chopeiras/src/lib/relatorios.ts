import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Chopeira, Cliente, Servico } from './types';

export async function dadosRelatorio(sb: SupabaseClient, de: string, ate: string) {
  const [{ data: servs }, { data: clientes }, { data: chs }] = await Promise.all([
    sb.from('v_servicos').select('*').gte('realizado_em', `${de}T00:00:00-03:00`).lte('realizado_em', `${ate}T23:59:59-03:00`).order('realizado_em', { ascending: false }).limit(5000),
    sb.from('v_clientes').select('*').eq('ativo', true).gt('dias_atraso', 0).order('dias_atraso', { ascending: false }).limit(50),
    sb.from('chopeiras').select('status, marca, voltagem, vias').eq('ativo', true),
  ]);
  const servicos = (servs ?? []) as Servico[];
  const agrupar = (chave: (s: Servico) => string) => {
    const m = new Map<string, { nome: string; assepsia: number; manutencao_preventiva: number; manutencao_corretiva: number; total: number }>();
    for (const s of servicos) {
      const k = chave(s) || '—';
      const r = m.get(k) ?? { nome: k, assepsia: 0, manutencao_preventiva: 0, manutencao_corretiva: 0, total: 0 };
      r[s.tipo]++;
      r.total++;
      m.set(k, r);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  };
  const frota = ((chs ?? []) as Pick<Chopeira, 'status' | 'marca' | 'voltagem' | 'vias'>[]).filter((c) => c.status !== 'baixada');
  const ocupacao = (lista: typeof frota) => (lista.length ? Math.round((lista.filter((c) => c.status === 'em_cliente').length / lista.length) * 100) : 0);
  const porMarca = ['Gorillaz', 'Gonçalves'].map((m) => {
    const l = frota.filter((c) => c.marca === m);
    return { nome: m, total: l.length, em_cliente: l.filter((c) => c.status === 'em_cliente').length, taxa: ocupacao(l) };
  });
  return {
    servicos,
    porTecnico: agrupar((s) => s.tecnico_nome ?? ''),
    porCidade: agrupar((s) => s.cidade ?? ''),
    porVendedor: agrupar((s) => s.vendedor_nome ?? 'Sem vendedor'),
    atrasados: (clientes ?? []) as Cliente[],
    ocupacao: { total: frota.length, em_cliente: frota.filter((c) => c.status === 'em_cliente').length, taxa: ocupacao(frota), porMarca },
  };
}
