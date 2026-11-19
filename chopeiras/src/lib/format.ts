import type { Perfil, Situacao, StatusAgendamento, StatusChopeira, TipoServico } from './types';

export const TZ = 'America/Sao_Paulo';

export const STATUS_CHOPEIRA: Record<StatusChopeira, { label: string; cor: string }> = {
  disponivel: { label: 'Disponível', cor: 'ok' },
  em_cliente: { label: 'Em cliente', cor: 'info' },
  em_manutencao: { label: 'Em manutenção', cor: 'alerta' },
  reservada: { label: 'Reservada', cor: 'marca' },
  baixada: { label: 'Baixada', cor: 'suave' },
};

export const TIPO_SERVICO: Record<TipoServico, { label: string; curto: string }> = {
  assepsia: { label: 'Assepsia', curto: 'Assepsia' },
  manutencao_preventiva: { label: 'Manutenção preventiva', curto: 'Preventiva' },
  manutencao_corretiva: { label: 'Manutenção corretiva', curto: 'Corretiva' },
};

export const STATUS_AGENDAMENTO: Record<StatusAgendamento, { label: string; cor: string }> = {
  agendado: { label: 'Agendado', cor: 'info' },
  realizado: { label: 'Realizado', cor: 'ok' },
  atrasado: { label: 'Atrasado', cor: 'perigo' },
  cancelado: { label: 'Cancelado', cor: 'suave' },
};

export const SITUACAO: Record<Situacao, { label: string; cor: string }> = {
  em_dia: { label: 'Em dia', cor: 'ok' },
  a_vencer: { label: 'A vencer', cor: 'alerta' },
  atrasado: { label: 'Atrasado', cor: 'perigo' },
};

export const PERFIL: Record<Perfil, string> = {
  gestor: 'Gestor comercial',
  vendedor: 'Vendedor',
  tecnico: 'Técnico',
};

export const TIPOS_CLIENTE = ['bar', 'restaurante', 'hotel', 'mercado', 'evento', 'distribuidor', 'outro'];

export const CHECKLIST: Record<TipoServico, string[]> = {
  assepsia: [
    'Linhas e serpentina higienizadas',
    'Torneiras desmontadas e limpas',
    'Engate/válvula do barril limpos',
    'Enxágue final com água potável',
    'Teste de extração e espuma',
  ],
  manutencao_preventiva: [
    'Pressão do CO₂ e regulador conferidos',
    'Mangueiras e conexões sem vazamento',
    'Compressor/refrigeração funcionando',
    'Temperatura de saída conferida',
    'Vedações e borrachas em bom estado',
    'Parte elétrica e cabo conferidos',
  ],
  manutencao_corretiva: [
    'Defeito identificado',
    'Peça substituída/reparada',
    'Teste de funcionamento ok',
  ],
};

/** Data de hoje (YYYY-MM-DD) no fuso da cervejaria */
export function hoje(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

export function somaDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** "2026-11-19" → "19/11/2026"; timestamp → "19/11/2026 14:30" */
export function fmtData(v?: string | null, comHora = false): string {
  if (!v) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [a, m, d] = v.split('-');
    return `${d}/${m}/${a}`;
  }
  const d = new Date(v);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(comHora ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d);
}

export function fmtDiaSemana(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: '2-digit', month: 'short' }).format(d);
}

export function relativoDias(dias: number): string {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias === -1) return 'ontem';
  return dias > 0 ? `em ${dias} dias` : `${-dias} dias atrasado`;
}

export function mapsUrl(endereco: string | null, cidade: string) {
  const q = [endereco, cidade].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function telLimpo(t?: string | null) {
  const n = (t ?? '').replace(/\D/g, '');
  if (!n) return '';
  return n.startsWith('55') ? n : `55${n}`;
}
