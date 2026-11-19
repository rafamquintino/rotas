import { exigirPerfil } from '@/lib/auth';
import { Cabecalho } from '@/components/ui';
import { Importador } from './Importador';

export const metadata = { title: 'Importar planilha' };

export default async function Importar() {
  await exigirPerfil('gestor');
  return (
    <>
      <Cabecalho titulo="Importar planilha" voltar="/cadastros" />
      <Importador />
    </>
  );
}
