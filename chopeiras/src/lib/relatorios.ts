import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Aluguel, Chopeira, Cliente, Servico } from './types';

export async function dadosRelatorio(sb: SupabaseClient, de: string, ate: string) {
  const [{ data: servs }, { data: clientes }, { data: chs }, { data: alugs }] = await Promise.all([
    sb.from('v_servicos').select('*').gte('realizado_em', `${de}T00:00:00-03:00`).lte('realizado_em', `${ate}T23:59:59-03:00`).order('realizado_em', { ascending: false }).limit(5000),
    sb.from('v_clientes').select('*').eq('ativo', true).gt('dias_atraso', 0).order('dias_atraso', { ascending: false }).limit(50),
    sb.from('chopeiras').select('status, marca, voltagem, vias').eq('ativo', true),
    sb.from('v_alugueis').select('*').gte('data_saida', de).lte('data_saida', ate).neq('status', 'cancelado').order('data_saida', { ascending: false }),
  ]);
  const servicos = (servs ?? []) as Servico[];
  const agrupar = (chave: (s: Servico) => string) => {
    const m = new Map<string, { nome: string; assepsia: number; manutencao_preventiva: number; manutencao_corretiva: number; limpeza: number; total: number }>();
    for (const s of servicos) {
      const k = chave(s) || '—';
      const r = m.get(k) ?? { nome: k, assepsia: 0, manutencao_preventiva: 0, manutencao_corretiva: 0, limpeza: 0, total: 0 };
      r[s.tipo]++;
      r.total++;
      m.set(k, r);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  };
  const frota = ((chs ?? []) as Pick<Chopeira, 'status' | 'marca' | 'voltagem' | 'vias'>[]).filter((c) => c.status !== 'baixada');
  const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
  const ocupacao = (lista: typeof frota) => pct(lista.filter((c) => c.status === 'em_cliente' || c.status === 'em_aluguel').length, lista.length);
  const porMarca = ['Gorillaz', 'Gonçalves'].map((m) => {
    const l = frota.filter((c) => c.marca === m);
    return { nome: m, total: l.length, em_cliente: l.filter((c) => c.status === 'em_cliente' || c.status === 'em_aluguel').length, taxa: ocupacao(l) };
  });
  return {
    servicos,
    porTecnico: agrupar((s) => s.tecnico_nome ?? ''),
    porCidade: agrupar((s) => s.cidade ?? (s.tipo === 'limpeza' ? 'Base (limpeza)' : '')),
    porVendedor: agrupar((s) => s.vendedor_nome ?? (s.tipo === 'limpeza' ? 'Limpeza (sem cliente)' : 'Sem vendedor')),
    alugueis: (alugs ?? []) as Aluguel[],
    atrasados: (clientes ?? []) as Cliente[],
    ocupacao: {
      total: frota.length,
      em_cliente: frota.filter((c) => c.status === 'em_cliente' || c.status === 'em_aluguel').length,
      taxa: ocupacao(frota),
      alocacao: pct(frota.filter((c) => c.status === 'em_cliente').length, frota.length),
      aluguel: pct(frota.filter((c) => c.status === 'em_aluguel').length, frota.length),
      qtdAlocacao: frota.filter((c) => c.status === 'em_cliente').length,
      qtdAluguel: frota.filter((c) => c.status === 'em_aluguel').length,
      porMarca,
    },
  };
}
