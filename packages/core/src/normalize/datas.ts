import { falha, ok, type Resultado } from '../types/resultado.js';

/** Epoch do serial de datas do Excel (sistema 1900, com o bug do ano bissexto já compensado). */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_POR_DIA = 86_400_000;

/** Limites da heurística numérica (ver parseDataToISO). */
const MAX_SERIAL_EXCEL = 200_000; // ~ano 2447
const MIN_EPOCH_SEGUNDOS = 1_000_000_000; // 2001-09-09
const MIN_EPOCH_MS = 100_000_000_000; // 1973 em ms — qualquer epoch-ms real é maior

const REGEX_BR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const REGEX_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

function montarUtc(
  ano: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  segundo = 0,
): Resultado<string> {
  const data = new Date(Date.UTC(ano, mes - 1, dia, hora, minuto, segundo));
  // Roundtrip detecta datas impossíveis (ex.: 31/02 viraria 02/03 ou 03/03).
  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia ||
    data.getUTCHours() !== hora ||
    data.getUTCMinutes() !== minuto ||
    data.getUTCSeconds() !== segundo
  ) {
    return falha(`Data inexistente no calendário: ${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`);
  }
  return ok(data.toISOString());
}

/**
 * Normaliza datas de qualquer fonte para ISO 8601 UTC.
 *
 * Aceita:
 * - `Date`;
 * - string ISO ("2026-01-15", "2026-01-15 10:30:00", "2026-01-15T10:30:00Z");
 * - string brasileira ("15/01/2026", "15/01/2026 10:30:45");
 * - número: serial Excel (< 200 000), epoch em segundos ou em milissegundos.
 *
 * Datas/horas sem fuso explícito são interpretadas como UTC — os relatórios
 * dos brokers não informam timezone, e consistência importa mais que o fuso
 * exato para a regra de ociosidade (precisão de dias).
 */
export function parseDataToISO(
  raw: string | number | Date | null | undefined,
): Resultado<string> {
  if (raw === null || raw === undefined) {
    return falha('Data ausente');
  }

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime())
      ? falha('Date inválido')
      : ok(raw.toISOString());
  }

  if (typeof raw === 'number') {
    return parseNumeroParaISO(raw);
  }

  const texto = raw.trim();
  if (texto === '') {
    return falha('Data vazia');
  }

  const br = REGEX_BR.exec(texto);
  if (br) {
    return montarUtc(
      Number(br[3]),
      Number(br[2]),
      Number(br[1]),
      br[4] !== undefined ? Number(br[4]) : 0,
      br[5] !== undefined ? Number(br[5]) : 0,
      br[6] !== undefined ? Number(br[6]) : 0,
    );
  }

  const iso = REGEX_ISO.exec(texto);
  if (iso) {
    return montarUtc(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
      iso[4] !== undefined ? Number(iso[4]) : 0,
      iso[5] !== undefined ? Number(iso[5]) : 0,
      iso[6] !== undefined ? Number(iso[6]) : 0,
    );
  }

  // ISO completo com timezone (ex.: "2026-01-15T10:30:00-03:00" ou "...Z").
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(texto)) {
    const data = new Date(texto);
    if (!Number.isNaN(data.getTime())) {
      return ok(data.toISOString());
    }
  }

  if (/^\d+(\.\d+)?$/.test(texto)) {
    return parseNumeroParaISO(Number(texto));
  }

  return falha(`Formato de data não reconhecido: "${raw}"`);
}

function parseNumeroParaISO(valor: number): Resultado<string> {
  if (!Number.isFinite(valor) || valor <= 0) {
    return falha(`Data numérica inválida: ${String(valor)}`);
  }
  let ms: number;
  if (valor < MAX_SERIAL_EXCEL) {
    ms = EXCEL_EPOCH_MS + valor * MS_POR_DIA;
  } else if (valor >= MIN_EPOCH_MS) {
    ms = valor;
  } else if (valor >= MIN_EPOCH_SEGUNDOS) {
    ms = valor * 1000;
  } else {
    return falha(`Data numérica fora dos intervalos suportados: ${valor}`);
  }
  const data = new Date(Math.round(ms));
  return Number.isNaN(data.getTime())
    ? falha(`Data numérica inválida: ${valor}`)
    : ok(data.toISOString());
}
