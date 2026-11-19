import Link from 'next/link';
import { getUsuario } from '@/lib/auth';
import { Navegacao } from '@/components/Navegacao';
import { StatusConexao } from '@/components/StatusConexao';
import { PERFIL } from '@/lib/format';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const u = await getUsuario();
  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-20 bg-malte text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icons/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
            <span className="font-bold leading-tight">
              Chopeiras <span className="block text-[11px] font-medium text-cevada">Cervejaria Gonçalves</span>
            </span>
          </Link>
          <Link href="/mais" className="ml-auto text-right text-xs leading-tight text-white/80">
            <span className="block font-semibold text-white">{u.nome.split(' ')[0]}</span>
            {PERFIL[u.perfil]}
          </Link>
        </div>
        <StatusConexao />
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">{children}</main>
      <Navegacao />
    </div>
  );
}
