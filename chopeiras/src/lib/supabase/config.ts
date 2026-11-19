/** Nome fixo do cookie de sessão (igual no navegador e no servidor). */
export const COOKIE_SESSAO = { name: 'sb-chopeiras-auth-token' };

/** URL do Supabase vista pelo servidor (SUPABASE_URL_INTERNA permite apontar para outra rede, ex.: modo demo). */
export const urlServidor = () => process.env.SUPABASE_URL_INTERNA || process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** URL vista pelo navegador. "mesma-origem" = o próprio site serve a API (modo demonstração local). */
export const urlNavegador = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'mesma-origem' ? window.location.origin : process.env.NEXT_PUBLIC_SUPABASE_URL!;
