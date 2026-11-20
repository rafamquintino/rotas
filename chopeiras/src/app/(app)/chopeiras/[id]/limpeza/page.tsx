import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { BotaoEnviar } from '@/components/Botoes';
import { ConferirPatrimonio } from '@/components/LeitorPatrimonio';
import { CHECKLIST } from '@/lib/format';
import { concluirLimpeza } from '../../actions';

export const metadata = { title: 'Apontar limpeza' };

export default async function Limpeza({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; voltar?: string }> }) {
  await exigirPerfil('tecnico', 'gestor');
  const { id } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const { data: ch } = await sb.from('chopeiras').select('rotulo, patrimonio, marca, voltagem, vias, status').eq('id', id).single();
  if (!ch) notFound();

  return (
    <>
      <Cabecalho titulo={`Limpeza ${ch.patrimonio ?? ch.rotulo}`} voltar={sp.voltar ?? `/chopeiras/${id}`} />
      <p className="text-sm text-suave">{ch.marca} · {ch.voltagem} · {ch.vias} vias · voltou do aluguel</p>
      <Flash erro={sp.erro} />
      {ch.status !== 'em_limpeza' ? (
        <p className="cartao text-sm">Esta chopeira não está aguardando limpeza.</p>
      ) : (
        <form action={concluirLimpeza} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />
          {sp.voltar && <input type="hidden" name="voltar" value={sp.voltar} />}
          <ConferirPatrimonio esperado={ch.patrimonio} rotulo={ch.rotulo} />
          <section className="cartao">
            <h2 className="mb-2 font-bold">Checklist de limpeza</h2>
            <ul className="flex flex-col gap-1">
              {CHECKLIST.limpeza.map((i) => (
                <li key={i}>
                  <input type="hidden" name="item" value={i} />
                  <label className="flex min-h-[48px] cursor-pointer items-center gap-3 px-1">
                    <input type="checkbox" name="ok" value={i} className="h-6 w-6 accent-[rgb(var(--marca))]" />
                    <span>{i}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
          <section className="cartao">
            <label className="rotulo" htmlFor="obs">Observações</label>
            <textarea id="obs" name="obs" rows={3} className="campo" placeholder="Ex.: borracha da torneira trocada" />
          </section>
          <BotaoEnviar className="btn-ok w-full text-lg">✓ Pronta – liberar para alocação/aluguel</BotaoEnviar>
          <button name="resultado" value="defeito" className="btn-secundario w-full text-perigo">🔧 Achei defeito – mandar para manutenção</button>
        </form>
      )}
    </>
  );
}
