import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { FormChopeira } from '@/components/FormChopeira';
import type { Chopeira, Modelo } from '@/lib/types';

export default async function Editar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  await exigirPerfil('gestor');
  const { id } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const [{ data: c }, { data: modelos }] = await Promise.all([
    sb.from('chopeiras').select('*').eq('id', id).single(),
    sb.from('modelos').select('*').eq('ativo', true).order('nome'),
  ]);
  if (!c) notFound();
  return (
    <>
      <Cabecalho titulo={`Editar ${c.codigo}`} voltar={`/chopeiras/${id}`} />
      <Flash erro={sp.erro} />
      <FormChopeira c={c as Chopeira} modelos={(modelos ?? []) as Modelo[]} />
    </>
  );
}
