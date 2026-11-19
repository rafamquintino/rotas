import Link from 'next/link';

export const metadata = { title: 'Sem conexão' };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">📶</div>
      <h1 className="titulo">Sem conexão</h1>
      <p className="text-suave">
        Esta tela ainda não foi aberta com internet. Os serviços que você registrar ficam salvos no aparelho e
        são enviados quando o sinal voltar.
      </p>
      <Link href="/agenda" className="btn-primario w-full">Ir para a agenda</Link>
      <Link href="/servico/pendentes" className="btn-secundario w-full">Serviços aguardando envio</Link>
    </main>
  );
}
