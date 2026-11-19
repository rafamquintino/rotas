'use client';
import { useActionState, useEffect, useState } from 'react';
import { entrar, recuperarSenha } from './actions';

export function FormLogin({ erroInicial }: { erroInicial?: string }) {
  const [esqueci, setEsqueci] = useState(false);
  const [estado, acao, pendente] = useActionState(esqueci ? recuperarSenha : entrar, erroInicial ? { erro: erroInicial } : null);
  // Ao chegar no login (saiu ou sessão expirou), apaga telas guardadas de outro usuário
  useEffect(() => {
    try { caches?.delete('paginas'); } catch {}
  }, []);
  const msg = estado as { erro?: string; ok?: string } | null;
  return (
    <form action={acao} className="flex flex-col gap-4">
      <div>
        <label className="rotulo" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required className="campo" />
      </div>
      {!esqueci && (
        <div>
          <label className="rotulo" htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" autoComplete="current-password" required className="campo" />
        </div>
      )}
      {msg?.erro && <p className="rounded-xl bg-perigo/15 px-3 py-2 text-sm text-perigo">{msg.erro}</p>}
      {msg?.ok && <p className="rounded-xl bg-ok/15 px-3 py-2 text-sm text-ok">{msg.ok}</p>}
      <button className="btn-primario" disabled={pendente}>
        {pendente ? 'Aguarde…' : esqueci ? 'Enviar link' : 'Entrar'}
      </button>
      <button type="button" className="text-sm font-medium text-marca" onClick={() => setEsqueci(!esqueci)}>
        {esqueci ? 'Voltar ao login' : 'Esqueci minha senha'}
      </button>
    </form>
  );
}
