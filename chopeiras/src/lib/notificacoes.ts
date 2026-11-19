import type { Agendamento, Usuario } from './types';
import { fmtData, mapsUrl, telLimpo, TIPO_SERVICO } from './format';

export interface Notificacao {
  destinatario_id: string;
  destinatario_nome: string;
  perfil: 'tecnico' | 'vendedor';
  telefone: string;
  amanha: number;
  atrasadas: number;
  mensagem: string;
  wa_link: string;
}

function linha(a: Agendamento) {
  const quando = a.dias_para_vencer < 0 ? `ATRASADA ${-a.dias_para_vencer}d` : fmtData(a.data_prevista);
  const ch = a.chopeira_codigo ? ` · ${a.chopeira_codigo}` : '';
  return `• ${a.cliente_nome} (${a.cidade})${ch} – ${TIPO_SERVICO[a.tipo].curto} – ${quando}\n  ${mapsUrl(a.endereco, a.cidade)}`;
}

/** Técnicos responsáveis: o designado no agendamento, senão quem atende a cidade, senão todos. */
export function tecnicosDoAgendamento(a: Agendamento, tecnicos: Usuario[]) {
  if (a.tecnico_id) return tecnicos.filter((t) => t.id === a.tecnico_id);
  const daCidade = tecnicos.filter((t) => t.cidades.some((c) => c.toLowerCase() === a.cidade.toLowerCase()));
  return daCidade.length ? daCidade : tecnicos;
}

/**
 * Monta as mensagens de WhatsApp para assepsias de amanhã e atrasadas.
 * O mesmo payload alimenta os links wa.me e o webhook do n8n / Evolution API.
 */
export function montarNotificacoes(ags: Agendamento[], usuarios: Usuario[]): Notificacao[] {
  const tecnicos = usuarios.filter((u) => u.perfil === 'tecnico' && u.ativo);
  const porDest = new Map<string, { u: Usuario; perfil: 'tecnico' | 'vendedor'; itens: Agendamento[] }>();
  const add = (u: Usuario, perfil: 'tecnico' | 'vendedor', a: Agendamento) => {
    const k = `${perfil}:${u.id}`;
    if (!porDest.has(k)) porDest.set(k, { u, perfil, itens: [] });
    porDest.get(k)!.itens.push(a);
  };

  for (const a of ags) {
    for (const t of tecnicosDoAgendamento(a, tecnicos)) add(t, 'tecnico', a);
    const v = usuarios.find((u) => u.id === a.vendedor_id);
    if (v) add(v, 'vendedor', a);
  }

  return [...porDest.values()].map(({ u, perfil, itens }) => {
    itens.sort((x, y) => x.cidade.localeCompare(y.cidade) || x.data_prevista.localeCompare(y.data_prevista));
    const atrasadas = itens.filter((a) => a.dias_para_vencer < 0);
    const amanha = itens.filter((a) => a.dias_para_vencer === 1);
    const partes = [`🍺 *Cervejaria Gonçalves – Chopeiras*\nOlá, ${u.nome.split(' ')[0]}!`];
    if (amanha.length) partes.push(`*Assepsias de amanhã (${amanha.length}):*\n${amanha.map(linha).join('\n')}`);
    if (atrasadas.length) partes.push(`*Atrasadas (${atrasadas.length}):*\n${atrasadas.map(linha).join('\n')}`);
    const mensagem = partes.join('\n\n');
    const tel = telLimpo(u.telefone);
    return {
      destinatario_id: u.id,
      destinatario_nome: u.nome,
      perfil,
      telefone: tel,
      amanha: amanha.length,
      atrasadas: atrasadas.length,
      mensagem,
      wa_link: `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`,
    };
  });
}
