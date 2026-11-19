import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { BotaoEnviar } from '@/components/Botoes';
import { hoje } from '@/lib/format';
import { enviarParaCliente } from '../../actions';

export default async function Enviar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; cidade?: string }> }) {
  await exigirPerfil('gestor', 'tecnico');
  const { id } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const [{ data: ch }, { data: clientes }] = await Promise.all([
    sb.from('chopeiras').select('codigo, marca, voltagem, vias, status').eq('id', id).single(),
    sb.from('clientes').select('id, nome, cidade').eq('ativo', true).order('cidade').order('nome'),
  ]);
  if (!ch) notFound();
  const porCidade = new Map<string, { id: string; nome: string }[]>();
  (clientes ?? []).forEach((c) => porCidade.set(c.cidade, [...(porCidade.get(c.cidade) ?? []), c]));

  return (
    <>
      <Cabecalho titulo={`Enviar ${ch.codigo}`} voltar={`/chopeiras/${id}`} />
      <p className="text-sm text-suave">{ch.marca} · {ch.voltagem} · {ch.vias} vias</p>
      <Flash erro={sp.erro} />
      <form action={enviarParaCliente} className="cartao flex flex-col gap-4">
        <input type="hidden" name="id" value={id} />
        <div>
          <label className="rotulo" htmlFor="cliente_id">Cliente</label>
          <select id="cliente_id" name="cliente_id" required className="campo" defaultValue="">
            <option value="" disabled>Escolha o cliente…</option>
            {[...porCidade.entries()].map(([cidade, lista]) => (
              <optgroup key={cidade} label={cidade}>
                {lista.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo" htmlFor="data">Data de entrada no cliente</label>
          <input id="data" name="data" type="date" defaultValue={hoje()} className="campo" />
        </div>
        <div>
          <label className="rotulo" htmlFor="obs">Observação (opcional)</label>
          <input id="obs" name="obs" className="campo" placeholder="Ex.: instalada no balcão" />
        </div>
        <p className="text-xs text-suave">A primeira assepsia e a primeira preventiva serão agendadas pela frequência do cliente.</p>
        <BotaoEnviar>Confirmar envio</BotaoEnviar>
      </form>
    </>
  );
}
