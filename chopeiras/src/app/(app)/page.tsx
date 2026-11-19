import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { Flash, Selo } from '@/components/ui';
import { fmtData, hoje, relativoDias, somaDias, TIPO_SERVICO } from '@/lib/format';
import type { Agendamento } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Combo = { marca: string; voltagem: string; vias: number; disponiveis: number; total: number };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const u = await getUsuario();
  const sb = await createClient();
  const limite = somaDias(hoje(), 7);

  const [contagem, combos, alertas] = await Promise.all([
    sb.from('chopeiras').select('status').eq('ativo', true),
    sb.from('v_estoque_combinacoes').select('*').order('marca').order('voltagem').order('vias'),
    sb.from('v_agendamentos').select('*').eq('status', 'agendado').lte('data_prevista', limite).order('data_prevista').limit(200),
  ]);

  const st = (contagem.data ?? []) as { status: string }[];
  const n = (s?: string) => (s ? st.filter((c) => c.status === s).length : st.filter((c) => c.status !== 'baixada').length);
  const ags = (alertas.data ?? []) as Agendamento[];
  const assepAtrasadas = ags.filter((a) => a.tipo === 'assepsia' && a.dias_para_vencer < 0);
  const assepVencer = ags.filter((a) => a.tipo === 'assepsia' && a.dias_para_vencer >= 0);
  const prevVencidas = ags.filter((a) => a.tipo === 'manutencao_preventiva' && a.dias_para_vencer < 0);
  const listaCombos = (combos.data ?? []) as Combo[];

  const cards = [
    { label: 'Total', valor: n(), href: '/chopeiras', cor: 'text-texto' },
    { label: 'Disponíveis', valor: n('disponivel'), href: '/chopeiras?status=disponivel', cor: 'text-ok' },
    { label: 'Em cliente', valor: n('em_cliente'), href: '/chopeiras?status=em_cliente', cor: 'text-info' },
    { label: 'Em manutenção', valor: n('em_manutencao'), href: '/chopeiras?status=em_manutencao', cor: 'text-alerta' },
  ];

  return (
    <>
      <Flash ok={sp.ok} erro={sp.erro} />
      <section className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="cartao active:scale-[0.98]">
            <div className="text-sm font-medium text-suave">{c.label}</div>
            <div className={`mt-1 text-4xl font-bold tabular-nums ${c.cor}`}>{c.valor}</div>
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
