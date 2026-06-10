import {
  PlanilhaAdapter,
  type ConfigPlanilhaAdapter,
  type ErroIngestao,
  type LinhaBruta,
  type LinhaConsumoCanonico,
  type MapeamentoColunasRow,
  type StatusIngestao,
} from '@m2m/core';
import { getSupabaseAdmin } from '../supabase.js';

const TAMANHO_LOTE = 500;

export interface ResumoIngestao {
  ingestaoId: string;
  status: StatusIngestao;
  qtdLinhas: number;
  qtdErros: number;
  erros: ErroIngestao[];
}

function lotes<T>(itens: T[], tamanho: number): T[][] {
  const resultado: T[][] = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    resultado.push(itens.slice(i, i + tamanho));
  }
  return resultado;
}

function configDoMapeamento(
  broker: string,
  mapeamento: MapeamentoColunasRow,
): ConfigPlanilhaAdapter {
  const m = mapeamento.mapeamento;
  return {
    broker,
    unidadeConsumo: mapeamento.unidade_consumo,
    statusMap: mapeamento.status_map,
    planoFixo: mapeamento.plano_fixo ?? undefined,
    mapeamento: {
      iccid: m['iccid'] ?? '',
      msisdn: m['msisdn'],
      plano: m['plano'],
      consumo: m['consumo'],
      custo: m['custo'],
      status: m['status'],
      ultimaConexao: m['ultimaConexao'],
      franquia: m['franquia'],
    },
  };
}

/** Garante que todos os planos referenciados existam e devolve nome → id. */
async function resolverPlanos(
  brokerId: string,
  linhas: LinhaConsumoCanonico[],
): Promise<Map<string, string>> {
  const supabase = getSupabaseAdmin();
  const porNome = new Map<string, LinhaConsumoCanonico>();
  for (const linha of linhas) {
    if (linha.plano !== '' && !porNome.has(linha.plano)) {
      porNome.set(linha.plano, linha);
    }
  }

  if (porNome.size > 0) {
    const novos = [...porNome.values()].map((l) => ({
      broker_id: brokerId,
      nome: l.plano,
      franquia_mb: l.franquiaMb,
      custo_mensal: l.custoMensal,
    }));
    // ignoreDuplicates: não sobrescreve planos já configurados manualmente.
    const { error } = await supabase
      .from('planos')
      .upsert(novos, { onConflict: 'broker_id,nome', ignoreDuplicates: true });
    if (error) {
      throw new Error(`Falha ao registrar planos: ${error.message}`);
    }
  }

  const { data, error } = await supabase
    .from('planos')
    .select('id, nome')
    .eq('broker_id', brokerId);
  if (error) {
    throw new Error(`Falha ao carregar planos: ${error.message}`);
  }
  const mapa = new Map<string, string>();
  for (const p of data ?? []) {
    mapa.set(p.nome as string, p.id as string);
  }
  return mapa;
}

async function persistirLinhas(
  brokerId: string,
  linhas: LinhaConsumoCanonico[],
  planoPorNome: Map<string, string>,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // linhas: preserva protegida/motivo_protecao (não inclusos no payload).
  const registrosLinha = linhas.map((l) => ({
    iccid: l.iccid,
    msisdn: l.msisdn,
    broker_id: brokerId,
    plano_id: l.plano === '' ? null : (planoPorNome.get(l.plano) ?? null),
    status: l.status,
  }));
  for (const lote of lotes(registrosLinha, TAMANHO_LOTE)) {
    const { error } = await supabase.from('linhas').upsert(lote, { onConflict: 'iccid' });
    if (error) {
      throw new Error(`Falha ao gravar linhas: ${error.message}`);
    }
  }

  const registrosConsumo = linhas.map((l) => ({
    iccid: l.iccid,
    referencia_mes: l.referenciaMes,
    consumo_mb: l.consumoMb,
    custo: l.custoMensal,
    ultima_conexao: l.ultimaConexao,
    fonte: l.fonte,
  }));
  for (const lote of lotes(registrosConsumo, TAMANHO_LOTE)) {
    const { error } = await supabase
      .from('consumo_mensal')
      .upsert(lote, { onConflict: 'iccid,referencia_mes' });
    if (error) {
      throw new Error(`Falha ao gravar consumo mensal: ${error.message}`);
    }
  }
}

function classificar(qtdLinhas: number, qtdErros: number): StatusIngestao {
  if (qtdLinhas === 0) {
    return 'erro';
  }
  return qtdErros > 0 ? 'parcial' : 'sucesso';
}

export interface ParametrosIngestao {
  brokerId: string;
  brokerNome: string;
  referenciaMes: string;
  mapeamento: MapeamentoColunasRow;
  rows: LinhaBruta[];
}

/** Orquestra parse → normalização → persistência → log de uma planilha. */
export async function ingerirPlanilha(p: ParametrosIngestao): Promise<ResumoIngestao> {
  const supabase = getSupabaseAdmin();
  const adapter = new PlanilhaAdapter(configDoMapeamento(p.brokerNome, p.mapeamento));
  const { linhas, erros } = await adapter.parse(p.rows, p.referenciaMes);

  if (linhas.length > 0) {
    const planoPorNome = await resolverPlanos(p.brokerId, linhas);
    await persistirLinhas(p.brokerId, linhas, planoPorNome);
  }

  const status = classificar(linhas.length, erros.length);
  const { data, error } = await supabase
    .from('ingestoes')
    .insert({
      fonte: 'planilha',
      broker_id: p.brokerId,
      qtd_linhas: linhas.length,
      status,
      erros: erros.slice(0, 500),
    })
    .select('id')
    .single();
  if (error) {
    throw new Error(`Falha ao registrar ingestão: ${error.message}`);
  }

  return {
    ingestaoId: data.id as string,
    status,
    qtdLinhas: linhas.length,
    qtdErros: erros.length,
    erros: erros.slice(0, 100),
  };
}
