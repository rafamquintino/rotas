import { createClient } from '@/lib/supabase/server';
import { exigirPerfil } from '@/lib/auth';
import { Cabecalho, Flash, Selo } from '@/components/ui';
import { BotaoEnviar } from '@/components/Botoes';
import { PERFIL } from '@/lib/format';
import type { Perfil, Usuario } from '@/lib/types';
import { atualizarUsuario, criarUsuario } from '../actions';

const Perfis = ({ v }: { v?: Perfil }) => (
  <select name="perfil" defaultValue={v ?? 'vendedor'} className="campo">
    {(Object.keys(PERFIL) as Perfil[]).map((p) => <option key={p} value={p}>{PERFIL[p]}</option>)}
  </select>
);

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const eu = await exigirPerfil('gestor');
  const sp = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from('usuarios').select('*').order('ativo', { ascending: false }).order('nome');
  const semChave = !process.env.SUPABASE_SERVICE_ROLE_KEY;

  return (
    <>
      <Cabecalho titulo="Usuários" voltar="/cadastros" />
      <Flash ok={sp.ok} erro={sp.erro} />
      <details className="cartao" open={!!sp.erro}>
        <summary className="cursor-pointer font-bold">+ Novo usuário</summary>
        {semChave && <p className="mt-2 text-sm text-perigo">Configure SUPABASE_SERVICE_ROLE_KEY no servidor para criar usuários.</p>}
        <form action={criarUsuario} className="mt-3 flex flex-col gap-3">
          <input name="nome" required placeholder="Nome" className="campo" />
          <input name="email" type="email" required placeholder="E-mail" className="campo" />
          <input name="senha" type="text" required minLength={8} placeholder="Senha inicial (8+ caracteres)" className="campo" autoComplete="off" />
          <Perfis />
          <input name="telefone" type="tel" placeholder="Telefone / WhatsApp (DDD + número)" className="campo" />
          <input name="cidades" placeholder="Cidades de atuação (separadas por vírgula)" className="campo" />
          <BotaoEnviar>Criar usuário</BotaoEnviar>
        </form>
      </details>
      {((data ?? []) as Usuario[]).map((u) => (
        <details key={u.id} className={`cartao ${u.ativo ? '' : 'opacity-60'}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
            <span><b>{u.nome}</b><span className="block text-xs text-suave">{u.email} · {u.cidades.join(', ') || 'todas as cidades'}</span></span>
            <span className="flex gap-1">{!u.ativo && <Selo cor="perigo">Inativo</Selo>}<Selo cor="marca">{PERFIL[u.perfil]}</Selo></span>
          </summary>
          <form action={atualizarUsuario} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="id" value={u.id} />
            <input name="nome" defaultValue={u.nome} className="campo" />
            <Perfis v={u.perfil} />
            <input name="telefone" defaultValue={u.telefone ?? ''} placeholder="Telefone" className="campo" />
            <input name="cidades" defaultValue={u.cidades.join(', ')} placeholder="Cidades de atuação" className="campo" />
            <label className="flex min-h-[44px] items-center gap-3">
              <input type="checkbox" name="ativo" defaultChecked={u.ativo} disabled={u.id === eu.id} className="h-5 w-5" /> Acesso ativo
              {u.id === eu.id && <input type="hidden" name="ativo" value="on" />}
            </label>
            <BotaoEnviar className="btn-secundario w-full">Salvar</BotaoEnviar>
          </form>
        </details>
      ))}
    </>
  );
}
