import type { StatusLinha } from '@m2m/core';
import { getSupabaseAdmin } from '../supabase.js';

/** Linha "achatada" do snapshot de um mês, com dados de linha/plano/broker. */
export interface LinhaAnalytics {
  iccid: string;
  msisdn: string | null;
  brokerId: string;
  broker: string;
  plano: string | null;
  status: StatusLinha;
  protegida: boolean;
  consumoMb: number;
  franquiaMb: number | null;
  custo: number;
  ultimaConexao: string | null;
  diasSemConexao: number | null;
  /** consumo acima da franquia, em MB (0 se dentro). */
  overageMb: number;
  altoConsumo: boolean;
  motivoAltoConsumo: 'overage' | 'p90' | null;
}

export interface ResumoBroker {
  brokerId: string;
  broker: string;
  custo: number;
  consumoMb: number;
  qtdLinhas: number;
  qtdAltoConsumo: number;
}

export interface ResumoMes {
  referenciaMes: string;
  custoTotal: number;
  consumoTotalMb: number;
  qtdLinhas: number;
  qtdAltoConsumo: number;
  custoMesAnterior: number | null;
  variacaoPct: number | null;
  /** Estimativa preliminar (só ociosidade) — refinada na Fase 3. */
  qtdOciosasPreliminar: number;
  custoDesperdicadoPreliminar: number;
  limiteOciosidadeDias: number;
}

interface LinhaConsultada {
  iccid: string;
  consumo_mb: number;
  custo: number;
  ultima_conexao: string | null;
  linhas: {
    msisdn: string | null;
    status: StatusLinha;
    protegida: boolean;
    brokers: { id: string; nome: string } | null;
    planos: { nome: string; franquia_mb: number | null } | null;
  } | null;
}

const SELECT_CONSUMO = `
  iccid, consumo_mb, custo, ultima_conexao,
  linhas!inner (
    msisdn, status, protegida,
    brokers!inner ( id, nome ),
    planos ( nome, franquia_mb )
  )
`;

function diasEntre(isoData: string | null, agora: number): number | null {
  if (isoData === null) {
    return null;
  }
  const t = Date.parse(isoData);
  if (Number.isNaN(t)) {
    return null;
  }
  return Math.floor((agora - t) / 86_400_000);
}

