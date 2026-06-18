import { buscarTudo, getSupabaseAdmin } from '../supabase.js';
import { MockTrackingSource } from './tracking/mock.js';
import type { TrackingSource } from './tracking/source.js';
import { TraccarSource } from './tracking/traccar.js';

export interface ResumoSyncVeiculos {
  fonte: string;
  recebidos: number;
  sincronizados: number;
  ignoradosSemLinha: number;
}

/**
 * Seleciona a fonte de rastreamento por env:
 *  - TRACKING_SOURCE=traccar  → TRACCAR_URL + TRACCAR_TOKEN
 *  - caso contrário           → mock (dev)
 * Credenciais nunca em código.
 */
export function criarTrackingSource(): TrackingSource {
  if (process.env['TRACKING_SOURCE'] === 'traccar') {
    const url = process.env['TRACCAR_URL'];
    const token = process.env['TRACCAR_TOKEN'];
    if (!url || !token) {
      throw new Error('TRACCAR_URL e TRACCAR_TOKEN são obrigatórios para TRACKING_SOURCE=traccar');
    }
    return new TraccarSource(url, token);
  }
  return new MockTrackingSource();
}

/**
 * Sincroniza veiculos_vinculo a partir do rastreamento. Só grava vínculos
 * cujo ICCID já existe em `linhas` (respeita a FK) — os demais são reportados.
 */
export async function sincronizarVeiculos(source: TrackingSource): Promise<ResumoSyncVeiculos> {
  const supabase = getSupabaseAdmin();
  const vinculos = await source.buscarVinculos();

  const linhasExistentes = await buscarTudo<{ iccid: string }>((de, ate) =>
    supabase.from('linhas').select('iccid').range(de, ate),
  );
  const iccidsValidos = new Set(linhasExistentes.map((l) => l.iccid));

  const validos = vinculos.filter((v) => iccidsValidos.has(v.iccid));
  const ignorados = vinculos.length - validos.length;

  if (validos.length > 0) {
    const registros = validos.map((v) => ({
      iccid: v.iccid,
      placa: v.placa,
      ativo: v.ativo,
      atualizado_em: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('veiculos_vinculo')
      .upsert(registros, { onConflict: 'iccid,placa' });
    if (error) {
      throw new Error(`Falha ao gravar vínculos: ${error.message}`);
    }
  }

  return {
    fonte: source.nome,
    recebidos: vinculos.length,
    sincronizados: validos.length,
    ignoradosSemLinha: ignorados,
  };
}
