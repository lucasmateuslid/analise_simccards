import type { FonteIngestao, StatusLinha } from './canonico.js';

/** Tipos espelhando as tabelas do Supabase (snake_case como no banco). */

export type TipoIngestaoBroker = FonteIngestao;

export interface Broker {
  id: string;
  nome: string;
  tipo_ingestao: TipoIngestaoBroker;
  config_json: Record<string, unknown>;
  criado_em: string;
}

export interface Plano {
  id: string;
  broker_id: string;
  nome: string;
  franquia_mb: number | null;
  custo_mensal: number;
  criado_em: string;
}

export interface Linha {
  iccid: string;
  msisdn: string | null;
  broker_id: string;
  plano_id: string | null;
  status: StatusLinha;
  protegida: boolean;
  motivo_protecao: string | null;
  data_ativacao: string | null;
  fidelidade_ate: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ConsumoMensal {
  id: string;
  iccid: string;
  referencia_mes: string;
  consumo_mb: number;
  custo: number;
  ultima_conexao: string | null;
  fonte: FonteIngestao;
  criado_em: string;
}

export interface VeiculoVinculo {
  iccid: string;
  placa: string;
  ativo: boolean;
  atualizado_em: string;
}

export type StatusIngestao = 'sucesso' | 'parcial' | 'erro';

export interface Ingestao {
  id: string;
  fonte: FonteIngestao;
  broker_id: string | null;
  qtd_linhas: number;
  status: StatusIngestao;
  erros: unknown[];
  criado_em: string;
}

export interface AppConfig {
  chave: string;
  valor: unknown;
  atualizado_em: string;
}

export interface MapeamentoColunasRow {
  id: string;
  broker_id: string;
  nome: string;
  mapeamento: Record<string, string>;
  unidade_consumo: 'bytes' | 'KB' | 'MB' | 'GB';
  status_map: Record<string, StatusLinha>;
  plano_fixo: string | null;
  padrao: boolean;
  criado_em: string;
  atualizado_em: string;
}
