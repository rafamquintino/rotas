export type Perfil = 'gestor' | 'vendedor' | 'tecnico';
export type Marca = 'Gorillaz' | 'Gonçalves';
export type Voltagem = '110V' | '220V';
export type StatusChopeira = 'disponivel' | 'em_cliente' | 'em_manutencao' | 'reservada' | 'baixada';
export type TipoServico = 'assepsia' | 'manutencao_preventiva' | 'manutencao_corretiva';
export type StatusAgendamento = 'agendado' | 'realizado' | 'atrasado' | 'cancelado';
export type Situacao = 'em_dia' | 'a_vencer' | 'atrasado';

export interface Usuario {
  id: string;
  nome: string;
  email: string | null;
  perfil: Perfil;
  cidades: string[];
  telefone: string | null;
  ativo: boolean;
}

export interface Modelo {
  id: string;
  nome: string;
  marca: Marca;
  vias: number;
  capacidade_lph: number;
  ativo: boolean;
}

export interface Chopeira {
  id: string;
  codigo: string;
  numero_serie: string | null;
  modelo_id: string | null;
  modelo_nome?: string | null;
  marca: Marca;
  voltagem: Voltagem;
  vias: number;
  capacidade_lph: number | null;
  status: StatusChopeira;
  cliente_id: string | null;
  cliente_nome?: string | null;
  cliente_cidade?: string | null;
  data_entrada_cliente: string | null;
  observacoes: string | null;
  fotos: string[];
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface Cliente {
  id: string;
  nome: string;
  cidade: string;
  endereco: string | null;
  contato: string | null;
  telefone: string | null;
  vendedor_id: string | null;
  vendedor_nome?: string | null;
  tipo: string;
  freq_assepsia_dias: number;
  freq_manutencao_dias: number;
  observacoes: string | null;
  ativo: boolean;
  qtd_chopeiras?: number;
  ultima_assepsia?: string | null;
  ultima_preventiva?: string | null;
  proxima_assepsia?: string | null;
  proxima_preventiva?: string | null;
  situacao?: Situacao;
  dias_atraso?: number;
}

export interface Agendamento {
  id: string;
  cliente_id: string;
  chopeira_id: string | null;
  tipo: TipoServico;
  data_prevista: string;
  status: StatusAgendamento;
  status_efetivo: StatusAgendamento;
  dias_para_vencer: number;
  tecnico_id: string | null;
  automatico: boolean;
  observacoes: string | null;
  cliente_nome: string;
  cidade: string;
  endereco: string | null;
  cliente_telefone: string | null;
  contato: string | null;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  vendedor_telefone: string | null;
  chopeira_codigo: string | null;
  tecnico_nome: string | null;
  tecnico_telefone: string | null;
}

export interface Servico {
  id: string;
  tipo: TipoServico;
  chopeira_id: string | null;
  chopeira_codigo?: string | null;
  cliente_id: string;
  cliente_nome?: string;
  cidade?: string;
  tecnico_id: string;
  tecnico_nome?: string | null;
  vendedor_nome?: string | null;
  realizado_em: string;
  checklist: { item: string; ok: boolean }[];
  observacoes: string | null;
  fotos_antes: string[];
  fotos_depois: string[];
  assinatura_url: string | null;
  aceite_nome: string | null;
}

export interface HistoricoStatus {
  id: number;
  chopeira_id: string;
  status_anterior: StatusChopeira | null;
  status_novo: StatusChopeira;
  cliente_anterior_nome: string | null;
  cliente_novo_nome: string | null;
  motivo: string | null;
  usuario_nome: string | null;
  criado_em: string;
}
