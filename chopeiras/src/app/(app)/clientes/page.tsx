import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { Chips, Flash, Selo, Vazio } from '@/components/ui';
import { fmtData, SITUACAO } from '@/lib/format';
import type { Cliente, Situacao } from '@/lib/types';

export const metadata = { title: 'Clientes' };

type P = { q?: string; cidade?: string; vendedor?: string; situacao?: string; inativos?: string; ok?: string; erro?: string };

export default async function Clientes({ searchParams }: { searchParams: Promise<P> }) {
  const sp = await searchParams;
  const u = await getUsuario();
  const sb = await createClient();

  let q = sb.from('v_clientes').select('*').order('dias_atraso', { ascending: false }).order('nome').limit(400);
  q = sp.inativos ? q.eq('ativo', false) : q.eq('ativo', true);
  if (sp.q) q = q.ilike('nome', `%${sp.q.replace(/[%,]/g, '')}%`);
  if (sp.cidade) q = q.eq('cidade', sp.cidade);
  if (sp.vendedor) q = q.eq('vendedor_id', sp.vendedor);
  if (sp.situacao) q = q.eq('situacao', sp.situacao);

  const [{ data }, { data: todos }, { data: vendedores }] = await Promise.all([
    q,
    sb.from('clientes').select('cidade').eq('ativo', true),
    u.perfil !== 'vendedor' ? sb.from('usuarios').select('id, nome').eq('perfil', 'vendedor').eq('ativo', true).order('nome') : Promise.resolve({ data: [] }),
  ]);
  const lista = (data ?? []) as Cliente[];
  const cidades = [...new Set((todos ?? []).map((c) => c.cidade as string))].sort();
  const params = { ...sp } as Record<string, string | undefined>;

  return (
    <>
      <div className="flex items-center gap-2">
        <h1 className="titulo flex-1">{u.perfil === 'vendedor' ? 'Minha carteira' : 'Clientes'}</h1>
        {u.perfil !== 'tecnico' && <Link href="/clientes/novo" className="btn-primario min-h-[44px] px-3 text-sm">+ Novo</Link>}
      </div>
      <Flash ok={sp.ok} erro={sp.erro} />
      <form className="flex gap-2" action="/clientes">
        {Object.entries(sp).filter(([k, v]) => v && !['q', 'ok', 'erro'].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input name="q" defaultValue={sp.q} placeholder="Buscar cliente" className="campo" inputMode="search" />
        <button className="btn-secundario px-4">Buscar</button>
      </form>
      <div className="flex flex-col gap-2">
        <Chips nome="situacao" base="/clientes" params={params}
          opcoes={(Object.keys(SITUACAO) as Situacao[]).map((s) => ({ valor: s, label: SITUACAO[s].label }))} />
        {cidades.length > 1 && <Chips nome="cidade" base="/clientes" params={params} opcoes={cidades.map((c) => ({ valor: c, label: c }))} />}
        {(vendedores ?? []).length > 0 && (
          <Chips nome="vendedor" base="/clientes" params={params} opcoes={(vendedores ?? []).map((v) => ({ valor: v.id, label: v.nome }))} />
        )}
      </div>
      <p className="text-sm text-suave">
        {lista.length} cliente(s) ·{' '}
        <Link className="font-medium text-marca" href={sp.inativos ? '/clientes' : '/clientes?inativos=1'}>{sp.inativos ? 'ver ativos' : 'ver inativos'}</Link>
      </p>

      {lista.length === 0 ? <Vazio>Nenhum cliente encontrado.</Vazio> : (
        <ul className="flex flex-col gap-2">
          {lista.map((c) => (
            <li key={c.id}>
              <Link href={`/clientes/${c.id}`} className="cartao flex items-center gap-3 py-3 active:scale-[0.99]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold">{c.nome}</span>
                    {c.situacao && <Selo cor={SITUACAO[c.situacao].cor}>{SITUACAO[c.situacao].label}{c.situacao === 'atrasado' && c.dias_atraso ? ` ${c.dias_atraso}d` : ''}</Selo>}
                  </div>
                  <div className="truncate text-sm text-suave">
                    {c.cidade} · {c.tipo} · {c.qtd_chopeiras ?? 0} chopeira(s)
                    {u.perfil !== 'vendedor' && c.vendedor_nome ? ` · ${c.vendedor_nome}` : ''}
                  </div>
                  <div className="text-xs text-suave">Próxima assepsia: {fmtData(c.proxima_assepsia)}</div>
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
