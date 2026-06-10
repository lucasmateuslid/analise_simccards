import type {
  FonteIngestao,
  LinhaConsumoCanonico,
  StatusLinha,
} from '../types/canonico.js';
import { isReferenciaMesValida } from '../types/canonico.js';
import { parseDataToISO } from '../normalize/datas.js';
import { parseConsumoToMb, parseNumero, type UnidadeConsumo } from '../normalize/unidades.js';
import type { ErroIngestao, ResultadoIngestao, SourceAdapter } from './adapter.js';

/** Campos canônicos que um template de planilha pode mapear para colunas do arquivo. */
export interface MapeamentoColunas {
  /** Coluna do ICCID — obrigatória (chave da linha). */
  iccid: string;
  msisdn?: string;
  plano?: string;
  consumo?: string;
  custo?: string;
  status?: string;
  ultimaConexao?: string;
  franquia?: string;
}

export interface ConfigPlanilhaAdapter {
  broker: string;
  mapeamento: MapeamentoColunas;
  /** Unidade da coluna de consumo no arquivo deste broker. */
  unidadeConsumo: UnidadeConsumo;
  /** Tradução de rótulos de status do broker → status canônico (case-insensitive). */
  statusMap?: Record<string, StatusLinha>;
  /** Usado quando o arquivo não traz coluna de plano. */
  planoFixo?: string;
}

/** Uma linha bruta da planilha: cabeçalho da coluna → valor da célula. */
export type LinhaBruta = Record<string, unknown>;

const STATUS_VALIDOS: readonly StatusLinha[] = ['ativo', 'suspenso', 'cancelado', 'desconhecido'];

function normalizarStatus(
  valor: unknown,
  statusMap: Record<string, StatusLinha> | undefined,
): StatusLinha {
  if (valor === null || valor === undefined) {
    return 'desconhecido';
  }
  const texto = String(valor).trim();
  if (texto === '') {
    return 'desconhecido';
  }
  const chave = texto.toLowerCase();

  if (statusMap) {
    for (const [rotulo, status] of Object.entries(statusMap)) {
      if (rotulo.toLowerCase() === chave) {
        return status;
      }
    }
  }
  const direto = STATUS_VALIDOS.find((s) => s === chave);
  return direto ?? 'desconhecido';
}

function leCelula(linha: LinhaBruta, coluna: string | undefined): unknown {
  if (coluna === undefined) {
    return undefined;
  }
  return linha[coluna];
}

function celulaVazia(valor: unknown): boolean {
  return valor === null || valor === undefined || String(valor).trim() === '';
}

/**
 * Adapter genérico para qualquer planilha (XLSX/CSV já parseada em linhas).
 *
 * Recebe linhas brutas (cabeçalho → célula) + o template de mapeamento do
 * broker e emite o canônico, normalizando consumo para MB e datas para ISO.
 * Cada linha inválida vira um `ErroIngestao` — nunca derruba a ingestão.
 */
export class PlanilhaAdapter implements SourceAdapter {
  readonly fonte: FonteIngestao = 'planilha';
  readonly broker: string;

  constructor(private readonly config: ConfigPlanilhaAdapter) {
    this.broker = config.broker;
  }

  parse(raw: unknown, referenciaMes: string): Promise<ResultadoIngestao> {
    const linhas: LinhaConsumoCanonico[] = [];
    const erros: ErroIngestao[] = [];

    if (!isReferenciaMesValida(referenciaMes)) {
      erros.push({
        registro: null,
        campo: 'referenciaMes',
        mensagem: `Referência de mês inválida: "${referenciaMes}" (esperado YYYY-MM)`,
      });
      return Promise.resolve({ linhas, erros });
    }

    if (!Array.isArray(raw)) {
      erros.push({
        registro: null,
        campo: null,
        mensagem: 'Conteúdo da planilha inválido: esperava uma lista de linhas',
      });
      return Promise.resolve({ linhas, erros });
    }

    const { mapeamento, unidadeConsumo, statusMap, planoFixo } = this.config;

    raw.forEach((bruta: unknown, indice) => {
      // índice humano: +2 (linha 1 = cabeçalho, dados começam na 2)
      const registro = indice + 2;
      if (typeof bruta !== 'object' || bruta === null) {
        erros.push({ registro, campo: null, mensagem: 'Linha não é um objeto' });
        return;
      }
      const linha = bruta as LinhaBruta;

      const iccidRaw = leCelula(linha, mapeamento.iccid);
      if (celulaVazia(iccidRaw)) {
        erros.push({ registro, campo: 'iccid', mensagem: 'ICCID ausente' });
        return;
      }
      const iccid = String(iccidRaw).trim();

      // Consumo: vazio é tratado como 0 (linha sem tráfego é um dado válido).
      let consumoMb = 0;
      const consumoRaw = leCelula(linha, mapeamento.consumo);
      if (!celulaVazia(consumoRaw)) {
        const resultado = parseConsumoToMb(consumoRaw as string | number, unidadeConsumo);
        if (!resultado.ok) {
          erros.push({ registro, campo: 'consumo', mensagem: resultado.erro });
          return;
        }
        consumoMb = resultado.valor;
      }

      let custoMensal = 0;
      const custoRaw = leCelula(linha, mapeamento.custo);
      if (!celulaVazia(custoRaw)) {
        const resultado = parseNumero(custoRaw as string | number);
        if (!resultado.ok) {
          erros.push({ registro, campo: 'custo', mensagem: resultado.erro });
          return;
        }
        if (resultado.valor < 0) {
          erros.push({ registro, campo: 'custo', mensagem: `Custo negativo: ${resultado.valor}` });
          return;
        }
        custoMensal = resultado.valor;
      }

      let franquiaMb: number | null = null;
      const franquiaRaw = leCelula(linha, mapeamento.franquia);
      if (!celulaVazia(franquiaRaw)) {
        const resultado = parseConsumoToMb(franquiaRaw as string | number, unidadeConsumo);
        if (!resultado.ok) {
          erros.push({ registro, campo: 'franquia', mensagem: resultado.erro });
          return;
        }
        franquiaMb = resultado.valor;
      }

      let ultimaConexao: string | null = null;
      const conexaoRaw = leCelula(linha, mapeamento.ultimaConexao);
      if (!celulaVazia(conexaoRaw)) {
        const resultado = parseDataToISO(conexaoRaw as string | number);
        if (!resultado.ok) {
          erros.push({ registro, campo: 'ultimaConexao', mensagem: resultado.erro });
          return;
        }
        ultimaConexao = resultado.valor;
      }

      const msisdnRaw = leCelula(linha, mapeamento.msisdn);
      const planoRaw = leCelula(linha, mapeamento.plano);
      const plano = celulaVazia(planoRaw) ? (planoFixo ?? '') : String(planoRaw).trim();

      linhas.push({
        iccid,
        msisdn: celulaVazia(msisdnRaw) ? null : String(msisdnRaw).trim(),
        broker: this.broker,
        plano,
        franquiaMb,
        consumoMb,
        custoMensal,
        status: normalizarStatus(leCelula(linha, mapeamento.status), statusMap),
        ultimaConexao,
        referenciaMes,
        fonte: this.fonte,
      });
    });

    return Promise.resolve({ linhas, erros });
  }
}
