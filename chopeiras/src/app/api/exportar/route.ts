import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { dadosRelatorio } from '@/lib/relatorios';
import { csvResponse, toCsv } from '@/lib/csv';
import { fmtData, hoje, somaDias, STATUS_CHOPEIRA, TIPO_SERVICO } from '@/lib/format';
import type { Servico } from '@/lib/types';

const AGRUPADO = [
  { key: 'nome', label: 'Nome' },
  { key: 'assepsia', label: 'Assepsias' },
  { key: 'manutencao_preventiva', label: 'Preventivas' },
  { key: 'manutencao_corretiva', label: 'Corretivas' },
  { key: 'total', label: 'Total' },
];

export async function GET(req: NextRequest) {
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  if (!claims?.claims) return NextResponse.json({ erro: 'não autenticado' }, { status: 401 });
  const { data: me } = await sb.from('usuarios').select('perfil').eq('id', claims.claims.sub).single();
  if (me?.perfil !== 'gestor') return NextResponse.json({ erro: 'apenas gestor' }, { status: 403 });

  const p = req.nextUrl.searchParams;
  const tipo = p.get('tipo') ?? 'servicos';
  const ate = p.get('ate') ?? hoje();
  const de = p.get('de') ?? somaDias(ate, -30);

  if (tipo === 'chopeiras') {
    const { data } = await sb.from('v_chopeiras').select('*').order('codigo');
    const rows = (data ?? []).map((c) => ({ ...c, status: STATUS_CHOPEIRA[c.status as keyof typeof STATUS_CHOPEIRA].label, data_entrada_cliente: fmtData(c.data_entrada_cliente), ativo: c.ativo ? 'sim' : 'não' }));
    return csvResponse('chopeiras.csv', toCsv(rows, [
      { key: 'codigo', label: 'Código' }, { key: 'numero_serie', label: 'Nº série' }, { key: 'marca', label: 'Marca' },
      { key: 'voltagem', label: 'Voltagem' }, { key: 'vias', label: 'Vias' }, { key: 'capacidade_lph', label: 'Capacidade L/h' },
      { key: 'status', label: 'Status' }, { key: 'cliente_nome', label: 'Cliente' }, { key: 'cliente_cidade', label: 'Cidade' },
      { key: 'data_entrada_cliente', label: 'Entrada no cliente' }, { key: 'ativo', label: 'Ativa' },
    ]));
  }

  const r = await dadosRelatorio(sb, de, ate);
  switch (tipo) {
    case 'por_tecnico': return csvResponse(`servicos-por-tecnico_${de}_${ate}.csv`, toCsv(r.porTecnico, AGRUPADO));
    case 'por_cidade': return csvResponse(`servicos-por-cidade_${de}_${ate}.csv`, toCsv(r.porCidade, AGRUPADO));
    case 'por_vendedor': return csvResponse(`servicos-por-vendedor_${de}_${ate}.csv`, toCsv(r.porVendedor, AGRUPADO));
    case 'atrasados':
      return csvResponse('clientes-atrasados.csv', toCsv(r.atrasados as unknown as Record<string, unknown>[], [
        { key: 'nome', label: 'Cliente' }, { key: 'cidade', label: 'Cidade' }, { key: 'vendedor_nome', label: 'Vendedor' },
        { key: 'dias_atraso', label: 'Dias de atraso' }, { key: 'proxima_assepsia', label: 'Assepsia prevista' },
        { key: 'proxima_preventiva', label: 'Preventiva prevista' }, { key: 'telefone', label: 'Telefone' },
      ]));
    default: {
      const rows = r.servicos.map((s: Servico) => ({
        ...s,
        realizado_em: fmtData(s.realizado_em, true),
        tipo: TIPO_SERVICO[s.tipo].label,
        checklist_ok: `${s.checklist.filter((c) => c.ok).length}/${s.checklist.length}`,
        fotos: s.fotos_antes.length + s.fotos_depois.length,
      }));
      return csvResponse(`servicos_${de}_${ate}.csv`, toCsv(rows, [
        { key: 'realizado_em', label: 'Data' }, { key: 'tipo', label: 'Tipo' }, { key: 'cliente_nome', label: 'Cliente' },
        { key: 'cidade', label: 'Cidade' }, { key: 'chopeira_codigo', label: 'Chopeira' }, { key: 'tecnico_nome', label: 'Técnico' },
        { key: 'vendedor_nome', label: 'Vendedor' }, { key: 'checklist_ok', label: 'Checklist' }, { key: 'fotos', label: 'Fotos' },
        { key: 'aceite_nome', label: 'Aceite' }, { key: 'observacoes', label: 'Observações' },
      ]));
    }
  }
}
