// DTOs espelhando as respostas da API.

export type StatusLinha = 'ativo' | 'suspenso' | 'cancelado' | 'desconhecido';
export type UnidadeConsumo = 'bytes' | 'KB' | 'MB' | 'GB';

export interface Plano {
  id: string;
  nome: string;
  franquia_mb: number | null;
  custo_mensal: number;
}

export interface Broker {
  id: string;
  nome: string;
  tipo_ingestao: 'planilha' | 'scraping' | 'api';
  planos: Plano[];
}

export interface MapeamentoColunas {
  id: string;
  broker_id: string;
  nome: string;
  mapeamento: Record<string, string>;
  unidade_consumo: UnidadeConsumo;
  status_map: Record<string, StatusLinha>;
  plano_fixo: string | null;
  padrao: boolean;
}

export interface PreviewPlanilha {
  headers: string[];
  amostra: Record<string, unknown>[];
  totalLinhas: number;
  brokerDetectado: { id: string; nome: string } | null;
}

export interface ResumoIngestao {
  ingestaoId: string;
  status: 'sucesso' | 'parcial' | 'erro';
  qtdLinhas: number;
  qtdErros: number;
  erros: { registro: number | null; campo: string | null; mensagem: string }[];
}

export interface ResumoMes {
  referenciaMes: string;
  custoTotal: number;
  consumoTotalMb: number;
  qtdLinhas: number;
  qtdAltoConsumo: number;
  custoMesAnterior: number | null;
  variacaoPct: number | null;
  qtdOciosasPreliminar: number;
  custoDesperdicadoPreliminar: number;
  limiteOciosidadeDias: number;
}

export interface ResumoBroker {
  brokerId: string;
  broker: string;
  custo: number;
  consumoMb: number;
  qtdLinhas: number;
  qtdAltoConsumo: number;
}

export type ClassificacaoLinha = 'candidata' | 'protegida' | 'ativa' | 'cancelada';

export interface LinhaAvaliada {
  iccid: string;
  msisdn: string | null;
  broker: string;
  plano: string | null;
  status: StatusLinha;
  classificacao: ClassificacaoLinha;
  diasSemConexao: number | null;
  ultimaConexao: string | null;
  motivosProtecao: string[];
  custoMensal: number;
  economiaMensal: number;
  economiaAnual: number;
}

export interface ResumoCancelamento {
  referenciaMes: string;
  limiteOciosidadeDias: number;
  qtdCandidatas: number;
  qtdProtegidas: number;
  economiaMensalPotencial: number;
  economiaAnualPotencial: number;
}

export interface ResumoSyncVeiculos {
  fonte: string;
  recebidos: number;
  sincronizados: number;
  ignoradosSemLinha: number;
}

export interface LinhaAnalytics {
  iccid: string;
  msisdn: string | null;
  brokerId: string;
  broker: string;
  plano: string | null;
  status: StatusLinha;
  protegida: boolean;
  consumoMb: number;
  franquiaMb: number | null;
  custo: number;
  ultimaConexao: string | null;
  diasSemConexao: number | null;
  overageMb: number;
  altoConsumo: boolean;
  motivoAltoConsumo: 'overage' | 'p90' | null;
}
