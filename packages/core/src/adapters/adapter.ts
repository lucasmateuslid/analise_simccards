import type { FonteIngestao, LinhaConsumoCanonico } from '../types/canonico.js';

/** Erro de uma linha/registro individual durante a ingestão. */
export interface ErroIngestao {
  /** Índice do registro na fonte (linha da planilha, item da página), se aplicável. */
  registro: number | null;
  /** Campo que falhou na normalização, se identificável. */
  campo: string | null;
  mensagem: string;
}

export interface ResultadoIngestao {
  linhas: LinhaConsumoCanonico[];
  erros: ErroIngestao[];
}

/**
 * Contrato de toda fonte de dados (planilha, portal scrapeado ou API).
 *
 * O adapter é o ÚNICO lugar que conhece o formato bruto do broker. Ele é
 * responsável por normalizar unidades para MB e datas para ISO antes de
 * emitir o canônico. Registros inválidos viram `erros`, nunca exceptions.
 */
export interface SourceAdapter {
  broker: string;
  fonte: FonteIngestao;
  parse(raw: unknown, referenciaMes: string): Promise<ResultadoIngestao>;
}
