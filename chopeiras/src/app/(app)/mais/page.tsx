import Link from 'next/link';
import { getUsuario } from '@/lib/auth';
import { AlternarTema } from '@/components/Tema';
import { sair } from '@/app/login/actions';
import { PERFIL } from '@/lib/format';

export const metadata = { title: 'Mais' };

export default async function Mais() {
  const u = await getUsuario();
  const links = [
    { href: '/notificacoes', t: '💬 Avisos por WhatsApp', p: ['gestor', 'tecnico', 'vendedor'] },
    { href: '/servico/pendentes', t: '📶 Serviços aguardando envio', p: ['gestor', 'tecnico'] },
    { href: '/relatorios', t: '📊 Relatórios', p: ['gestor'] },
    { href: '/cadastros', t: '🗂️ Cadastros e importação', p: ['gestor'] },
    { href: '/mais/senha', t: '🔑 Trocar senha', p: ['gestor', 'tecnico', 'vendedor'] },
  ].filter((l) => l.p.includes(u.perfil));
  return (
    <>
      <section className="cartao">
        <div className="text-lg font-bold">{u.nome}</div>
        <div className="text-sm text-suave">{PERFIL[u.perfil]} · {u.email}</div>
        {u.cidades.length > 0 && <div className="text-sm text-suave">Cidades: {u.cidades.join(', ')}</div>}
      </section>
      <nav className="flex flex-col gap-2">
        {links.map((l) => <Link key={l.href} href={l.href} className="btn-secundario justify-start">{l.t}</Link>)}
        <AlternarTema />
      </nav>
      <form action={sair}><button className="btn-secundario w-full text-perigo">Sair</button></form>
    </>
  );
}
