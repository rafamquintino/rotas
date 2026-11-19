import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash } from '@/components/ui';
import { FormServico } from './FormServico';
import type { TipoServico } from '@/lib/types';

export const metadata = { title: 'Registrar serviço' };

export default async function NovoServico({ searchParams }: { searchParams: Promise<{ ag?: string; cliente?: string }> }) {
  const u = await exigirPerfil('tecnico', 'gestor');
  const sp = await searchParams;
  const sb = await createClient();

  let agendamento: { id: string; tipo: TipoServico; chopeira_id: string | null } | null = null;
  let clienteId = sp.cliente;
  if (sp.ag) {
    const { data } = await sb.from('agendamentos').select('id, tipo, chopeira_id, cliente_id').eq('id', sp.ag).single();
    if (data) { agendamento = data; clienteId = data.cliente_id; }
  }
  if (!clienteId) return <Flash erro="Abra o serviço a partir da agenda ou da ficha do cliente." />;

  const [{ data: cliente }, { data: chs }] = await Promise.all([
    sb.from('clientes').select('id, nome, cidade').eq('id', clienteId).single(),
    sb.from('chopeiras').select('id, codigo').eq('cliente_id', clienteId).order('codigo'),
  ]);
  if (!cliente) return <Flash erro="Cliente não encontrado" />;

  return (
    <>
      <Cabecalho titulo="Registrar serviço" voltar="/agenda" />
      <FormServico tecnicoId={u.id} cliente={cliente} chopeiras={chs ?? []} agendamento={agendamento} />
    </>
  );
}
