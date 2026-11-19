import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { dadosRelatorio } from '@/lib/relatorios';
import { Selo } from '@/components/ui';
import { fmtData, hoje, somaDias } from '@/lib/format';

export const metadata = { title: 'Relatórios' };

type Linha = { nome: string; assepsia: number; manutencao_preventiva: number; manutencao_corretiva: number; total: number };

function Tabela({ titulo, linhas, csv }: { titulo: string; linhas: Linha[]; csv: string }) {
  const max = Math.max(1, ...linhas.map((l) => l.total));
  return (
    <section className="cartao">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold">{titulo}</h2>
        <a href={csv} className="text-sm font-semibold text-marca">CSV ↓</a>
      </div>
      {linhas.length === 0 ? <p className="text-sm text-suave">Sem serviços no período.</p> : (
        <table className="tabela">
          <thead><tr><th>Nome</th><th className="text-right">Assep.</th><th className="text-right">Prev.</th><th className="text-right">Corr.</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.nome}>
                <td>
                  {l.nome}
                  <div className="mt-1 h-1.5 rounded-full bg-marca" style={{ width: `${(l.total / max) * 100}%` }} />
                </td>
                <td className="text-right tabular-nums">{l.assepsia}</td>
                <td className="text-right tabular-nums">{l.manutencao_preventiva}</td>
                <td className="text-right tabular-nums">{l.manutencao_corretiva}</td>
                <td className="text-right font-bold tabular-nums">{l.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string }> }) {
  await exigirPerfil('gestor');
  const sp = await searchParams;
  const ate = sp.ate ?? hoje();
  const de = sp.de ?? somaDias(ate, -30);
  const sb = await createClient();
  const r = await dadosRelatorio(sb, de, ate);
  const csv = (tipo: string) => `/api/exportar?tipo=${tipo}&de=${de}&ate=${ate}`;

  return (
    <>
      <h1 className="titulo">Relatórios</h1>
      <form className="cartao grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <div><label className="rotulo">De</label><input type="date" name="de" defaultValue={de} className="campo" /></div>
        <div><label className="rotulo">Até</label><input type="date" name="ate" defaultValue={ate} className="campo" /></div>
        <button className="btn-secundario">Ver</button>
      </form>

      <section className="cartao">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Taxa de ocupação</h2>
          <a href={csv('chopeiras')} className="text-sm font-semibold text-marca">CSV ↓</a>
        </div>
        <div className="flex items-end gap-3">
          <span className="text-5xl font-bold tabular-nums text-marca">{r.ocupacao.taxa}%</span>
          <span className="pb-2 text-sm text-suave">{r.ocupacao.em_cliente} de {r.ocupacao.total} chopeiras em cliente</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-borda">
          <div className="h-full bg-marca" style={{ width: `${r.ocupacao.taxa}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {r.ocupacao.porMarca.map((m) => (
            <div key={m.nome} className="rounded-xl bg-fundo p-3"><b>{m.nome}</b><div className="text-suave">{m.taxa}% · {m.em_cliente}/{m.total}</div></div>
          ))}
        </div>
      </section>

      <p className="text-sm text-suave">{r.servicos.length} serviço(s) de {fmtData(de)} a {fmtData(ate)} · <a className="font-semibold text-marca" href={csv('servicos')}>exportar todos (CSV)</a></p>
      <Tabela titulo="Serviços por técnico" linhas={r.porTecnico} csv={csv('por_tecnico')} />
      <Tabela titulo="Serviços por cidade" linhas={r.porCidade} csv={csv('por_cidade')} />
      <Tabela titulo="Serviços por vendedor" linhas={r.porVendedor} csv={csv('por_vendedor')} />

      <section className="cartao">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Clientes mais atrasados</h2>
          <a href={csv('atrasados')} className="text-sm font-semibold text-marca">CSV ↓</a>
        </div>
        {r.atrasados.length === 0 ? <p className="text-sm text-suave">Nenhum cliente atrasado. 🎉</p> : (
          <ul className="divide-y divide-borda/60">
            {r.atrasados.map((c) => (
              <li key={c.id}>
                <Link href={`/clientes/${c.id}`} className="flex items-center justify-between py-2.5">
                  <span><b>{c.nome}</b><span className="block text-xs text-suave">{c.cidade} · {c.vendedor_nome ?? 'sem vendedor'}</span></span>
                  <Selo cor="perigo">{c.dias_atraso} dias</Selo>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
