import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { Cabecalho, Flash, Linha, Selo } from '@/components/ui';
import { BotaoEnviar } from '@/components/Botoes';
import { fmtData, mapsUrl, relativoDias, SITUACAO, STATUS_AGENDAMENTO, telLimpo, TIPO_SERVICO } from '@/lib/format';
import type { Agendamento, Chopeira, Cliente, Servico } from '@/lib/types';
import { excluirCliente, inativarCliente } from '../actions';

export default async function FichaCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const u = await getUsuario();
  const sb = await createClient();
  const [{ data: cli }, { data: chs }, { data: ags }, { data: servs }] = await Promise.all([
    sb.from('v_clientes').select('*').eq('id', id).single(),
    sb.from('chopeiras').select('*').eq('cliente_id', id).order('codigo'),
    sb.from('v_agendamentos').select('*').eq('cliente_id', id).eq('status', 'agendado').order('data_prevista'),
    sb.from('v_servicos').select('*').eq('cliente_id', id).order('realizado_em', { ascending: false }).limit(50),
  ]);
  if (!cli) notFound();
  const c = cli as Cliente;
  const chopeiras = (chs ?? []) as Chopeira[];
  const pendentes = (ags ?? []) as Agendamento[];
  const servicos = (servs ?? []) as Servico[];
  const podeEditar = u.perfil === 'gestor' || (u.perfil === 'vendedor' && c.vendedor_id === u.id);
  const tel = telLimpo(c.telefone);

  return (
    <>
      <Cabecalho titulo={c.nome} voltar="/clientes"
        acao={podeEditar ? <Link href={`/clientes/${id}/editar`} className="btn-secundario min-h-[40px] px-3 text-sm">Editar</Link> : null} />
      <Flash ok={sp.ok} erro={sp.erro} />

      <section className="cartao">
        <div className="mb-2 flex flex-wrap gap-2">
          {c.situacao && <Selo cor={SITUACAO[c.situacao].cor}>{SITUACAO[c.situacao].label}</Selo>}
          <Selo>{c.tipo}</Selo>
          {!c.ativo && <Selo cor="perigo">Inativo</Selo>}
        </div>
        <p className="text-sm">{c.endereco ?? 'Sem endereço'} — {c.cidade}</p>
        <p className="text-sm text-suave">{c.contato ?? ''}{c.telefone ? ` · ${c.telefone}` : ''}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a href={mapsUrl(c.endereco, c.cidade)} target="_blank" rel="noreferrer" className="btn-secundario">📍 Abrir no Maps</a>
          {tel ? <a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer" className="btn-secundario">💬 WhatsApp</a>
               : <span className="btn-secundario opacity-50">Sem telefone</span>}
        </div>
      </section>

      {c.ativo && u.perfil !== 'tecnico' && (
        <Link href={`/agenda/nova?cliente=${id}`} className="btn-primario text-lg">+ Agendar assepsia</Link>
      )}
      {c.ativo && u.perfil !== 'vendedor' && (
        <Link href={`/servico/novo?cliente=${id}`} className="btn-secundario">Registrar serviço avulso</Link>
      )}

      <section className="cartao">
        <h2 className="mb-1 font-bold">Assepsia e manutenção</h2>
        <Linha rotulo="Última assepsia">{fmtData(c.ultima_assepsia)}</Linha>
        <Linha rotulo="Próxima assepsia">{fmtData(c.proxima_assepsia)}</Linha>
        <Linha rotulo="Última preventiva">{fmtData(c.ultima_preventiva)}</Linha>
        <Linha rotulo="Próxima preventiva">{fmtData(c.proxima_preventiva)}</Linha>
        <Linha rotulo="Frequências">assepsia {c.freq_assepsia_dias}d · preventiva {c.freq_manutencao_dias}d</Linha>
        <Linha rotulo="Vendedor">{c.vendedor_nome ?? '—'}</Linha>
      </section>

      <section className="cartao">
        <h2 className="mb-2 font-bold">Chopeiras instaladas ({chopeiras.length})</h2>
        {chopeiras.length === 0 ? <p className="text-sm text-suave">Nenhuma chopeira neste cliente.</p> : (
          <ul className="divide-y divide-borda/60">
            {chopeiras.map((ch) => (
              <li key={ch.id}>
                <Link href={`/chopeiras/${ch.id}`} className="flex justify-between py-2.5">
                  <span><b>{ch.codigo}</b> <span className="text-sm text-suave">· {ch.marca} {ch.voltagem} · {ch.vias} vias</span></span>
                  <span className="text-xs text-suave">desde {fmtData(ch.data_entrada_cliente)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao">
        <h2 className="mb-2 font-bold">Agenda pendente</h2>
        {pendentes.length === 0 ? <p className="text-sm text-suave">Nada agendado.</p> : (
          <ul className="divide-y divide-borda/60">
            {pendentes.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2.5">
                <span className="text-sm">
                  <b>{TIPO_SERVICO[a.tipo].curto}</b>{a.chopeira_codigo ? ` · ${a.chopeira_codigo}` : ' · todas'}
                  <span className="block text-xs text-suave">{fmtData(a.data_prevista)} · {relativoDias(a.dias_para_vencer)}</span>
                </span>
                <span className="flex items-center gap-2">
                  <Selo cor={STATUS_AGENDAMENTO[a.status_efetivo].cor}>{STATUS_AGENDAMENTO[a.status_efetivo].label}</Selo>
                  {u.perfil !== 'vendedor' && (
                    <Link href={`/servico/novo?ag=${a.id}`} className="btn-primario min-h-[40px] px-3 text-sm">Fazer</Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartao">
        <h2 className="mb-2 font-bold">Histórico de serviços</h2>
        {servicos.length === 0 ? <p className="text-sm text-suave">Nenhum serviço registrado.</p> : (
          <ul className="divide-y divide-borda/60">
            {servicos.map((s) => (
              <li key={s.id}>
                <Link href={`/servico/${s.id}`} className="block py-2.5 text-sm">
                  <b>{TIPO_SERVICO[s.tipo].label}</b>{s.chopeira_codigo ? ` · ${s.chopeira_codigo}` : ''}
                  <span className="block text-xs text-suave">{fmtData(s.realizado_em, true)} · {s.tecnico_nome}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {u.perfil === 'gestor' && (
        <section className="flex flex-col gap-2">
          <form action={inativarCliente}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="ativo" value={String(!c.ativo)} />
            <BotaoEnviar className="btn-secundario w-full" confirmar={c.ativo ? 'Inativar este cliente? A agenda pendente será cancelada.' : undefined}>
              {c.ativo ? 'Inativar cliente' : 'Reativar cliente'}
            </BotaoEnviar>
          </form>
          {servicos.length === 0 && pendentes.length === 0 && chopeiras.length === 0 && (
            <form action={excluirCliente}>
              <input type="hidden" name="id" value={id} />
              <BotaoEnviar className="btn-secundario w-full text-perigo" confirmar="Excluir definitivamente? (só sem histórico)">Excluir</BotaoEnviar>
            </form>
          )}
        </section>
      )}
    </>
  );
}
