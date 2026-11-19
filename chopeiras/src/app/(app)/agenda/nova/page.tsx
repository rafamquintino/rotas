import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { BotaoEnviar } from '@/components/Botoes';
import { fmtData, fmtDiaSemana, hoje, somaDias, TIPO_SERVICO } from '@/lib/format';
import { solicitarAssepsia } from '../actions';

export const metadata = { title: 'Agendar assepsia' };

/** Agendamento em 3 toques: (1) cliente → (2) data → (3) confirmar */
export default async function NovaAssepsia({ searchParams }: { searchParams: Promise<{ cliente?: string; data?: string; q?: string; erro?: string; tipo?: string }> }) {
  const u = await exigirPerfil('gestor', 'vendedor');
  const sp = await searchParams;
  const sb = await createClient();
  const tipo = u.perfil === 'gestor' && sp.tipo ? sp.tipo : 'assepsia';
  const extra = tipo !== 'assepsia' ? `&tipo=${tipo}` : '';

  // Passo 1: cliente
  if (!sp.cliente) {
    let q = sb.from('v_clientes').select('id, nome, cidade, situacao, proxima_assepsia').eq('ativo', true).order('nome');
    if (sp.q) q = q.ilike('nome', `%${sp.q.replace(/[%,]/g, '')}%`);
    const { data: clientes } = await q;
    return (
      <>
        <Cabecalho titulo="1. Qual cliente?" voltar="/agenda" />
        <Passos atual={1} />
        <form className="flex gap-2">
          <input name="q" defaultValue={sp.q} placeholder="Buscar cliente" className="campo" />
          <button className="btn-secundario px-4">Buscar</button>
        </form>
        <ul className="flex flex-col gap-2">
          {(clientes ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/agenda/nova?cliente=${c.id}${extra}`} className="cartao flex items-center justify-between py-3 active:scale-[0.99]">
                <span>
                  <b>{c.nome}</b>
                  <span className="block text-sm text-suave">{c.cidade} · próxima: {fmtData(c.proxima_assepsia)}</span>
                </span>
                <span className="text-xl text-suave">›</span>
              </Link>
            </li>
          ))}
        </ul>
      </>
    );
  }

  const { data: cliente } = await sb.from('clientes').select('id, nome, cidade').eq('id', sp.cliente).single();
  if (!cliente) return <Flash erro="Cliente não encontrado na sua carteira" />;

  // Passo 2: data
  if (!sp.data) {
    const hj = hoje();
    const opcoes = [1, 2, 3, 4, 5, 7].map((d) => somaDias(hj, d));
    return (
      <>
        <Cabecalho titulo="2. Para quando?" voltar={`/agenda/nova${extra ? `?${extra.slice(1)}` : ''}`} />
        <Passos atual={2} />
        <p className="text-sm text-suave">{cliente.nome} · {cliente.cidade}</p>
        <div className="grid grid-cols-2 gap-2">
          {opcoes.map((d, i) => (
            <Link key={d} href={`/agenda/nova?cliente=${cliente.id}&data=${d}${extra}`} className="cartao py-3 text-center active:scale-[0.98]">
              <div className="font-bold">{i === 0 ? 'Amanhã' : fmtDiaSemana(d).split(',')[0]}</div>
              <div className="text-sm text-suave">{fmtData(d)}</div>
            </Link>
          ))}
        </div>
        <form className="cartao flex gap-2">
          <input type="hidden" name="cliente" value={cliente.id} />
          {tipo !== 'assepsia' && <input type="hidden" name="tipo" value={tipo} />}
          <input type="date" name="data" min={hj} required className="campo" />
          <button className="btn-secundario px-4">Outra data</button>
        </form>
      </>
    );
  }

  // Passo 3: confirmar
  const { data: chs } = await sb.from('chopeiras').select('id, codigo').eq('cliente_id', cliente.id).order('codigo');
  return (
    <>
      <Cabecalho titulo="3. Confirmar" voltar={`/agenda/nova?cliente=${cliente.id}${extra}`} />
      <Passos atual={3} />
      <Flash erro={sp.erro} />
      <form action={solicitarAssepsia} className="cartao flex flex-col gap-4">
        <input type="hidden" name="cliente_id" value={cliente.id} />
        <input type="hidden" name="data" value={sp.data} />
        <input type="hidden" name="tipo" value={tipo} />
        <div className="rounded-xl bg-marca/10 p-4 text-center">
          <div className="text-sm text-suave">{TIPO_SERVICO[tipo as keyof typeof TIPO_SERVICO]?.label ?? 'Assepsia'}</div>
          <div className="text-lg font-bold">{cliente.nome}</div>
          <div className="font-semibold text-marca-forte first-letter:uppercase">{fmtDiaSemana(sp.data)}</div>
        </div>
        {(chs ?? []).length > 1 && (
          <div>
            <label className="rotulo">Chopeira</label>
            <select name="chopeira_id" className="campo" defaultValue="">
              <option value="">Todas as chopeiras do cliente</option>
              {(chs ?? []).map((c) => <option key={c.id} value={c.id}>{c.codigo}</option>)}
            </select>
          </div>
        )}
        {(chs ?? []).length === 1 && <input type="hidden" name="chopeira_id" value={chs![0].id} />}
        <input name="obs" placeholder="Observação (opcional)" className="campo" />
        <BotaoEnviar className="btn-primario w-full text-lg">✓ Confirmar agendamento</BotaoEnviar>
      </form>
    </>
  );
}

function Passos({ atual }: { atual: number }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3].map((p) => <div key={p} className={`h-1.5 flex-1 rounded-full ${p <= atual ? 'bg-marca' : 'bg-borda'}`} />)}
    </div>
  );
}
