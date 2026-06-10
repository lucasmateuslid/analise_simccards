import { describe, expect, it } from 'vitest';
import {
  avaliarCancelamento,
  type ConfigCancelamento,
  type EntradaAvaliacao,
} from './cancelamento.js';

const CONFIG: ConfigCancelamento = {
  limiteOciosidadeDias: 90,
  diasMinimosPosAtivacao: 30,
  agoraIso: '2026-06-10T00:00:00Z',
};

function entrada(over: Partial<EntradaAvaliacao> = {}): EntradaAvaliacao {
  return {
    iccid: 'A',
    status: 'ativo',
    protegidaManual: false,
    motivoProtecaoManual: null,
    ultimaConexao: '2026-01-01T00:00:00Z', // bem antiga → ociosa
    custoMensal: 10,
    veiculoAtivo: false,
    dataAtivacao: null,
    fidelidadeAte: null,
    ...over,
  };
}

describe('avaliarCancelamento', () => {
  it('classifica como candidata quando ociosa, sem veículo e sem proteção', () => {
    const r = avaliarCancelamento(entrada(), CONFIG);
    expect(r.classificacao).toBe('candidata');
    expect(r.diasSemConexao).toBeGreaterThan(90);
    expect(r.economiaMensal).toBe(10);
    expect(r.economiaAnual).toBe(120);
  });

  it('não é candidata se dentro do limite de ociosidade', () => {
    const r = avaliarCancelamento(entrada({ ultimaConexao: '2026-06-01T00:00:00Z' }), CONFIG);
    expect(r.classificacao).toBe('ativa');
    expect(r.economiaMensal).toBe(0);
  });

  it('protege quando o veículo está ativo no rastreamento', () => {
    const r = avaliarCancelamento(entrada({ veiculoAtivo: true }), CONFIG);
    expect(r.classificacao).toBe('protegida');
    expect(r.motivosProtecao).toContain('Veículo ativo no rastreamento');
  });

  it('protege dentro do período de fidelidade', () => {
    const r = avaliarCancelamento(entrada({ fidelidadeAte: '2026-12-31' }), CONFIG);
    expect(r.classificacao).toBe('protegida');
    expect(r.motivosProtecao).toContain('Dentro do período de fidelidade');
  });

  it('não protege se a fidelidade já expirou', () => {
    const r = avaliarCancelamento(entrada({ fidelidadeAte: '2026-01-01' }), CONFIG);
    expect(r.classificacao).toBe('candidata');
  });

  it('protege quando ativada há menos de 30 dias (mesmo nunca tendo conectado)', () => {
    const r = avaliarCancelamento(
      entrada({ dataAtivacao: '2026-05-25', ultimaConexao: null }),
      CONFIG,
    );
    expect(r.classificacao).toBe('protegida');
    expect(r.motivosProtecao[0]).toContain('menos de 30 dias');
  });

  it('protege por marcação manual usando o motivo informado', () => {
    const r = avaliarCancelamento(
      entrada({ protegidaManual: true, motivoProtecaoManual: 'Chip reserva/backup' }),
      CONFIG,
    );
    expect(r.classificacao).toBe('protegida');
    expect(r.motivosProtecao).toContain('Chip reserva/backup');
  });

  it('acumula múltiplos motivos de proteção', () => {
    const r = avaliarCancelamento(
      entrada({ veiculoAtivo: true, fidelidadeAte: '2026-12-31' }),
      CONFIG,
    );
    expect(r.motivosProtecao.length).toBeGreaterThanOrEqual(2);
  });

  it('linha sem conexão registrada e não protegida não vira candidata', () => {
    const r = avaliarCancelamento(entrada({ ultimaConexao: null }), CONFIG);
    expect(r.classificacao).toBe('ativa');
    expect(r.diasSemConexao).toBeNull();
  });

  it('linha cancelada é classificada como cancelada (nunca candidata)', () => {
    const r = avaliarCancelamento(entrada({ status: 'cancelado' }), CONFIG);
    expect(r.classificacao).toBe('cancelada');
  });

  it('proteção tem precedência sobre candidatura', () => {
    const r = avaliarCancelamento(
      entrada({ veiculoAtivo: true, ultimaConexao: '2024-01-01T00:00:00Z' }),
      CONFIG,
    );
    expect(r.classificacao).toBe('protegida');
    expect(r.economiaMensal).toBe(0);
  });
});
