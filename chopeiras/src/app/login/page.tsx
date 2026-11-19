import { FormLogin } from './FormLogin';

export const metadata = { title: 'Entrar' };

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col bg-malte">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pt-10 text-center text-white">
        <img src="/icons/icon.svg" alt="" width={84} height={84} className="rounded-2xl shadow-lg" />
        <h1 className="text-2xl font-bold">Controle de Chopeiras</h1>
        <p className="text-sm font-medium text-cevada">Cervejaria Gonçalves</p>
      </div>
      <div className="rounded-t-3xl bg-fundo px-6 pb-10 pt-8" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-sm">
          <FormLogin erroInicial={erro === 'inativo' ? 'Seu acesso está inativo. Fale com o gestor.' : undefined} />
          {process.env.NEXT_PUBLIC_SUPABASE_URL === 'mesma-origem' && (
            <div className="mt-6 rounded-xl border border-dashed border-marca/50 p-3 text-sm text-suave">
              <b className="text-texto">Modo demonstração</b> · senha <b>demo1234</b>
              <ul className="mt-1">
                <li>Gestor: gestor@demo.com</li>
                <li>Vendedor: vendedor@demo.com</li>
                <li>Técnico: tecnico@demo.com</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
