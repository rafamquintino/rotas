import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { Chips, Flash, Selo, Vazio } from '@/components/ui';
import { CONDICAO, fmtData, hoje, STATUS_CHOPEIRA } from '@/lib/format';
import { LerParaFicha } from '@/components/LerParaFicha';
import type { Chopeira, StatusChopeira } from '@/lib/types';

export const metadata = { title: 'Estoque' };

type P = { q?: string; marca?: string; voltagem?: string; vias?: string; status?: string; cidade?: string; inativas?: string; ok?: string; erro?: string };

export default async function Estoque({ searchParams }: { searchParams: Promise<P> }) {
  const sp = await searchParams;
  const u = await getUsuario();
  const sb = await createClient();
  await sb.rpc('sincronizar_alugueis');

  let q = sb.from('v_chopeiras').select('*').order('patrimonio', { ascending: true, nullsFirst: false }).order('codigo').limit(300);
  q = sp.inativas ? q.eq('ativo', false) : q.eq('ativo', true);
  const busca = (sp.q ?? '').replace(/[%,()*]/g, '').trim();
  if (busca) q = q.or(`patrimonio.ilike.%${busca}%,numero_serie.ilike.%${busca}%`);
  if (sp.marca) q = q.eq('marca', sp.marca);
  if (sp.voltagem) q = q.eq('voltagem', sp.voltagem);
  if (sp.vias) q = q.eq('vias', Number(sp.vias));
  if (sp.status === 'reserva') q = q.not('reserva_saida', 'is', null);
  else if (sp.status) q = q.eq('status', sp.status);
  if (sp.cidade) q = q.eq('cliente_cidade', sp.cidade);

  const [{ data }, { data: cidades }] = await Promise.all([
    q,
    sb.from('clientes').select('cidade').eq('ativo', true),
  ]);
  const lista = (data ?? []) as Chopeira[];
  const listaCidades = [...new Set((cidades ?? []).map((c) => c.cidade as string))].sort();
  const params = { ...sp } as Record<string, string | undefined>;

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="titulo flex-1">Estoque de chopeiras</h1>
        {u.perfil === 'gestor' && <Link href="/cadastros/chopeiras/nova" className="btn-primario min-h-[44px] px-3 text-sm">+ Nova</Link>}
      </div>
      <Flash ok={sp.ok} erro={sp.erro} />

      <form className="flex gap-2" action="/chopeiras">
        {Object.entries(sp).filter(([k, v]) => v && !['q', 'ok', 'erro'].includes(k)).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input name="q" defaultValue={sp.q} placeholder="Patrimônio ou nº de série" className="campo" inputMode="search" />
        <button className="btn-secundario px-4">Buscar</button>
        <LerParaFicha />
      </form>

      <div className="flex flex-col gap-2">
        <Chips nome="status" base="/chopeiras" params={params}
          opcoes={[
            ...(['disponivel', 'em_cliente', 'em_aluguel', 'em_limpeza', 'em_manutencao'] as StatusChopeira[]).map((s) => ({ valor: s, label: STATUS_CHOPEIRA[s].label })),
            { valor: 'reserva', label: 'Reservadas p/ evento' },
            ...(['reservada', 'baixada'] as StatusChopeira[]).map((s) => ({ valor: s, label: STATUS_CHOPEIRA[s].label })),
          ]} />
        <Chips nome="marca" base="/chopeiras" params={params} opcoes={[{ valor: 'Gorillaz', label: 'Gorillaz' }, { valor: 'Gonçalves', label: 'Gonçalves' }]} />
        <Chips nome="voltagem" base="/chopeiras" params={params} opcoes={[{ valor: '110V', label: '110V' }, { valor: '220V', label: '220V' }]} />
        <Chips nome="vias" base="/chopeiras" params={params} opcoes={[1, 2, 3].map((v) => ({ valor: String(v), label: `${v} ${v === 1 ? 'via' : 'vias'}` }))} />
        {listaCidades.length > 0 && (
          <Chips nome="cidade" base="/chopeiras" params={params} opcoes={listaCidades.map((c) => ({ valor: c, label: c }))} />
        )}
      </div>

      <p className="text-sm text-suave">
        {lista.length} chopeira(s){' · '}
        <Link className="font-medium text-marca" href={sp.inativas ? '/chopeiras' : '/chopeiras?inativas=1'}>
          {sp.inativas ? 'ver ativas' : 'ver inativas'}
        </Link>
      </p>

      {lista.length === 0 ? (
        <Vazio>Nenhuma chopeira com esses filtros.</Vazio>
      ) : (
        <ul className="flex flex-col gap-2">
          {lista.map((c) => (
            <li key={c.id}>
              <Link href={`/chopeiras/${c.id}`} className="cartao flex items-center gap-3 py-3 active:scale-[0.99]">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-marca/15 text-marca-forte">
                  <span className="text-lg font-bold leading-none">{c.vias}</span>
                  <span className="text-[10px] font-semibold uppercase">vias</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={c.patrimonio ? 'font-bold tracking-wider' : 'text-sm font-semibold text-suave'}>
                      {c.patrimonio ?? 'Sem patrimônio'}
                    </span>
                    <Selo cor={STATUS_CHOPEIRA[c.status].cor}>{STATUS_CHOPEIRA[c.status].label}</Selo>
                    {c.reserva_saida && <Selo cor="marca">Reserva {fmtData(c.reserva_saida).slice(0, 5)}</Selo>}
                    {c.condicao && c.condicao !== 'otima' && c.condicao !== 'boa' && <Selo cor={CONDICAO[c.condicao].cor}>{CONDICAO[c.condicao].label}</Selo>}
                  </div>
                  <div className="truncate text-sm text-suave">
                    {c.marca} · {c.voltagem}
                    {c.capacidade_lph ? ` · ${Number(c.capacidade_lph)} L/h` : ''}
                    {!c.patrimonio && c.numero_serie ? ` · série ${c.numero_serie}` : ''}
                    {c.status === 'em_cliente' && (c.cliente_nome ? ` · ${c.cliente_nome}` : ' · cliente de outra carteira')}
                    {c.status === 'em_aluguel' && c.aluguel_volta && ` · volta ${fmtData(c.aluguel_volta).slice(0, 5)}${c.aluguel_volta < hoje() ? ' (atrasada)' : ''}`}
                  </div>
                </div>
                <span className="text-xl text-suave">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
