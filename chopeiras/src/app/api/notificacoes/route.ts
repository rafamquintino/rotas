import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { carregarNotificacoes } from '@/lib/notificacoes-dados';

/**
 * Webhook para n8n / Evolution API.
 *  GET  → devolve o payload (o n8n pode buscar daqui).
 *  GET pelo cron da Vercel (todo dia 18h) ou POST → monta e envia para N8N_WEBHOOK_URL.
 * Autenticação: header "Authorization: Bearer <CRON_SECRET>".
 *
 * Payload: { evento, data_referencia, gerado_em, notificacoes: [{ destinatario_nome, perfil, telefone, mensagem, wa_link, amanha, atrasadas }] }
 * No n8n, para cada item de "notificacoes", chame o nó HTTP da Evolution API:
 *   POST {EVOLUTION_URL}/message/sendText/{instancia}  body { number: telefone, text: mensagem }
 */
async function executar(req: NextRequest, enviar: boolean) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  }
  const { data_referencia, notificacoes } = await carregarNotificacoes(createAdminClient());
  const payload = { evento: 'assepsias_amanha_e_atrasadas', data_referencia, gerado_em: new Date().toISOString(), notificacoes };

  let envio: { status: number } | { erro: string } | null = null;
  const destino = process.env.N8N_WEBHOOK_URL;
  if (enviar && destino) {
    try {
      const r = await fetch(destino, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      envio = { status: r.status };
    } catch (e) {
      envio = { erro: (e as Error).message };
    }
  }
  return NextResponse.json({ ...payload, envio_n8n: envio ?? (destino ? 'não enviado' : 'N8N_WEBHOOK_URL não configurada') });
}

export async function GET(req: NextRequest) {
  // O cron da Vercel chama via GET com o header x-vercel-cron
  return executar(req, req.headers.has('x-vercel-cron') || req.nextUrl.searchParams.get('enviar') === '1');
}

export async function POST(req: NextRequest) {
  return executar(req, true);
}
