import {
  avaliarCancelamento,
  type ClassificacaoLinha,
  type ConfigCancelamento,
  type StatusLinha,
} from '@m2m/core';
import { buscarTudo, getSupabaseAdmin } from '../supabase.js';

export interface LinhaAvaliada {
  iccid: string;
  msisdn: string | null;
  broker: string;
  plano: string | null;
  status: StatusLinha;
  classificacao: ClassificacaoLinha;
  diasSemConexao: number | null;
  ultimaConexao: string | null;
  motivosProtecao: string[];
  custoMensal: number;
  economiaMensal: number;
  economiaAnual: number;
}

export interface ResumoCancelamento {
  referenciaMes: string;
  limiteOciosidadeDias: number;
  qtdCandidatas: number;
  qtdProtegidas: number;
  economiaMensalPotencial: number;
  economiaAnualPotencial: number;
}

interface LinhaConsultada {
  iccid: string;
  custo: number;
  ultima_conexao: string | null;
  linhas: {
    msisdn: string | null;
    status: StatusLinha;
    protegida: boolean;
    motivo_protecao: string | null;
    data_ativacao: string | null;
    fidelidade_ate: string | null;
    brokers: { nome: string } | null;
    planos: { nome: string } | null;
  } | null;
}

const SELECT = `
  iccid, custo, ultima_conexao,
  linhas!inner (
    msisdn, status, protegida, motivo_protecao, data_ativacao, fidelidade_ate,
    brokers!inner ( nome ),
    planos ( nome )
  )
`;

async function carregarConfig(): Promise<ConfigCancelamento> {
  const { data } = await getSupabaseAdmin()
    .from('app_config')
    .select('chave, valor')
    .in('chave', ['limite_ociosidade_dias', 'dias_minimos_pos_ativacao']);
  const mapa = new Map((data ?? []).map((r) => [r.chave as string, r.valor]));
  const num = (chave: string, fallback: number): number => {
    const v = mapa.get(chave);
    return typeof v === 'number' ? v : fallback;
  };
  return {
    limiteOciosidadeDias: num('limite_ociosidade_dias', 90),
    diasMinimosPosAtivacao: num('dias_minimos_pos_ativacao', 30),
  };
}

/** ICCIDs com pelo menos um vínculo de veículo ativo. */
async function iccidsComVeiculoAtivo(): Promise<Set<string>> {
  const supabase = getSupabaseAdmin();
  const data = await buscarTudo<{ iccid: string }>((de, ate) =>
    supabase.from('veiculos_vinculo').select('iccid').eq('ativo', true).range(de, ate),
  );
  return new Set(data.map((r) => r.iccid));
}

/** Avalia todas as linhas do mês pelo motor de cancelamento. */
export async function avaliarMes(referenciaMes: string): Promise<{
  config: ConfigCancelamento;
  linhas: LinhaAvaliada[];
}> {
  const supabase = getSupabaseAdmin();
  const [config, comVeiculoAtivo, consulta] = await Promise.all([
    carregarConfig(),
    iccidsComVeiculoAtivo(),
    buscarTudo((de, ate) =>
      supabase.from('consumo_mensal').select(SELECT).eq('referencia_mes', referenciaMes).range(de, ate),
    ),
  ]);
  const brutas = consulta as unknown as LinhaConsultada[];

  const linhas = brutas.map((l): LinhaAvaliada => {
    const linha = l.linhas;
    const resultado = avaliarCancelamento(
      {
        iccid: l.iccid,
        status: linha?.status ?? 'desconhecido',
        protegidaManual: linha?.protegida ?? false,
        motivoProtecaoManual: linha?.motivo_protecao ?? null,
        ultimaConexao: l.ultima_conexao,
        custoMensal: l.custo,
        veiculoAtivo: comVeiculoAtivo.has(l.iccid),
        dataAtivacao: linha?.data_ativacao ?? null,
        fidelidadeAte: linha?.fidelidade_ate ?? null,
      },
      config,
    );
    return {
      iccid: l.iccid,
      msisdn: linha?.msisdn ?? null,
      broker: linha?.brokers?.nome ?? 'Desconhecido',
      plano: linha?.planos?.nome ?? null,
      status: linha?.status ?? 'desconhecido',
      classificacao: resultado.classificacao,
      diasSemConexao: resultado.diasSemConexao,
      ultimaConexao: l.ultima_conexao,
      motivosProtecao: resultado.motivosProtecao,
      custoMensal: round2(resultado.custoMensal),
      economiaMensal: round2(resultado.economiaMensal),
      economiaAnual: round2(resultado.economiaAnual),
    };
  });

  return { config, linhas };
}

export async function listarCandidatas(referenciaMes: string): Promise<LinhaAvaliada[]> {
  const { linhas } = await avaliarMes(referenciaMes);
  return linhas
    .filter((l) => l.classificacao === 'candidata')
    .sort((a, b) => b.economiaAnual - a.economiaAnual);
}

export async function listarProtegidas(referenciaMes: string): Promise<LinhaAvaliada[]> {
  const { linhas } = await avaliarMes(referenciaMes);
  return linhas.filter((l) => l.classificacao === 'protegida');
}

export async function resumoCancelamento(referenciaMes: string): Promise<ResumoCancelamento> {
  const { config, linhas } = await avaliarMes(referenciaMes);
  const candidatas = linhas.filter((l) => l.classificacao === 'candidata');
  const protegidas = linhas.filter((l) => l.classificacao === 'protegida');
  const economiaMensal = candidatas.reduce((acc, l) => acc + l.economiaMensal, 0);
  return {
    referenciaMes,
    limiteOciosidadeDias: config.limiteOciosidadeDias,
    qtdCandidatas: candidatas.length,
    qtdProtegidas: protegidas.length,
    economiaMensalPotencial: round2(economiaMensal),
    economiaAnualPotencial: round2(economiaMensal * 12),
  };
}

/** Proteção manual a partir da fila de revisão (nunca cancela automaticamente). */
export async function protegerLinha(iccid: string, motivo: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('linhas')
    .update({ protegida: true, motivo_protecao: motivo })
    .eq('iccid', iccid);
  if (error) {
    throw new Error(error.message);
  }
}

/** Aprovação humana do cancelamento → marca a linha como cancelada. */
export async function aprovarCancelamento(iccid: string): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from('linhas')
    .update({ status: 'cancelado' })
    .eq('iccid', iccid);
  if (error) {
    throw new Error(error.message);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
