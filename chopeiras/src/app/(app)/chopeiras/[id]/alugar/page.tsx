import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { BotaoEnviar } from '@/components/Botoes';
import { ConferirPatrimonio } from '@/components/LeitorPatrimonio';
import { fmtData, hoje, somaDias } from '@/lib/format';
import type { Aluguel } from '@/lib/types';
import { alugar } from '../../actions';

/** Próxima sexta-feira (ou hoje, se for sexta): o dia típico de saída para eventos. */
function proximaSexta(iso: string) {
  const d = new Date(iso + 'T12:00:00Z').getUTCDay();
  return somaDias(iso, (5 - d + 7) % 7);
}

export default async function Alugar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; saida?: string; volta?: string }> }) {
  await getUsuario();
  const { id } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const [{ data: ch }, { data: res }] = await Promise.all([
    sb.from('chopeiras').select('rotulo, patrimonio, marca, voltagem, vias, status').eq('id', id).single(),
    sb.from('v_alugueis').select('*').eq('chopeira_id', id).in('status', ['reservado', 'em_andamento']).order('data_saida'),
  ]);
  if (!ch) notFound();
  const hj = hoje();
  const disponivelHoje = ch.status === 'disponivel';
  const saida = sp.saida ?? (disponivelHoje ? hj : proximaSexta(somaDias(hj, 1)));
  const volta = sp.volta ?? somaDias(saida, 3);
  const ocupadas = (res ?? []) as Aluguel[];

  return (
    <>
      <Cabecalho titulo={`Alugar ${ch.patrimonio ?? ch.rotulo}`} voltar={`/chopeiras/${id}`} />
      <p className="text-sm text-suave">{ch.marca} · {ch.voltagem} · {ch.vias} vias · sem cadastro de cliente</p>
      <Flash erro={sp.erro} />
      {!disponivelHoje && (
        <p className="rounded-xl bg-alerta/15 p-3 text-sm text-alerta">
          Esta chopeira não está disponível agora. Você pode reservá-la para uma data futura; ela só sai se estiver pronta no dia.
        </p>
      )}
      {ocupadas.length > 0 && (
        <div className="cartao text-sm">
          <b>Datas já ocupadas</b>
          <ul className="mt-1 text-suave">
            {ocupadas.map((a) => <li key={a.id}>{fmtData(a.data_saida)} a {fmtData(a.data_volta_prevista)}{a.observacao ? ` · ${a.observacao}` : ''}</li>)}
          </ul>
        </div>
      )}
      <form action={alugar} className="cartao flex flex-col gap-4">
        <input type="hidden" name="id" value={id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo" htmlFor="saida">Saída</label>
            <input id="saida" name="saida" type="date" required min={hj} defaultValue={saida} className="campo" />
          </div>
          <div>
            <label className="rotulo" htmlFor="volta">Volta prevista</label>
            <input id="volta" name="volta" type="date" required min={hj} defaultValue={volta} className="campo" />
          </div>
        </div>
        <div>
          <label className="rotulo" htmlFor="obs">Observação (opcional)</label>
          <input id="obs" name="obs" className="campo" placeholder="Ex.: Casamento sábado – Poços de Caldas" />
        </div>
        <p className="text-xs text-suave">
          Saída hoje: a chopeira sai do estoque na hora. Saída futura: fica reservada e sai sozinha no dia.
          Na volta, ela passa pela limpeza antes de ficar disponível de novo.
        </p>
        <BotaoEnviar>Confirmar aluguel</BotaoEnviar>
      </form>
      <ConferirPatrimonio esperado={ch.patrimonio} rotulo={ch.rotulo} />
    </>
  );
}
