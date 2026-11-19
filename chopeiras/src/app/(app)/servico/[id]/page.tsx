import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { urlsAssinadas } from '@/lib/fotos';
import { Cabecalho, Linha } from '@/components/ui';
import { fmtData, TIPO_SERVICO } from '@/lib/format';
import type { Servico } from '@/lib/types';

export default async function VerServico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data } = await sb.from('v_servicos').select('*').eq('id', id).single();
  if (!data) notFound();
  const s = data as Servico;
  const urls = await urlsAssinadas(sb, [...s.fotos_antes, ...s.fotos_depois, s.assinatura_url ?? '']);
  const Galeria = ({ t, fotos }: { t: string; fotos: string[] }) => fotos.length ? (
    <div>
      <div className="rotulo">{t}</div>
      <div className="grid grid-cols-3 gap-2">
        {fotos.map((f) => urls[f] && <a key={f} href={urls[f]} target="_blank" rel="noreferrer"><img src={urls[f]} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" /></a>)}
      </div>
    </div>
  ) : null;

  return (
    <>
      <Cabecalho titulo={TIPO_SERVICO[s.tipo].label} voltar={`/clientes/${s.cliente_id}`} />
      <section className="cartao">
        <Linha rotulo="Cliente"><Link className="text-marca" href={`/clientes/${s.cliente_id}`}>{s.cliente_nome}</Link></Linha>
        <Linha rotulo="Chopeira">{s.chopeira_id ? <Link className="text-marca" href={`/chopeiras/${s.chopeira_id}`}>{s.chopeira_codigo}</Link> : 'Todas'}</Linha>
        <Linha rotulo="Técnico">{s.tecnico_nome}</Linha>
        <Linha rotulo="Data">{fmtData(s.realizado_em, true)}</Linha>
        {s.aceite_nome && <Linha rotulo="Aceite">{s.aceite_nome}</Linha>}
      </section>
      <section className="cartao">
        <h2 className="mb-2 font-bold">Checklist</h2>
        <ul className="text-sm">
          {s.checklist.map((c) => <li key={c.item} className="py-1">{c.ok ? '✅' : '⬜'} {c.item}</li>)}
        </ul>
        {s.observacoes && <p className="mt-2 text-sm"><b>Obs.:</b> {s.observacoes}</p>}
      </section>
      {(s.fotos_antes.length > 0 || s.fotos_depois.length > 0 || s.assinatura_url) && (
        <section className="cartao flex flex-col gap-3">
          <Galeria t="Antes" fotos={s.fotos_antes} />
          <Galeria t="Depois" fotos={s.fotos_depois} />
          {s.assinatura_url && urls[s.assinatura_url] && (
            <div><div className="rotulo">Assinatura do cliente</div><img src={urls[s.assinatura_url]} alt="Assinatura" className="h-24 rounded-lg bg-white" /></div>
          )}
        </section>
      )}
    </>
  );
}
