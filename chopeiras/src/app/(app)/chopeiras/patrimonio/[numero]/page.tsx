import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { Cabecalho } from '@/components/ui';

/** Destino da leitura da etiqueta: abre a ficha da chopeira com esse patrimônio. */
export default async function PorPatrimonio({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const u = await getUsuario();
  const sb = await createClient();
  const { data } = await sb.from('chopeiras').select('id').eq('patrimonio', numero).maybeSingle();
  if (data) redirect(`/chopeiras/${data.id}`);
  return (
    <>
      <Cabecalho titulo={`Patrimônio ${numero}`} voltar="/chopeiras" />
      <div className="cartao flex flex-col gap-3 text-center">
        <p>Nenhuma chopeira cadastrada com o patrimônio <b>{numero}</b>.</p>
        <p className="text-sm text-suave">Se a etiqueta acabou de ser colada, abra a chopeira e preencha o patrimônio na edição.</p>
        {u.perfil === 'gestor' && (
          <Link href={`/cadastros/chopeiras/nova?patrimonio=${numero}`} className="btn-primario">Cadastrar chopeira {numero}</Link>
        )}
        <Link href="/chopeiras" className="btn-secundario">Voltar ao estoque</Link>
      </div>
    </>
  );
}
