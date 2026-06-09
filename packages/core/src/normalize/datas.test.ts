import { describe, expect, it } from 'vitest';
import { parseDataToISO } from './datas.js';

function esperaISO(raw: string | number | Date | null | undefined): string {
  const resultado = parseDataToISO(raw);
  if (!resultado.ok) {
    throw new Error(`Esperava ok para ${String(raw)}, recebeu: ${resultado.erro}`);
  }
  return resultado.valor;
}

describe('parseDataToISO', () => {
  it('aceita Date válido', () => {
    expect(esperaISO(new Date('2026-01-15T10:30:00Z'))).toBe('2026-01-15T10:30:00.000Z');
  });

  it('rejeita Date inválido', () => {
    expect(parseDataToISO(new Date('lixo')).ok).toBe(false);
  });

  it('parseia data brasileira sem hora como UTC meia-noite', () => {
    expect(esperaISO('15/01/2026')).toBe('2026-01-15T00:00:00.000Z');
  });

  it('parseia data brasileira com hora', () => {
    expect(esperaISO('15/01/2026 10:30:45')).toBe('2026-01-15T10:30:45.000Z');
  });

  it('parseia data brasileira com dia/mês de um dígito', () => {
    expect(esperaISO('5/3/2026')).toBe('2026-03-05T00:00:00.000Z');
  });

  it('rejeita data brasileira inexistente (31/02)', () => {
    expect(parseDataToISO('31/02/2026').ok).toBe(false);
  });

  it('parseia ISO date-only', () => {
    expect(esperaISO('2026-01-15')).toBe('2026-01-15T00:00:00.000Z');
  });

  it('parseia ISO com hora sem timezone como UTC', () => {
    expect(esperaISO('2026-01-15 10:30:00')).toBe('2026-01-15T10:30:00.000Z');
  });

  it('parseia ISO completo com Z', () => {
    expect(esperaISO('2026-01-15T10:30:00Z')).toBe('2026-01-15T10:30:00.000Z');
  });

  it('converte ISO com offset para UTC', () => {
    expect(esperaISO('2026-01-15T10:30:00-03:00')).toBe('2026-01-15T13:30:00.000Z');
  });

  it('parseia serial Excel (45292 = 01/01/2024)', () => {
    expect(esperaISO(45292)).toBe('2024-01-01T00:00:00.000Z');
  });

  it('parseia serial Excel fracionário (meio-dia)', () => {
    expect(esperaISO(45292.5)).toBe('2024-01-01T12:00:00.000Z');
  });

  it('parseia epoch em segundos', () => {
    expect(esperaISO(1_768_500_000)).toBe(new Date(1_768_500_000 * 1000).toISOString());
  });

  it('parseia epoch em milissegundos', () => {
    expect(esperaISO(1_768_500_000_000)).toBe(new Date(1_768_500_000_000).toISOString());
  });

  it('parseia string numérica como serial Excel', () => {
    expect(esperaISO('45292')).toBe('2024-01-01T00:00:00.000Z');
  });

  it('rejeita ausentes e vazios', () => {
    expect(parseDataToISO(null).ok).toBe(false);
    expect(parseDataToISO(undefined).ok).toBe(false);
    expect(parseDataToISO('').ok).toBe(false);
    expect(parseDataToISO('  ').ok).toBe(false);
  });

  it('rejeita formato desconhecido', () => {
    expect(parseDataToISO('ontem').ok).toBe(false);
    expect(parseDataToISO('2026/01/15').ok).toBe(false);
  });

  it('rejeita números fora dos intervalos suportados', () => {
    expect(parseDataToISO(-1).ok).toBe(false);
    expect(parseDataToISO(500_000).ok).toBe(false);
  });
});
