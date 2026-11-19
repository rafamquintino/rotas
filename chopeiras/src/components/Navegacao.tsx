'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITENS = [
  { href: '/', label: 'Início', icone: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { href: '/chopeiras', label: 'Estoque', icone: 'M7 3h10v4H7zM5 7h14v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM9 11v6M15 11v6' },
  { href: '/agenda', label: 'Agenda', icone: 'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5' },
  { href: '/clientes', label: 'Clientes', icone: 'M4 21V9l8-5 8 5v12M9 21v-6h6v6' },
  { href: '/mais', label: 'Mais', icone: 'M5 12h.01M12 12h.01M19 12h.01' },
];

export function Navegacao() {
  const path = usePathname();
  const ativo = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-borda bg-superficie/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {ITENS.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${ativo(i.href) ? 'text-marca' : 'text-suave'}`}
              aria-current={ativo(i.href) ? 'page' : undefined}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={ativo(i.href) ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d={i.icone} />
              </svg>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
