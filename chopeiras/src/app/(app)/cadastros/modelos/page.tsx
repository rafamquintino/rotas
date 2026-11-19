import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { BotaoEnviar } from '@/components/Botoes';
import type { Modelo } from '@/lib/types';
import { salvarModelo } from '../actions';

function FormModelo({ m }: { m?: Modelo }) {
  return (
    <form action={salvarModelo} className="grid grid-cols-2 gap-2">
      {m && <input type="hidden" name="id" value={m.id} />}
      <input name="nome" required defaultValue={m?.nome} placeholder="Nome do modelo" className="campo col-span-2" />
      <select name="marca" defaultValue={m?.marca ?? 'Gorillaz'} className="campo"><option>Gorillaz</option><option>Gonçalves</option></select>
      <select name="vias" defaultValue={m?.vias ?? 1} className="campo">{[1, 2, 3].map((v) => <option key={v} value={v}>{v} via(s)</option>)}</select>
      <input name="capacidade_lph" type="number" step="0.1" min="1" required defaultValue={m?.capacidade_lph} placeholder="L/h" className="campo" inputMode="decimal" />
      <BotaoEnviar className="btn-secundario">{m ? 'Salvar' : 'Adicionar'}</BotaoEnviar>
    </form>
  );
}

export default async function Modelos({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await exigirPerfil('gestor');
  const sp = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from('modelos').select('*').order('marca').order('nome');
  return (
    <>
      <Cabecalho titulo="Modelos e capacidade" voltar="/cadastros" />
      <Flash ok={sp.ok} erro={sp.erro} />
      <p className="text-sm text-suave">Alterar a capacidade de um modelo atualiza todas as chopeiras desse modelo.</p>
      <section className="cartao"><h2 className="mb-2 font-bold">Novo modelo</h2><FormModelo /></section>
      {((data ?? []) as Modelo[]).map((m) => (
        <section key={m.id} className="cartao"><FormModelo m={m} /></section>
      ))}
    </>
  );
}
