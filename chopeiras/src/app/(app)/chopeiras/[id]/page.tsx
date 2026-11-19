import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { urlsAssinadas } from '@/lib/fotos';
import { Cabecalho, Flash, Linha, Selo } from '@/components/ui';
import { BotaoEnviar } from '@/components/Botoes';
import { fmtData, STATUS_CHOPEIRA, TIPO_SERVICO } from '@/lib/format';
import type { Chopeira, HistoricoStatus, Servico } from '@/lib/types';
import { alterarStatus, devolverAoEstoque, excluirChopeira, inativarChopeira, salvarObservacoes } from '../actions';
import { FotoChopeira } from './FotoChopeira';

export default async function FichaChopeira({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const u = await getUsuario();
  const sb = await createClient();

  const [{ data: ch }, { data: hist }, { data: servs }] = await Promise.all([
    sb.from('v_chopeiras').select('*').eq('id', id).single(),
    sb.from('v_historico_status').select('*').eq('chopeira_id', id).order('criado_em', { ascending: false }),
    sb.from('v_servicos').select('*').eq('chopeira_id', id).order('realizado_em', { ascending: false }),
  ]);
  if (!ch) notFound();
  const c = ch as Chopeira;
  const fotos = await urlsAssinadas(sb, c.fotos);
  const opera = u.perfil === 'gestor' || u.perfil === 'tecnico';

  // Linha do tempo única: mudanças de status + serviços
  const eventos = [
    ...((hist ?? []) as HistoricoStatus[]).map((h) => ({ quando: h.criado_em, tipo: 'status' as const, h })),
    ...((servs ?? []) as Servico[]).map((s) => ({ quando: s.realizado_em, tipo: 'servico' as const, s })),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  return (
    <>
      <Cabecalho titulo={c.codigo} voltar="/chopeiras"
        acao={u.perfil === 'gestor' ? <Link href={`/chopeiras/${id}/editar`} className="btn-secundario min-h-[40px] px-3 text-sm">Editar</Link> : null} />
      <Flash ok={sp.ok} erro={sp.erro} />

      <section className="cartao">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Selo cor={STATUS_CHOPEIRA[c.status].cor}>{STATUS_CHOPEIRA[c.status].label}</Selo>
          {!c.ativo && <Selo cor="perigo">Inativa</Selo>}
        </div>
        <Linha rotulo="Marca">{c.marca}</Linha>
        <Linha rotulo="Modelo">{c.modelo_nome ?? '—'}</Linha>
        <Linha rotulo="Voltagem">{c.voltagem}</Linha>
        <Linha rotulo="Vias">{c.vias}</Linha>
        <Linha rotulo="Capacidade">{c.capacidade_lph ? `${Number(c.capacidade_lph)} L/h` : '—'}</Linha>
        <Linha rotulo="Nº de série">{c.numero_serie ?? '—'}</Linha>
        {c.status === 'em_cliente' && (
          <>
            <Linha rotulo="Cliente">
              {c.cliente_nome ? <Link className="text-marca" href={`/clientes/${c.cliente_id}`}>{c.cliente_nome}</Link> : 'Outra carteira'}
            </Linha>
            <Linha rotulo="Cidade">{c.cliente_cidade ?? '—'}</Linha>
            <Linha rotulo="No cliente desde">{fmtData(c.data_entrada_cliente)}</Linha>
          </>
        )}
      </section>

      {opera && c.ativo && (
        <section className="flex flex-col gap-2">
          {(c.status === 'disponivel' || c.status === 'reservada') && (
            <Link href={`/chopeiras/${id}/enviar`} className="btn-primario text-lg">🚚 Enviar para cliente</Link>
          )}
          {c.status !== 'disponivel' && c.status !== 'baixada' && (
            <form action={devolverAoEstoque}>
              <input type="hidden" name="id" value={id} />
              <BotaoEnviar className="btn-ok w-full" confirmar={c.status === 'em_cliente' ? `Recolher ${c.codigo} do cliente e devolver ao estoque? A agenda pendente será cancelada.` : undefined}>
                ↩ Devolver ao estoque
              </BotaoEnviar>
            </form>
          )}
          {c.status !== 'em_manutencao' && c.status !== 'baixada' && (
            <form action={alterarStatus} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="em_manutencao" />
              <input name="obs" placeholder="Motivo da manutenção (opcional)" className="campo" />
              <BotaoEnviar className="btn-secundario w-full" confirmar={c.status === 'em_cliente' ? 'A chopeira sairá do cliente. Confirmar?' : undefined}>🔧 Enviar para manutenção</BotaoEnviar>
            </form>
          )}
          {c.status === 'disponivel' && (
            <form action={alterarStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="reservada" />
              <BotaoEnviar className="btn-secundario w-full">📌 Reservar</BotaoEnviar>
            </form>
          )}
          {u.perfil === 'gestor' && c.status !== 'baixada' && c.status !== 'em_cliente' && (
            <form action={alterarStatus}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="baixada" />
              <BotaoEnviar className="btn-secundario w-full text-perigo" confirmar="Dar baixa definitiva nesta chopeira?">Dar baixa</BotaoEnviar>
            </form>
          )}
        </section>
      )}

      <section className="cartao flex flex-col gap-3">
        <h2 className="font-bold">Fotos</h2>
        {c.fotos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {c.fotos.map((f) => fotos[f] && (
              <a key={f} href={fotos[f]} target="_blank" rel="noreferrer">
                <img src={fotos[f]} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
              </a>
            ))}
          </div>
        ) : <p className="text-sm text-suave">Sem fotos.</p>}
        {opera && <FotoChopeira id={id} />}
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
                  <b>{TIPO_SERVICO[e.s.tipo].label}</b> · {e.s.cliente_nome}
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
          {eventos.length <= 1 && (
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
