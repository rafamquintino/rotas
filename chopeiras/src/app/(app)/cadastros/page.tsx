import Link from 'next/link';
import { exigirPerfil } from '@/lib/auth';

export const metadata = { title: 'Cadastros' };

const ITENS = [
  { href: '/cadastros/chopeiras/nova', t: 'Nova chopeira', d: 'Código, série, marca, voltagem e vias' },
  { href: '/clientes/novo', t: 'Novo cliente', d: 'Estabelecimento, vendedor e frequências' },
  { href: '/cadastros/usuarios', t: 'Usuários', d: 'Gestores, vendedores e técnicos' },
  { href: '/cadastros/modelos', t: 'Modelos e capacidade', d: 'Litros por hora de cada modelo' },
  { href: '/cadastros/importar', t: 'Importar planilha (CSV)', d: 'Chopeiras, clientes ou usuários em lote' },
];

export default async function Cadastros() {
  await exigirPerfil('gestor');
  return (
    <>
      <h1 className="titulo">Cadastros</h1>
      <ul className="flex flex-col gap-2">
        {ITENS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="cartao flex items-center justify-between py-3 active:scale-[0.99]">
              <span><b>{i.t}</b><span className="block text-sm text-suave">{i.d}</span></span>
              <span className="text-xl text-suave">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
