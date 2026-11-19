import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { FormCliente } from '@/components/FormCliente';
import type { Cliente, Usuario } from '@/lib/types';

export default async function EditarCliente({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const u = await exigirPerfil('gestor', 'vendedor');
  const { id } = await params;
  const sp = await searchParams;
  const sb = await createClient();
  const [{ data: c }, { data: vendedores }] = await Promise.all([
    sb.from('clientes').select('*').eq('id', id).single(),
    sb.from('usuarios').select('*').eq('perfil', 'vendedor').eq('ativo', true).order('nome'),
  ]);
  if (!c) notFound();
  return (
    <>
      <Cabecalho titulo="Editar cliente" voltar={`/clientes/${id}`} />
      <Flash erro={sp.erro} />
      <FormCliente c={c as Cliente} vendedores={(vendedores ?? []) as Usuario[]} gestor={u.perfil === 'gestor'} />
    </>
  );
}