function percentil90(valores: number[]): number {
  if (valores.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const ordenado = [...valores].sort((a, b) => a - b);
  const idx = Math.ceil(ordenado.length * 0.9) - 1;
  return ordenado[Math.min(Math.max(idx, 0), ordenado.length - 1)] ?? Number.POSITIVE_INFINITY;
}

async function carregarLimiteOciosidade(): Promise<number> {
  const { data } = await getSupabaseAdmin()
    .from('app_config')
    .select('valor')
    .eq('chave', 'limite_ociosidade_dias')
    .single();
  const valor = data?.valor;
  return typeof valor === 'number' ? valor : 90;
}

async function buscarLinhas(referenciaMes: string): Promise<LinhaConsultada[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('consumo_mensal')
    .select(SELECT_CONSUMO)
    .eq('referencia_mes', referenciaMes);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as LinhaConsultada[];
}

/** Monta as linhas de analytics de um mês, marcando overage e P90 por broker. */
export async function obterLinhasAnalytics(referenciaMes: string): Promise<LinhaAnalytics[]> {
  const brutas = await buscarLinhas(referenciaMes);
  const agora = Date.now();

  // P90 de consumo por broker.
  const consumosPorBroker = new Map<string, number[]>();
  for (const l of brutas) {
    const brokerId = l.linhas?.brokers?.id ?? 'desconhecido';
    const lista = consumosPorBroker.get(brokerId) ?? [];
    lista.push(l.consumo_mb);
    consumosPorBroker.set(brokerId, lista);
  }
  const p90PorBroker = new Map<string, number>();
  for (const [brokerId, consumos] of consumosPorBroker) {
    p90PorBroker.set(brokerId, percentil90(consumos));
  }

  return brutas.map((l) => {
    const broker = l.linhas?.brokers;
    const plano = l.linhas?.planos ?? null;
    const franquiaMb = plano?.franquia_mb ?? null;
    const overageMb = franquiaMb !== null && l.consumo_mb > franquiaMb ? l.consumo_mb - franquiaMb : 0;
    const brokerId = broker?.id ?? 'desconhecido';
    const p90 = p90PorBroker.get(brokerId) ?? Number.POSITIVE_INFINITY;
    const acimaP90 = l.consumo_mb > 0 && l.consumo_mb >= p90 && consumosPorBroker.get(brokerId)!.length >= 5;
    const motivoAltoConsumo: 'overage' | 'p90' | null =
      overageMb > 0 ? 'overage' : acimaP90 ? 'p90' : null;

    return {
      iccid: l.iccid,
      msisdn: l.linhas?.msisdn ?? null,
      brokerId,
      broker: broker?.nome ?? 'Desconhecido',
      plano: plano?.nome ?? null,
      status: l.linhas?.status ?? 'desconhecido',
      protegida: l.linhas?.protegida ?? false,
      consumoMb: l.consumo_mb,
      franquiaMb,
      custo: l.custo,
      ultimaConexao: l.ultima_conexao,
      diasSemConexao: diasEntre(l.ultima_conexao, agora),
      overageMb,
      altoConsumo: motivoAltoConsumo !== null,
      motivoAltoConsumo,
    };
  });
}

export async function obterResumoPorBroker(referenciaMes: string): Promise<ResumoBroker[]> {
  const linhas = await obterLinhasAnalytics(referenciaMes);
  const mapa = new Map<string, ResumoBroker>();
  for (const l of linhas) {
    const atual = mapa.get(l.brokerId) ?? {
      brokerId: l.brokerId,
      broker: l.broker,
      custo: 0,
      consumoMb: 0,
      qtdLinhas: 0,
      qtdAltoConsumo: 0,
    };
    atual.custo += l.custo;
    atual.consumoMb += l.consumoMb;
    atual.qtdLinhas += 1;
    if (l.altoConsumo) {
      atual.qtdAltoConsumo += 1;
    }
    mapa.set(l.brokerId, atual);
  }
  return [...mapa.values()]
    .map((r) => ({ ...r, custo: round2(r.custo), consumoMb: round2(r.consumoMb) }))
    .sort((a, b) => b.custo - a.custo);
}

function mesAnterior(referenciaMes: string): string {
  const [ano, mes] = referenciaMes.split('-').map(Number);
  const d = new Date(Date.UTC(ano!, mes! - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function custoTotalDoMes(referenciaMes: string): Promise<number | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('consumo_mensal')
    .select('custo')
    .eq('referencia_mes', referenciaMes);
  if (error) {
    throw new Error(error.message);
  }
  if ((data ?? []).length === 0) {
    return null;
  }
  return (data ?? []).reduce((acc, r) => acc + (r.custo as number), 0);
}

export async function obterResumoMes(referenciaMes: string): Promise<ResumoMes> {
  const [linhas, limiteOciosidadeDias, custoAnt] = await Promise.all([
    obterLinhasAnalytics(referenciaMes),
    carregarLimiteOciosidade(),
    custoTotalDoMes(mesAnterior(referenciaMes)),
  ]);

  const custoTotal = linhas.reduce((acc, l) => acc + l.custo, 0);
  const consumoTotalMb = linhas.reduce((acc, l) => acc + l.consumoMb, 0);
  const qtdAltoConsumo = linhas.filter((l) => l.altoConsumo).length;

  const ociosas = linhas.filter(
    (l) =>
      l.status !== 'cancelado' &&
      l.diasSemConexao !== null &&
      l.diasSemConexao > limiteOciosidadeDias,
  );

  const variacaoPct =
    custoAnt !== null && custoAnt > 0 ? round2(((custoTotal - custoAnt) / custoAnt) * 100) : null;

  return {
    referenciaMes,
    custoTotal: round2(custoTotal),
    consumoTotalMb: round2(consumoTotalMb),
    qtdLinhas: linhas.length,
    qtdAltoConsumo,
    custoMesAnterior: custoAnt === null ? null : round2(custoAnt),
    variacaoPct,
    qtdOciosasPreliminar: ociosas.length,
    custoDesperdicadoPreliminar: round2(ociosas.reduce((acc, l) => acc + l.custo, 0)),
    limiteOciosidadeDias,
  };
}

export async function listarMeses(): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('consumo_mensal')
    .select('referencia_mes')
    .order('referencia_mes', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return [...new Set((data ?? []).map((r) => r.referencia_mes as string))];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
