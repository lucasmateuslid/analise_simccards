export type {
  FonteIngestao,
  LinhaConsumoCanonico,
  StatusLinha,
} from './types/canonico.js';
export { isReferenciaMesValida } from './types/canonico.js';

export type {
  AppConfig,
  Broker,
  ConsumoMensal,
  Ingestao,
  Linha,
  MapeamentoColunasRow,
  Plano,
  StatusIngestao,
  TipoIngestaoBroker,
  VeiculoVinculo,
} from './types/db.js';

export { falha, ok } from './types/resultado.js';
export type { Resultado } from './types/resultado.js';

export type {
  ErroIngestao,
  ResultadoIngestao,
  SourceAdapter,
} from './adapters/adapter.js';

export { PlanilhaAdapter } from './adapters/planilha.js';
export type {
  ConfigPlanilhaAdapter,
  LinhaBruta,
  MapeamentoColunas,
} from './adapters/planilha.js';

export {
  normalizeConsumoToMb,
  parseConsumoToMb,
  parseNumero,
} from './normalize/unidades.js';
export type { UnidadeConsumo } from './normalize/unidades.js';

export { parseDataToISO } from './normalize/datas.js';
