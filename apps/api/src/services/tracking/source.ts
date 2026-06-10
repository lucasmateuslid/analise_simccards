/** Vínculo veículo↔linha vindo do sistema de rastreamento. */
export interface VinculoVeiculo {
  iccid: string;
  placa: string;
  /** Veículo ainda em operação (não desativado/cancelado). */
  ativo: boolean;
}

/**
 * Fonte de verdade da regra "veículo ativo" do motor de cancelamento.
 * Cada sistema de rastreamento (Traccar, SGA, …) implementa este contrato.
 */
export interface TrackingSource {
  nome: string;
  buscarVinculos(): Promise<VinculoVeiculo[]>;
}
