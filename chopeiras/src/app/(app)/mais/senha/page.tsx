'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Cabecalho } from '@/components/ui';

export default function TrocarSenha() {
  const [msg, setMsg] = useState<{ ok?: string; erro?: string } | null>(null);
  const [pend, setPend] = useState(false);
  return (
    <>
      <Cabecalho titulo="Trocar senha" voltar="/mais" />
      <form
        className="cartao flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const s = String(f.get('senha'));
          if (s.length < 8) return setMsg({ erro: 'Use ao menos 8 caracteres' });
          if (s !== f.get('confirma')) return setMsg({ erro: 'As senhas não conferem' });
          setPend(true);
          const { error } = await createClient().auth.updateUser({ password: s });
          setPend(false);
          setMsg(error ? { erro: error.message } : { ok: 'Senha alterada!' });
        }}
      >
        <input name="senha" type="password" autoComplete="new-password" placeholder="Nova senha" className="campo" required />
        <input name="confirma" type="password" autoComplete="new-password" placeholder="Repita a nova senha" className="campo" required />
        {msg?.erro && <p className="text-sm text-perigo">{msg.erro}</p>}
        {msg?.ok && <p className="text-sm text-ok">{msg.ok}</p>}
        <button className="btn-primario" disabled={pend}>{pend ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>
    </>
  );
}
