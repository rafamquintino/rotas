import { createClient } from '@/lib/supabase/server';
import { getUsuario } from '@/lib/auth';
import { carregarNotificacoes } from '@/lib/notificacoes-dados';
import { fmtData, PERFIL } from '@/lib/format';
import { Selo, Vazio } from '@/components/ui';

export const metadata = { title: 'Avisos por WhatsApp' };
export const dynamic = 'force-dynamic';

export default async function Notificacoes() {
  const u = await getUsuario();
  const sb = await createClient();
  const { data_referencia, notificacoes } = await carregarNotificacoes(sb);
  // Gestor vê os avisos de todos; os demais, só o próprio
  const lista = u.perfil === 'gestor' ? notificacoes : notificacoes.filter((n) => n.destinatario_id === u.id);

  return (
    <>
      <h1 className="titulo">Avisos por WhatsApp</h1>
      <p className="text-sm text-suave">
        Assepsias de amanhã ({fmtData(data_referencia)}) e atrasadas. Toque para abrir a conversa com a mensagem pronta.
      </p>
      {lista.length === 0 ? <Vazio>Nenhuma assepsia para amanhã nem atrasada. 👍</Vazio> : lista.map((n) => (
        <article key={n.perfil + n.destinatario_id} className="cartao flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span><b>{n.destinatario_nome}</b><span className="block text-xs text-suave">{PERFIL[n.perfil]}{n.telefone ? ` · +${n.telefone}` : ' · sem telefone'}</span></span>
            <span className="flex gap-1">
              {n.amanha > 0 && <Selo cor="alerta">{n.amanha} amanhã</Selo>}
              {n.atrasadas > 0 && <Selo cor="perigo">{n.atrasadas} atrasada(s)</Selo>}
            </span>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-fundo p-3 font-sans text-xs text-suave">{n.mensagem}</pre>
          {n.telefone ? (
            <a href={n.wa_link} target="_blank" rel="noreferrer" className="btn btn-ok">💬 Enviar no WhatsApp</a>
          ) : (
            <p className="text-sm text-perigo">Cadastre o telefone deste usuário para enviar.</p>
          )}
        </article>
      ))}
      {u.perfil === 'gestor' && (
        <p className="text-xs text-suave">
          Automação: o endpoint <code>/api/notificacoes</code> envia este mesmo conteúdo para o n8n (variável N8N_WEBHOOK_URL) todo dia às 18h.
        </p>
      )}
    </>
  );
}
