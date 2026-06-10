import type { TrackingSource, VinculoVeiculo } from './source.js';

/**
 * Fonte de rastreamento fictícia para desenvolvimento sem um Traccar real.
 * Reflete o estado esperado dos veículos do seed (e simula uma mudança:
 * o veículo da linha 003 voltou a operar).
 */
export class MockTrackingSource implements TrackingSource {
  readonly nome = 'mock';

  buscarVinculos(): Promise<VinculoVeiculo[]> {
    return Promise.resolve([
      { iccid: '8955170110001000001', placa: 'ABC1D23', ativo: true },
      { iccid: '8955170110001000002', placa: 'DEF4G56', ativo: true },
      { iccid: '8955170110001000003', placa: 'GHI7J89', ativo: false },
      { iccid: '8955170110001000005', placa: 'KLM0N12', ativo: true },
    ]);
  }
}
