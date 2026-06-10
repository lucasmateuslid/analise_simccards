import type { StatusLinha } from '../types/canonico.js';

/** Dados de uma linha necessários para avaliar cancelamento. */
export interface EntradaAvaliacao {
  iccid: string;
  status: StatusLinha;
  /** Marcação manual ("manter" / chip reserva). */
  protegidaManual: boolean;
  motivoProtecaoManual: string | null;
  /** ISO ou null (nunca conectou). */
  ultimaConexao: string | null;
  custoMensal: number;
  /** Veículo ainda ativo no rastreamento (parado ≠ cancelado). */
  veiculoAtivo: boolean;
  /** ISO date ou null. */
  dataAtivacao: string | null;
  /** ISO date ou null. */
  fidelidadeAte: string | null;
}

export interface ConfigCancelamento {
  limiteOciosidadeDias: number;
  diasMinimosPosAtivacao: number;
  /** Injetável para testes determinísticos; default = agora. */
  agoraIso?: string;
}

export type ClassificacaoLinha = 'candidata' | 'protegida' | 'ativa' | 'cancelada';

export interface ResultadoAvaliacao {
  iccid: string;
  classificacao: ClassificacaoLinha;
  diasSemConexao: number | null;
  /** Motivos de proteção (quando classificacao = 'protegida'). */
  motivosProtecao: string[];
  custoMensal: number;
  /** Economia se cancelada — 0 quando não é candidata. */
  economiaMensal: number;
  economiaAnual: number;
}

const MS_POR_DIA = 86_400_000;

function diasDesde(isoData: string | null, agora: number): number | null {
  if (isoData === null) {
    return null;
  }
  const t = Date.parse(isoData);
  if (Number.isNaN(t)) {
    return null;
  }
  return Math.floor((agora - t) / MS_POR_DIA);
}

/**
 * Avalia uma linha segundo as regras de cancelamento.
 *
 * Proteção (QUALQUER uma → 'protegida', com motivo):
 *  - veículo ainda ativo no rastreamento;
 *  - dentro do período de fidelidade;
 *  - ativada há menos de N dias;
 *  - marcada manualmente (manter / chip reserva).
 *
 * Candidata a cancelamento (TODAS verdadeiras):
 *  - diasSemConexao > limite de ociosidade;
 *  - status != 'cancelado';
 *  - não protegida;
 *  - veículo não ativo.
 *
 * Nunca cancela — apenas classifica para a fila de revisão.
 */
export function avaliarCancelamento(
  entrada: EntradaAvaliacao,
  config: ConfigCancelamento,
): ResultadoAvaliacao {
  const agora = config.agoraIso ? Date.parse(config.agoraIso) : Date.now();
  const diasSemConexao = diasDesde(entrada.ultimaConexao, agora);

  const base = {
    iccid: entrada.iccid,
    diasSemConexao,
    custoMensal: entrada.custoMensal,
    economiaMensal: 0,
    economiaAnual: 0,
  };

  if (entrada.status === 'cancelado') {
    return { ...base, classificacao: 'cancelada', motivosProtecao: [] };
  }

  const motivosProtecao: string[] = [];
  if (entrada.veiculoAtivo) {
    motivosProtecao.push('Veículo ativo no rastreamento');
  }
  if (entrada.fidelidadeAte !== null) {
    const t = Date.parse(entrada.fidelidadeAte);
    if (!Number.isNaN(t) && t > agora) {
      motivosProtecao.push('Dentro do período de fidelidade');
    }
  }
  const diasAtivacao = diasDesde(entrada.dataAtivacao, agora);
  if (diasAtivacao !== null && diasAtivacao < config.diasMinimosPosAtivacao) {
    motivosProtecao.push(`Ativada há menos de ${config.diasMinimosPosAtivacao} dias`);
  }
  if (entrada.protegidaManual) {
    motivosProtecao.push(entrada.motivoProtecaoManual ?? 'Marcada manualmente para manter');
  }

  if (motivosProtecao.length > 0) {
    return { ...base, classificacao: 'protegida', motivosProtecao };
  }

  const ehCandidata = diasSemConexao !== null && diasSemConexao > config.limiteOciosidadeDias;
  if (ehCandidata) {
    return {
      ...base,
      classificacao: 'candidata',
      motivosProtecao: [],
      economiaMensal: entrada.custoMensal,
      economiaAnual: entrada.custoMensal * 12,
    };
  }

  return { ...base, classificacao: 'ativa', motivosProtecao: [] };
}
