export type StatusLinha = 'ativo' | 'suspenso' | 'cancelado' | 'desconhecido';

export type FonteIngestao = 'planilha' | 'scraping' | 'api';

/**
 * Schema canônico de uma linha M2M em um mês de referência.
 *
 * Todo adapter (planilha, scraping ou API) DEVE emitir este formato.
 * Regras de negócio e analytics leem exclusivamente este schema — nunca o
 * formato bruto da fonte.
 *
 * Invariantes garantidas pelos adapters:
 * - `consumoMb` e `franquiaMb` sempre em MB (ver normalize/unidades).
 * - `ultimaConexao` sempre em ISO 8601 UTC (ver normalize/datas).
 * - `referenciaMes` sempre no formato "YYYY-MM".
 */
export interface LinhaConsumoCanonico {
  /** Chave primária da linha (chip). */
  iccid: string;
  /** Número da linha, quando a fonte informa. */
  msisdn: string | null;
  /** Ex.: "Arqia", "Transmobi". */
  broker: string;
  /** Nome do plano contratado. */
  plano: string;
  franquiaMb: number | null;
  consumoMb: number;
  /** Custo mensal em R$. */
  custoMensal: number;
  status: StatusLinha;
  /** ISO 8601 UTC, ou null se a fonte não informa. */
  ultimaConexao: string | null;
  /** "YYYY-MM". */
  referenciaMes: string;
  fonte: FonteIngestao;
}

const REGEX_REFERENCIA_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isReferenciaMesValida(valor: string): boolean {
  return REGEX_REFERENCIA_MES.test(valor);
}
