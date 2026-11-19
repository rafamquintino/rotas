import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { FormChopeira } from '@/components/FormChopeira';
import type { Modelo } from '@/lib/types';

export default async function NovaChopeira({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await exigirPerfil('gestor');
  const sp = await searchParams;
  const sb = await createClient();
  const { data: modelos } = await sb.from('modelos').select('*').eq('ativo', true).order('nome');
  return (
    <>
      <Cabecalho titulo="Nova chopeira" voltar="/cadastros" />
      <Flash erro={sp.erro} />
      <FormChopeira modelos={(modelos ?? []) as Modelo[]} />
    </>
  );
}
