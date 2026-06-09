import { describe, expect, it } from 'vitest';
import { normalizeConsumoToMb, parseConsumoToMb, parseNumero } from './unidades.js';

function esperaOk<T>(resultado: { ok: boolean; valor?: T; erro?: string }): T {
  if (!resultado.ok) {
    throw new Error(`Esperava ok, recebeu falha: ${resultado.erro}`);
  }
  return resultado.valor as T;
}

describe('normalizeConsumoToMb', () => {
  it('converte bytes para MB (base 1024)', () => {
    expect(esperaOk(normalizeConsumoToMb(1_048_576, 'bytes'))).toBe(1);
  });

  it('converte KB para MB', () => {
    expect(esperaOk(normalizeConsumoToMb(2048, 'KB'))).toBe(2);
  });

  it('mantém MB', () => {
    expect(esperaOk(normalizeConsumoToMb(512, 'MB'))).toBe(512);
  });

  it('converte GB para MB', () => {
    expect(esperaOk(normalizeConsumoToMb(1.5, 'GB'))).toBe(1536);
  });

  it('aceita zero', () => {
    expect(esperaOk(normalizeConsumoToMb(0, 'GB'))).toBe(0);
  });

  it('rejeita negativos', () => {
    expect(normalizeConsumoToMb(-1, 'MB').ok).toBe(false);
  });

  it('rejeita NaN e Infinity', () => {
    expect(normalizeConsumoToMb(Number.NaN, 'MB').ok).toBe(false);
    expect(normalizeConsumoToMb(Number.POSITIVE_INFINITY, 'MB').ok).toBe(false);
  });
});

describe('parseNumero', () => {
  it('aceita number direto', () => {
    expect(esperaOk(parseNumero(12.5))).toBe(12.5);
  });

  it('parseia decimal brasileiro com milhar: "1.234,56"', () => {
    expect(esperaOk(parseNumero('1.234,56'))).toBe(1234.56);
  });

  it('parseia decimal americano com milhar: "1,234.56"', () => {
    expect(esperaOk(parseNumero('1,234.56'))).toBe(1234.56);
  });

  it('parseia vírgula decimal simples: "12,5"', () => {
    expect(esperaOk(parseNumero('12,5'))).toBe(12.5);
  });

  it('parseia ponto decimal simples: "12.5"', () => {
    expect(esperaOk(parseNumero('12.5'))).toBe(12.5);
  });

  it('trata múltiplos grupos de ponto como milhar: "1.234.567"', () => {
    expect(esperaOk(parseNumero('1.234.567'))).toBe(1_234_567);
  });

  it('ignora espaços: " 1 234,5 "', () => {
    expect(esperaOk(parseNumero(' 1 234,5 '))).toBe(1234.5);
  });

  it('rejeita texto não numérico', () => {
    expect(parseNumero('abc').ok).toBe(false);
    expect(parseNumero('').ok).toBe(false);
    expect(parseNumero('12,3,4').ok).toBe(false);
  });
});

describe('parseConsumoToMb', () => {
  it('combina parsing BR + conversão de unidade', () => {
    expect(esperaOk(parseConsumoToMb('2.048,00', 'KB'))).toBe(2048 / 1024);
  });

  it('propaga falha de parsing', () => {
    expect(parseConsumoToMb('n/d', 'MB').ok).toBe(false);
  });

  it('propaga falha de valor negativo', () => {
    expect(parseConsumoToMb('-5', 'MB').ok).toBe(false);
  });
});
