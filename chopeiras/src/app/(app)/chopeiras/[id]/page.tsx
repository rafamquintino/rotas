import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { urlsAssinadas } from '@/lib/fotos';
import { Cabecalho, Flash, Linha, Selo } from '@/components/ui';
import { BotaoEnviar } from '@/components/Botoes';
import { CampoPatrimonio } from '@/components/CampoPatrimonio';
import { CONDICAO, diasDesde, fmtData, MAX_FOTOS, STATUS_ALUGUEL, STATUS_CHOPEIRA, TIPO_SERVICO, hoje } from '@/lib/format';
import type { Aluguel, Chopeira, Condicao, HistoricoStatus, Servico } from '@/lib/types';
import {
  alterarStatus, cancelarAluguel, devolverAoEstoque, excluirChopeira, inativarChopeira, removerFoto, salvarEtiqueta, salvarObservacoes,
} from '../actions';
import { FotoChopeira } from './FotoChopeira';


export default async function FichaChopeira({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const u = await getUsuario();
  const sb = await createClient();
  await sb.rpc('sincronizar_alugueis');

  const [{ data: ch }, { data: hist }, { data: servs }, { data: alugs }] = await Promise.all([
    sb.from('v_chopeiras').select('*').eq('id', id).single(),
    sb.from('v_historico_status').select('*').eq('chopeira_id', id).order('criado_em', { ascending: false }),
    sb.from('v_servicos').select('*').eq('chopeira_id', id).order('realizado_em', { ascending: false }),
    sb.from('v_alugueis').select('*').eq('chopeira_id', id).order('data_saida', { ascending: false }).limit(20),
  ]);
  if (!ch) notFound();
  const c = ch as Chopeira;
  const fotos = await urlsAssinadas(sb, c.fotos);
  const opera = u.perfil === 'gestor' || u.perfil === 'tecnico';
  const alugueis = (alugs ?? []) as Aluguel[];
  const reservas = alugueis.filter((a) => a.status === 'reservado').sort((a, b) => a.data_saida.localeCompare(b.data_saida));
  const podeAlugar = c.ativo && !['em_cliente', 'baixada'].includes(c.status);

  // Linha do tempo única: mudanças de status + serviços
  const eventos = [
    ...((hist ?? []) as HistoricoStatus[]).map((h) => ({ quando: h.criado_em, tipo: 'status' as const, h })),
    ...((servs ?? []) as Servico[]).map((s) => ({ quando: s.realizado_em, tipo: 'servico' as const, s })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <>
      <Cabecalho titulo={c.patrimonio ? `Patrimônio ${c.patrimonio}` : 'Sem patrimônio'} voltar="/chopeiras"
        acao={u.perfil === 'gestor' ? <Link href={`/chopeiras/${id}/editar`} className="btn-secundario min-h-[40px] px-3 text-sm">Editar</Link> : null} />
      <Flash ok={sp.ok} erro={sp.erro} />

      <section className="cartao">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Selo cor={STATUS_CHOPEIRA[c.status].cor}>{STATUS_CHOPEIRA[c.status].label}</Selo>
          {c.condicao && <Selo cor={CONDICAO[c.condicao].cor}>Condição: {CONDICAO[c.condicao].label}</Selo>}
          {reservas.length > 0 && <Selo cor="marca">Reservada p/ {fmtData(reservas[0].data_saida).slice(0, 5)}</Selo>}
          {!c.ativo && <Selo cor="perigo">Inativa</Selo>}
        </div>
        <Linha rotulo="Patrimônio">{c.patrimonio ?? 'sem etiqueta'}</Linha>
        <Linha rotulo="Marca">{c.marca}</Linha>
        <Linha rotulo="Modelo">{c.modelo_nome ?? '—'}</Linha>
        <Linha rotulo="Voltagem">{c.voltagem}</Linha>
        <Linha rotulo="Vias">{c.vias}</Linha>
        <Linha rotulo="Capacidade">{c.capacidade_lph ? `${Number(c.capacidade_lph)} L/h` : '—'}</Linha>
        <Linha rotulo="Nº de série">{c.numero_serie ?? '—'}</Linha>
        {c.status === 'em_cliente' && (
          <>
            <Linha rotulo="Alocada em">
              {c.cliente_nome ? <Link className="text-marca" href={`/clientes/${c.cliente_id}`}>{c.cliente_nome}</Link> : 'Outra carteira'}
            </Linha>
            <Linha rotulo="Cidade">{c.cliente_cidade ?? '—'}</Linha>
            <Linha rotulo="No cliente desde">{fmtData(c.data_entrada_cliente)}</Linha>
          </>
        )}
        {c.status === 'em_aluguel' && c.aluguel_volta && (
          <>
            <Linha rotulo="Saiu em">{fmtData(c.aluguel_saida)}</Linha>
            <Linha rotulo="Volta prevista">
              <span className={c.aluguel_volta < hoje() ? 'text-perigo' : ''}>{fmtData(c.aluguel_volta)}{c.aluguel_volta < hoje() ? ' (atrasada)' : ''}</span>
            </Linha>
            {c.aluguel_obs && <Linha rotulo="Evento">{c.aluguel_obs}</Linha>}
          </>
        )}
        {c.status === 'em_limpeza' && c.status_desde && (
          <Linha rotulo="Em limpeza desde">{fmtData(c.status_desde)} ({diasDesde(c.status_desde) === 0 ? 'hoje' : `há ${diasDesde(c.status_desde)} dia(s)`})</Linha>
        )}
      </section>

      {c.ativo && c.status !== 'baixada' && (
        <section className="flex flex-col gap-2">
          {c.status === 'em_limpeza' && opera && (
            <Link href={`/chopeiras/${id}/limpeza`} className="btn-ok text-lg">🧽 Limpeza feita – apontar</Link>
          )}
          {c.status === 'em_aluguel' && (
            <form action={devolverAoEstoque}>
              <input type="hidden" name="id" value={id} />
              <BotaoEnviar className="btn-ok w-full text-lg" confirmar="Registrar que a chopeira voltou do aluguel? Ela vai para limpeza.">
                ↩ Voltou do aluguel
              </BotaoEnviar>
            </form>
          )}
          {opera && (c.status === 'disponivel' || c.status === 'reservada') && (
            <Link href={`/chopeiras/${id}/enviar`} className="btn-primario text-lg">📍 Alocar em cliente</Link>
          )}
          {podeAlugar && (
            <Link href={`/chopeiras/${id}/alugar`} className={c.status === 'disponivel' ? 'btn-secundario text-lg' : 'btn-secundario'}>
              🎉 {c.status === 'disponivel' ? 'Alugar' : 'Reservar para evento'}
            </Link>
          )}
          {opera && !['disponivel', 'em_aluguel', 'em_limpeza'].includes(c.status) && (
            <form action={devolverAoEstoque}>
              <input type="hidden" name="id" value={id} />
              <BotaoEnviar className="btn-ok w-full" confirmar={c.status === 'em_cliente' ? 'Recolher a chopeira do cliente e devolver ao estoque? A agenda pendente será cancelada.' : undefined}>
                ↩ Devolver ao estoque
              </BotaoEnviar>
            </form>
          )}
          {opera && !['em_manutencao', 'em_aluguel'].includes(c.status) && (
            <form action={alterarStatus} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="em_manutencao" />
              <input name="obs" placeholder="Motivo da manutenção (opcional)" className="campo" />
              <BotaoEnviar className="btn-secundario w-full" confirmar={c.status === 'em_cliente' ? 'A chopeira sairá do cliente. Confirmar?' : undefined}>🔧 Enviar para manutenção</BotaoEnviar>
            </form>
          )}
          {u.perfil === 'gestor' && !['em_cliente', 'em_aluguel'].includes(c.status) && (
            <form action={alterarStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="baixada" />
              <BotaoEnviar className="btn-secundario w-full text-perigo" confirmar="Dar baixa definitiva nesta chopeira? Reservas futuras serão canceladas.">Dar baixa</BotaoEnviar>
            </form>
          )}
        </section>
      )}

      {(reservas.length > 0 || alugueis.length > 0) && (
        <section className="cartao">
          <h2 className="mb-2 font-bold">Aluguéis e reservas</h2>
          <ul className="divide-y divide-borda/60">
            {alugueis.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <span>
                  <b>{fmtData(a.data_saida).slice(0, 5)} → {fmtData(a.data_volta_prevista).slice(0, 5)}</b>
                  {a.observacao ? ` · ${a.observacao}` : ''}
                  <span className="block text-xs text-suave">por {a.criado_por_nome ?? '—'}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Selo cor={a.atrasado ? 'perigo' : STATUS_ALUGUEL[a.status].cor}>{a.atrasado ? 'Volta atrasada' : STATUS_ALUGUEL[a.status].label}</Selo>
                  {a.status === 'reservado' && (
                    <form action={cancelarAluguel}>
                      <input type="hidden" name="id" value={id} />
                      <input type="hidden" name="aluguel" value={a.id} />
                      <BotaoEnviar className="text-xs font-semibold text-perigo" confirmar="Cancelar esta reserva?">Cancelar</BotaoEnviar>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {opera && (
        <section className="cartao">
          <h2 className="mb-2 font-bold">Etiqueta e condição</h2>
          <form action={salvarEtiqueta} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={id} />
            <CampoPatrimonio valor={c.patrimonio} />
            <select name="condicao" defaultValue={c.condicao ?? ''} className="campo" aria-label="Condição">
              <option value="">Condição: não informada</option>
              {(Object.keys(CONDICAO) as Condicao[]).map((k) => <option key={k} value={k}>Condição: {CONDICAO[k].label}</option>)}
            </select>
            <BotaoEnviar className="btn-secundario w-full">Salvar patrimônio e condição</BotaoEnviar>
          </form>
        </section>
      )}

      <section className="cartao flex flex-col gap-3">
        <h2 className="font-bold">Fotos ({c.fotos.length}/{MAX_FOTOS})</h2>
        {c.fotos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {c.fotos.map((f) => fotos[f] && (
              <div key={f} className="relative">
                <a href={fotos[f]} target="_blank" rel="noreferrer">
                  <img src={fotos[f]} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                </a>
                {opera && (
                  <form action={removerFoto} className="absolute right-1 top-1">
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="caminho" value={f} />
                    <BotaoEnviar className="rounded-full bg-black/60 px-2 text-xs text-white" confirmar="Remover esta foto?">✕</BotaoEnviar>
                  </form>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-suave">Sem fotos.</p>}
        {opera && c.fotos.length < MAX_FOTOS && <FotoChopeira id={id} />}
      </section>

      <section className="cartao">
        <h2 className="mb-2 font-bold">Observações</h2>
        {opera ? (
          <form action={salvarObservacoes} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={id} />
            <textarea name="observacoes" defaultValue={c.observacoes ?? ''} rows={3} className="campo" />
            <BotaoEnviar className="btn-secundario w-full">Salvar observações</BotaoEnviar>
          </form>
        ) : <p className="text-sm">{c.observacoes || '—'}</p>}
      </section>

      <section className="cartao">
        <h2 className="mb-3 font-bold">Histórico completo</h2>
        <ol className="relative ml-2 border-l-2 border-borda">
          {eventos.map((e) => (
            <li key={e.tipo + (e.tipo === 'status' ? e.h.id : e.s.id)} className="mb-4 ml-4">
              <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ${e.tipo === 'servico' ? 'bg-ok' : 'bg-marca'}`} />
              <div className="text-xs text-suave">{fmtData(e.quando, true)}</div>
              {e.tipo === 'status' ? (
                <div className="text-sm">
                  <b>{e.h.status_anterior ? `${STATUS_CHOPEIRA[e.h.status_anterior].label} → ` : ''}{STATUS_CHOPEIRA[e.h.status_novo].label}</b>
                  {e.h.cliente_novo_nome && <> · {e.h.cliente_novo_nome}</>}
                  {!e.h.cliente_novo_nome && e.h.cliente_anterior_nome && <> · saiu de {e.h.cliente_anterior_nome}</>}
                  <div className="text-xs text-suave">{e.h.usuario_nome ?? 'Sistema'}{e.h.motivo ? ` — ${e.h.motivo}` : ''}</div>
                </div>
              ) : (
                <div className="text-sm">
                  <b>{TIPO_SERVICO[e.s.tipo].label}</b>{e.s.cliente_nome ? ` · ${e.s.cliente_nome}` : ''}
                  <div className="text-xs text-suave">{e.s.tecnico_nome}{e.s.observacoes ? ` — ${e.s.observacoes}` : ''}</div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      {u.perfil === 'gestor' && (
        <section className="flex flex-col gap-2">
          <form action={inativarChopeira}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="ativo" value={String(!c.ativo)} />
            <BotaoEnviar className="btn-secundario w-full" confirmar={c.ativo ? 'Inativar esta chopeira? Ela sai do estoque, mas o histórico é mantido.' : undefined}>
              {c.ativo ? 'Inativar chopeira' : 'Reativar chopeira'}
            </BotaoEnviar>
          </form>
          {eventos.length <= 1 && alugueis.length === 0 && (
            <form action={excluirChopeira}>
              <input type="hidden" name="id" value={id} />
              <BotaoEnviar className="btn-secundario w-full text-perigo" confirmar="Excluir definitivamente? (só é possível sem histórico)">Excluir</BotaoEnviar>
            </form>
          )}
        </section>
      )}
    </>
  );
}
