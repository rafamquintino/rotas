import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { Chips, Flash, Selo, Vazio } from '@/components/ui';
import { fmtData, fmtDiaSemana, hoje, mapsUrl, relativoDias, somaDias, STATUS_AGENDAMENTO, TIPO_SERVICO } from '@/lib/format';
import type { Agendamento } from '@/lib/types';
import { cancelarAgendamento, remarcar } from './actions';
import { BotaoEnviar } from '@/components/Botoes';
import { GuardarOffline } from '@/components/GuardarOffline';

export const metadata = { title: 'Agenda' };
export const dynamic = 'force-dynamic';

type P = { vista?: string; data?: string; tipo?: string; cidade?: string; meus?: string; ok?: string; erro?: string };

function segunda(iso: string) {
  const d = new Date(iso + 'T12:00:00Z');
  const dia = (d.getUTCDay() + 6) % 7;
  return somaDias(iso, -dia);
}

export default async function Agenda({ searchParams }: { searchParams: Promise<P> }) {
  const sp = await searchParams;
  const u = await getUsuario();
  const sb = await createClient();
  const vista = sp.vista ?? 'dia';
  const hj = hoje();
  const data = sp.data && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : hj;

  let ini = data, fim = data;
  if (vista === 'semana') { ini = segunda(data); fim = somaDias(ini, 6); }

  let q = sb.from('v_agendamentos').select('*').order('cidade').order('data_prevista').limit(500);
  if (vista === 'lista') {
    q = q.eq('status', 'agendado');
  } else {
    // No dia de hoje, os atrasados aparecem junto para entrar na rota
    q = ini === hj || (vista === 'semana' && ini <= hj && hj <= fim)
      ? q.or(`and(data_prevista.gte.${ini},data_prevista.lte.${fim}),and(status.eq.agendado,data_prevista.lt.${hj})`)
      : q.gte('data_prevista', ini).lte('data_prevista', fim);
    q = q.neq('status', 'cancelado');
  }
  if (sp.tipo) q = q.eq('tipo', sp.tipo);
  if (sp.cidade) q = q.eq('cidade', sp.cidade);
  if (sp.meus && u.perfil === 'tecnico') q = q.or(`tecnico_id.eq.${u.id},tecnico_id.is.null`);

  const { data: rows } = await q;
  const ags = (rows ?? []) as Agendamento[];
  const cidades = [...new Set(ags.map((a) => a.cidade))].sort();
  const params = { ...sp } as Record<string, string | undefined>;
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    Object.entries({ ...sp, ...extra }).forEach(([k, v]) => v && k !== 'ok' && k !== 'erro' && p.set(k, v));
    return `/agenda?${p}`;
  };
  const passo = vista === 'semana' ? 7 : 1;
  const voltarUrl = qs({});

  // Agrupamento: semana → por dia e cidade; dia/lista → por cidade
  const grupos: { titulo: string; sub?: string; itens: Agendamento[] }[] = [];
  if (vista === 'semana') {
    const atrasados = ags.filter((a) => a.data_prevista < ini && a.status === 'agendado');
    if (atrasados.length) grupos.push({ titulo: 'Atrasados', itens: atrasados });
    for (let i = 0; i < 7; i++) {
      const d = somaDias(ini, i);
      const doDia = ags.filter((a) => a.data_prevista === d);
      if (doDia.length) grupos.push({ titulo: fmtDiaSemana(d), sub: d === hj ? 'hoje' : undefined, itens: doDia });
    }
  } else {
    for (const c of cidades) grupos.push({ titulo: c, itens: ags.filter((a) => a.cidade === c) });
  }

  // Técnico: guarda no aparelho as telas da rota de hoje (abrem mesmo sem sinal)
  const rotaHoje = u.perfil === 'tecnico' && vista === 'dia' && data === hj
    ? ags.filter((a) => a.status === 'agendado').slice(0, 30).flatMap((a) => [`/servico/novo?ag=${a.id}`, `/clientes/${a.cliente_id}`])
    : [];

  return (
    <>
      <GuardarOffline urls={rotaHoje.length ? ['/agenda', '/agenda?vista=dia', ...new Set(rotaHoje)] : []} />
      <div className="flex items-center gap-2">
        <h1 className="titulo flex-1">Agenda</h1>
        {u.perfil !== 'tecnico' && <Link href="/agenda/nova" className="btn-primario min-h-[44px] px-3 text-sm">+ Agendar</Link>}
      </div>
      <Flash ok={sp.ok} erro={sp.erro} />

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-borda/50 p-1">
        {[['dia', 'Dia'], ['semana', 'Semana'], ['lista', 'Lista']].map(([v, l]) => (
          <Link key={v} href={qs({ vista: v })} className={`flex min-h-[40px] items-center justify-center rounded-lg text-sm font-semibold ${vista === v ? 'bg-superficie shadow-sm' : 'text-suave'}`}>{l}</Link>
        ))}
      </div>

      {vista !== 'lista' && (
        <div className="flex items-center gap-2">
          <Link href={qs({ data: somaDias(data, -passo) })} className="btn-secundario px-4" aria-label="Anterior">‹</Link>
          <div className="flex-1 text-center">
            <div className="font-bold capitalize">
              {vista === 'dia' ? fmtDiaSemana(data) : `${fmtData(ini).slice(0, 5)} a ${fmtData(fim).slice(0, 5)}`}
            </div>
            {data !== hj && <Link href={qs({ data: hj })} className="text-xs font-semibold text-marca">voltar para hoje</Link>}
          </div>
          <Link href={qs({ data: somaDias(data, passo) })} className="btn-secundario px-4" aria-label="Próximo">›</Link>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Chips nome="tipo" base="/agenda" params={params}
          opcoes={[{ valor: 'assepsia', label: 'Assepsia' }, { valor: 'manutencao_preventiva', label: 'Preventiva' }, { valor: 'manutencao_corretiva', label: 'Corretiva' }]} />
        {cidades.length > 1 && <Chips nome="cidade" base="/agenda" params={params} opcoes={cidades.map((c) => ({ valor: c, label: c }))} />}
        {u.perfil === 'tecnico' && <Chips nome="meus" base="/agenda" params={params} opcoes={[{ valor: '1', label: 'Só os meus' }]} />}
      </div>

      {grupos.length === 0 ? <Vazio>Nenhum serviço {vista === 'lista' ? 'pendente' : 'neste período'}.</Vazio> : grupos.map((g) => (
        <section key={g.titulo} className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-suave">
            <span className="capitalize">{g.titulo}</span>
            {g.sub && <Selo cor="marca">{g.sub}</Selo>}
            <span className="ml-auto">{g.itens.length}</span>
          </h2>
          {g.itens.map((a) => (
            <article key={a.id} className={`cartao flex flex-col gap-2 py-3 ${a.status_efetivo === 'atrasado' ? 'border-l-4 border-l-perigo' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <Link href={`/clientes/${a.cliente_id}`} className="min-w-0">
                  <div className="truncate font-bold">{a.cliente_nome}</div>
                  <div className="text-sm text-suave">
                    {TIPO_SERVICO[a.tipo].curto} · {a.chopeira_codigo ?? 'todas as chopeiras'}
                    {vista === 'semana' ? ` · ${a.cidade}` : ''}
                  </div>
                  <div className="text-xs text-suave">
                    {fmtData(a.data_prevista)} · {relativoDias(a.dias_para_vencer)}
                    {a.tecnico_nome ? ` · ${a.tecnico_nome}` : ''}
                  </div>
                </Link>
                <Selo cor={STATUS_AGENDAMENTO[a.status_efetivo].cor}>{STATUS_AGENDAMENTO[a.status_efetivo].label}</Selo>
              </div>
              {a.observacoes && <p className="text-xs text-suave">{a.observacoes}</p>}
              {a.status === 'agendado' && (
                <div className="flex gap-2">
                  {u.perfil !== 'vendedor' && (
                    <Link href={`/servico/novo?ag=${a.id}`} className="btn-primario flex-1 min-h-[44px]">✓ Realizar</Link>
                  )}
                  <a href={mapsUrl(a.endereco, a.cidade)} target="_blank" rel="noreferrer" className="btn-secundario min-h-[44px] px-3" aria-label="Abrir no Maps">📍</a>
                  <details className="relative">
                    <summary className="btn-secundario min-h-[44px] cursor-pointer list-none px-3" aria-label="Mais opções">⋯</summary>
                    <div className="absolute right-0 z-10 mt-2 flex w-64 flex-col gap-2 rounded-xl border border-borda bg-superficie p-3 shadow-lg">
                      <form action={remarcar} className="flex gap-2">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="voltar" value={voltarUrl} />
                        <input type="date" name="data" defaultValue={a.data_prevista} className="campo min-h-[44px]" />
                        <BotaoEnviar className="btn-secundario min-h-[44px] px-3">OK</BotaoEnviar>
                      </form>
                      <form action={cancelarAgendamento}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="voltar" value={voltarUrl} />
                        <BotaoEnviar className="btn-secundario w-full min-h-[44px] text-perigo" confirmar="Cancelar este agendamento?">Cancelar agendamento</BotaoEnviar>
                      </form>
                    </div>
                  </details>
                </div>
              )}
            </article>
          ))}
        </section>
      ))}
    </>
  );
}
