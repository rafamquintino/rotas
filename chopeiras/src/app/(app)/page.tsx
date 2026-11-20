import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { Flash, Selo } from '@/components/ui';
import { diasDesde, fmtData, hoje, relativoDias, somaDias, TIPO_SERVICO } from '@/lib/format';
import type { Agendamento, Aluguel, Chopeira } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Combo = { marca: string; voltagem: string; vias: number; disponiveis: number; total: number };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const u = await getUsuario();
  const sb = await createClient();
  const limite = somaDias(hoje(), 7);
  await sb.rpc('sincronizar_alugueis');

  const [contagem, combos, alertas, alugs, limpar] = await Promise.all([
    sb.from('chopeiras').select('status').eq('ativo', true),
    sb.from('v_estoque_combinacoes').select('*').order('marca').order('voltagem').order('vias'),
    sb.from('v_agendamentos').select('*').eq('status', 'agendado').lte('data_prevista', limite).order('data_prevista').limit(200),
    sb.from('v_alugueis').select('*').in('status', ['reservado', 'em_andamento']).order('data_saida').limit(100),
    sb.from('v_chopeiras').select('*').eq('status', 'em_limpeza').eq('ativo', true).order('status_desde'),
  ]);
  const alugueis = (alugs.data ?? []) as Aluguel[];
  const emAndamento = alugueis.filter((a) => a.status === 'em_andamento').sort((a, b) => a.data_volta_prevista.localeCompare(b.data_volta_prevista));
  const reservas = alugueis.filter((a) => a.status === 'reservado' && a.data_saida <= somaDias(hoje(), 14));
  const paraLimpar = (limpar.data ?? []) as Chopeira[];

  const st = (contagem.data ?? []) as { status: string }[];
  const n = (s?: string) => (s ? st.filter((c) => c.status === s).length : st.filter((c) => c.status !== 'baixada').length);
  const ags = (alertas.data ?? []) as Agendamento[];
  const assepAtrasadas = ags.filter((a) => a.tipo === 'assepsia' && a.dias_para_vencer < 0);
  const assepVencer = ags.filter((a) => a.tipo === 'assepsia' && a.dias_para_vencer >= 0);
  const prevVencidas = ags.filter((a) => a.tipo === 'manutencao_preventiva' && a.dias_para_vencer < 0);
  const listaCombos = (combos.data ?? []) as Combo[];

  const cards = [
    { label: 'Disponíveis', valor: n('disponivel'), href: '/chopeiras?status=disponivel', cor: 'text-ok', destaque: true },
    { label: 'Alocadas em cliente', valor: n('em_cliente'), href: '/chopeiras?status=em_cliente', cor: 'text-info' },
    { label: 'Em aluguel', valor: n('em_aluguel'), href: '/chopeiras?status=em_aluguel', cor: 'text-roxo' },
    { label: 'Reservadas p/ evento', valor: alugueis.filter((a) => a.status === 'reservado').length, href: '/chopeiras?status=reserva', cor: 'text-marca-forte' },
    { label: 'Em limpeza', valor: n('em_limpeza'), href: '/chopeiras?status=em_limpeza', cor: 'text-ciano' },
    { label: 'Em manutenção', valor: n('em_manutencao'), href: '/chopeiras?status=em_manutencao', cor: 'text-alerta' },
  ];

  return (
    <>
      <Flash ok={sp.ok} erro={sp.erro} />
      <section className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className={`cartao active:scale-[0.98] ${c.destaque ? 'col-span-2 flex items-center justify-between border-ok/40' : ''}`}>
            <div className="text-sm font-medium text-suave">{c.label}{c.destaque && <span className="block text-xs">de {n()} chopeiras</span>}</div>
            <div className={`mt-1 font-bold tabular-nums ${c.destaque ? 'text-5xl' : 'text-4xl'} ${c.cor}`}>{c.valor}</div>
          </Link>
        ))}
      </section>

      {u.perfil === 'vendedor' && (
        <Link href="/agenda/nova" className="btn-primario text-lg">+ Agendar assepsia</Link>
      )}
      {u.perfil === 'tecnico' && (
        <Link href="/agenda?vista=dia" className="btn-primario text-lg">Minha rota de hoje</Link>
      )}

      <section className="cartao">
        <h2 className="mb-2 font-bold">Disponíveis por modelo</h2>
        {listaCombos.length === 0 ? (
          <p className="text-sm text-suave">Nenhuma chopeira cadastrada.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr><th>Marca</th><th>Voltagem</th><th>Vias</th><th className="text-right">Disponíveis</th></tr>
            </thead>
            <tbody>
              {listaCombos.map((c) => (
                <tr key={`${c.marca}${c.voltagem}${c.vias}`}>
                  <td>
                    <Link className="font-medium" href={`/chopeiras?status=disponivel&marca=${encodeURIComponent(c.marca)}&voltagem=${c.voltagem}&vias=${c.vias}`}>{c.marca}</Link>
                  </td>
                  <td>{c.voltagem}</td>
                  <td>{c.vias} {c.vias === 1 ? 'via' : 'vias'}</td>
                  <td className={`text-right text-lg font-bold tabular-nums ${c.disponiveis ? 'text-ok' : 'text-suave'}`}>
                    {c.disponiveis}<span className="text-xs font-normal text-suave"> / {c.total}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {(emAndamento.length > 0 || reservas.length > 0) && (
        <section className="cartao">
          <h2 className="mb-2 font-bold">Aluguéis</h2>
          <ul className="divide-y divide-borda/60">
            {[...emAndamento, ...reservas].map((a) => (
              <li key={a.id}>
                <Link href={`/chopeiras/${a.chopeira_id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.rotulo} · {a.marca} {a.vias}v</span>
                    <span className="block truncate text-xs text-suave">{a.observacao ?? 'Evento'}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    {a.status === 'em_andamento' ? (
                      <span className={`block font-semibold ${a.atrasado ? 'text-perigo' : 'text-roxo'}`}>
                        {a.atrasado ? 'Volta atrasada' : `Volta ${fmtData(a.data_volta_prevista).slice(0, 5)}`}
                      </span>
                    ) : (
                      <span className="block font-semibold text-marca-forte">Sai {fmtData(a.data_saida).slice(0, 5)}</span>
                    )}
                    <span className="text-suave">{a.status === 'em_andamento' ? 'em aluguel' : 'reserva'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {paraLimpar.length > 0 && (
        <section className="cartao">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold">Chopeiras para limpar</h2>
            <Selo cor="ciano">{paraLimpar.length}</Selo>
          </div>
          <ul className="divide-y divide-borda/60">
            {paraLimpar.map((c) => (
              <li key={c.id}>
                <Link href={u.perfil === 'vendedor' ? `/chopeiras/${c.id}` : `/chopeiras/${c.id}/limpeza?voltar=/`} className="flex items-center justify-between gap-3 py-2.5">
                  <span><b>{c.rotulo}</b> <span className="text-sm text-suave">· {c.marca} {c.voltagem} · {c.vias}v</span></span>
                  <span className={`shrink-0 text-xs font-semibold ${diasDesde(c.status_desde) >= 3 ? 'text-perigo' : 'text-suave'}`}>
                    {diasDesde(c.status_desde) === 0 ? 'desde hoje' : `há ${diasDesde(c.status_desde)} dia(s)`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Alertas titulo="Assepsias atrasadas" cor="perigo" itens={assepAtrasadas} />
      <Alertas titulo="Assepsias a vencer em 7 dias" cor="alerta" itens={assepVencer} />
      <Alertas titulo="Preventivas vencidas" cor="perigo" itens={prevVencidas} />
    </>
  );
}

function Alertas({ titulo, cor, itens }: { titulo: string; cor: string; itens: Agendamento[] }) {
  return (
    <section className="cartao">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold">{titulo}</h2>
        <Selo cor={itens.length ? cor : 'ok'}>{itens.length}</Selo>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-suave">Nada por aqui. 👍</p>
      ) : (
        <ul className="divide-y divide-borda/60">
          {itens.slice(0, 8).map((a) => (
            <li key={a.id}>
              <Link href={`/clientes/${a.cliente_id}`} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.cliente_nome}</span>
                  <span className="block text-xs text-suave">
                    {a.cidade} · {TIPO_SERVICO[a.tipo].curto}{a.chopeira_codigo ? ` · ${a.chopeira_codigo}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  <span className={`block font-semibold ${a.dias_para_vencer < 0 ? 'text-perigo' : 'text-alerta'}`}>{relativoDias(a.dias_para_vencer)}</span>
                  <span className="text-suave">{fmtData(a.data_prevista)}</span>
                </span>
              </Link>
            </li>
          ))}
          {itens.length > 8 && (
            <li className="pt-2 text-center">
              <Link href="/agenda?vista=lista" className="text-sm font-semibold text-marca">Ver todos ({itens.length})</Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
