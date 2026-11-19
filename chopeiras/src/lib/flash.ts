import 'server-only';
import { redirect } from 'next/navigation';

/** Redireciona com mensagem de sucesso/erro na URL (lida pelo componente <Flash/>). */
export function voltar(path: string, msg: { ok?: string; erro?: string }): never {
  const u = new URL(path, 'http://x');
  u.searchParams.delete('ok');
  u.searchParams.delete('erro');
  if (msg.ok) u.searchParams.set('ok', msg.ok);
  if (msg.erro) u.searchParams.set('erro', msg.erro);
  redirect(u.pathname + u.search);
}

export function erroMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = String((e as { message: string }).message);
    if (/row-level security|permission denied/i.test(m)) return 'Sem permissão para esta ação no seu perfil';
    if (/duplicate key/i.test(m)) return 'Já existe um registro com esse código ou número de série';
    return m;
  }
  return 'Erro inesperado';
}
