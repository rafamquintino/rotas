import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { FormCliente } from '@/components/FormCliente';
import type { Usuario } from '@/lib/types';

export default async function NovoCliente({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const u = await exigirPerfil('gestor', 'vendedor');
  const sp = await searchParams;
  const sb = await createClient();
  const { data: vendedores } = await sb.from('usuarios').select('*').eq('perfil', 'vendedor').eq('ativo', true).order('nome');
  return (
    <>
      <Cabecalho titulo="Novo cliente" voltar="/clientes" />
      <Flash erro={sp.erro} />
      <FormCliente vendedores={(vendedores ?? []) as Usuario[]} gestor={u.perfil === 'gestor'} />
    </>
  );
}
