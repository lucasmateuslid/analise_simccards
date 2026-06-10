import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { LinhaBruta } from '@m2m/core';

export interface PlanilhaLida {
  headers: string[];
  rows: LinhaBruta[];
}

function ehCsv(nomeArquivo: string): boolean {
  return /\.csv$/i.test(nomeArquivo);
}

function lerCsv(buffer: Buffer): PlanilhaLida {
  const texto = buffer.toString('utf-8');
  const parsed = Papa.parse<LinhaBruta>(texto, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  });
  return {
    headers: parsed.meta.fields ?? [],
    rows: parsed.data,
  };
}

function lerXlsx(buffer: Buffer): PlanilhaLida {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const nomePlanilha = wb.SheetNames[0];
  if (nomePlanilha === undefined) {
    return { headers: [], rows: [] };
  }
  const sheet = wb.Sheets[nomePlanilha];
  if (sheet === undefined) {
    return { headers: [], rows: [] };
  }
  const rows = XLSX.utils.sheet_to_json<LinhaBruta>(sheet, { defval: null, raw: true });
  const matrizCabecalho = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, range: 0 });
  const primeira = matrizCabecalho[0] ?? [];
  const headers = primeira
    .map((c) => (c === null || c === undefined ? '' : String(c).trim()))
    .filter((c) => c !== '');
  return { headers, rows };
}

/** Lê um arquivo de planilha (XLSX ou CSV) em linhas brutas + cabeçalhos. */
export function lerPlanilha(buffer: Buffer, nomeArquivo: string): PlanilhaLida {
  return ehCsv(nomeArquivo) ? lerCsv(buffer) : lerXlsx(buffer);
}
