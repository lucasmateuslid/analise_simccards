import type { TrackingSource, VinculoVeiculo } from './source.js';

interface TraccarDevice {
  id: number;
  name?: string;
  uniqueId?: string;
  disabled?: boolean;
  attributes?: Record<string, unknown>;
}

/**
 * Adapter para Traccar. Credenciais SEMPRE via env (nunca em código).
 *
 * Mapeamento (ajustável conforme a instalação):
 *  - iccid  ← attributes.iccid, senão uniqueId
 *  - placa  ← attributes.placa, senão name
 *  - ativo  ← !disabled (veículo desativado no Traccar = fora de operação)
 */
export class TraccarSource implements TrackingSource {
  readonly nome = 'traccar';

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async buscarVinculos(): Promise<VinculoVeiculo[]> {
    const resp = await fetch(`${this.baseUrl.replace(/\/$/, '')}/api/devices`, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
    });
    if (!resp.ok) {
      throw new Error(`Traccar respondeu ${resp.status}`);
    }
    const devices = (await resp.json()) as TraccarDevice[];
    const vinculos: VinculoVeiculo[] = [];
    for (const d of devices) {
      const iccid = strAttr(d.attributes, 'iccid') ?? d.uniqueId;
      const placa = strAttr(d.attributes, 'placa') ?? d.name;
      if (iccid && placa) {
        vinculos.push({ iccid: iccid.trim(), placa: placa.trim(), ativo: d.disabled !== true });
      }
    }
    return vinculos;
  }
}

function strAttr(attrs: Record<string, unknown> | undefined, chave: string): string | undefined {
  const v = attrs?.[chave];
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}
