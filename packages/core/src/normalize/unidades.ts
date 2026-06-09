import { falha, ok, type Resultado } from '../types/resultado.js';

export type UnidadeConsumo = 'bytes' | 'KB' | 'MB' | 'GB';

/**
 * Fatores binários (1 GB = 1024 MB), padrão das operadoras M2M para franquia
 * de dados. Se algum broker usar base decimal, o adapter dele converte antes.
 */
const FATOR_PARA_MB: Record<UnidadeConsumo, number> = {
  bytes: 1 / (1024 * 1024),
  KB: 1 / 1024,
  MB: 1,
  GB: 1024,
};

/** Converte um valor de consumo para MB. Rejeita negativos e não-finitos. */
export function normalizeConsumoToMb(
  valor: number,
  unidade: UnidadeConsumo,
): Resultado<number> {
  if (!Number.isFinite(valor)) {
    return falha(`Valor de consumo não numérico: ${String(valor)}`);
  }
  if (valor < 0) {
    return falha(`Valor de consumo negativo: ${valor}`);
  }
  return ok(valor * FATOR_PARA_MB[unidade]);
}

/**
 * Converte texto numérico de planilhas para number, aceitando os formatos
 * brasileiro ("1.234,56") e americano ("1,234.56").
 *
 * Heurística quando há apenas UM separador:
 * - só vírgula → decimal brasileiro ("12,5" → 12.5);
 * - só ponto seguido de exatamente 3 dígitos no fim e valor com mais grupos
 *   ("1.234.567") → milhar; caso contrário ponto é decimal ("12.5" → 12.5).
 */
export function parseNumero(raw: string | number): Resultado<number> {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? ok(raw) : falha(`Número inválido: ${String(raw)}`);
  }

  const texto = raw.trim().replace(/\s/g, '');
  if (texto === '') {
    return falha('Valor numérico vazio');
  }

  const temVirgula = texto.includes(',');
  const temPonto = texto.includes('.');
  let normalizado: string;

  if (temVirgula && temPonto) {
    // O separador que aparece por último é o decimal.
    normalizado =
      texto.lastIndexOf(',') > texto.lastIndexOf('.')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto.replace(/,/g, '');
  } else if (temVirgula) {
    normalizado = texto.replace(/\./g, '').replace(',', '.');
  } else if (temPonto && /^\d{1,3}(\.\d{3}){2,}$/.test(texto)) {
    // "1.234.567" — múltiplos grupos de 3: separador de milhar.
    normalizado = texto.replace(/\./g, '');
  } else {
    normalizado = texto;
  }

  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) {
    return falha(`Texto não numérico: "${raw}"`);
  }

  const valor = Number(normalizado);
  return Number.isFinite(valor) ? ok(valor) : falha(`Número inválido: "${raw}"`);
}

/**
 * Atalho para o caso comum de planilha: texto bruto + unidade conhecida → MB.
 */
export function parseConsumoToMb(
  raw: string | number,
  unidade: UnidadeConsumo,
): Resultado<number> {
  const numero = parseNumero(raw);
  if (!numero.ok) {
    return numero;
  }
  return normalizeConsumoToMb(numero.valor, unidade);
}
