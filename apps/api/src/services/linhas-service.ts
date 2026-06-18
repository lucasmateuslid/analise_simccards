import type { StatusLinha } from '@m2m/core';
import { buscarTudo, getSupabaseAdmin } from '../supabase.js';

/** Uma linha com o último snapshot conhecido (visão "todas as linhas"). */
export interface LinhaListada {
  iccid: string;
  msisdn: string | null;
  ultimaConexao: string | null;
  consumoMb: number | null;
  operadora: string | null;
  dataAtivacao: string | null;
  mensalidade: number | null;
  plano: string | null;
  fornecedor: string;
  status: StatusLinha;
  protegida: boolean;
  referenciaMes: string | null;
}

interface LinhaRow {
  iccid: string;
  msisdn: string | null;
  status: StatusLinha;
  protegida: boolean;
  data_ativacao: string | null;
  brokers: { id: string; nome: string } | null;
  planos: { nome: string; custo_mensal: number } | null;
}

interface ConsumoRow {
  iccid: string;
  referencia_mes: string;
  consumo_mb: number;
  ultima_conexao: string | null;
  operadora: string | null;
}

/** Último snapshot (referencia_mes mais recente) por ICCID. */
async function ultimoConsumoPorIccid(): Promise<Map<string, ConsumoRow>> {
  const supabase = getSupabaseAdmin();
  const rows = await buscarTudo<ConsumoRow>((de, ate) =>
    supabase
      .from('consumo_mensal')
      .select('iccid, referencia_mes, consumo_mb, ultima_conexao, operadora')
      .order('referencia_mes', { ascending: false })
      .range(de, ate),
  );
  const mapa = new Map<string, ConsumoRow>();
  for (const row of rows) {
    if (!mapa.has(row.iccid)) {
      mapa.set(row.iccid, row);
    }
  }
  return mapa;
}

export interface FiltrosLinhas {
  busca?: string;
  brokerId?: string;
  status?: StatusLinha;
}

export async function listarLinhas(filtros: FiltrosLinhas = {}): Promise<LinhaListada[]> {
  const supabase = getSupabaseAdmin();

  // Reconstrói a query a cada página: o builder do supabase-js não é reutilizável
  // com segurança entre chamadas. buscarTudo pagina até esgotar (contorna max_rows).
  const todas = await buscarTudo<LinhaRow>((de, ate) => {
    const query = supabase
      .from('linhas')
      .select(
        'iccid, msisdn, status, protegida, data_ativacao, brokers!inner ( id, nome ), planos ( nome, custo_mensal )',
      )
      .order('iccid');
    if (filtros.brokerId) {
      query.eq('broker_id', filtros.brokerId);
    }
    if (filtros.status) {
      query.eq('status', filtros.status);
    }
    if (filtros.busca) {
      const termo = `%${filtros.busca}%`;
      query.or(`iccid.ilike.${termo},msisdn.ilike.${termo}`);
    }
    return query.range(de, ate) as unknown as PromiseLike<{ data: LinhaRow[] | null; error: { message: string } | null }>;
  });

  const consumos = await ultimoConsumoPorIccid();

  return todas.map((l): LinhaListada => {
    const c = consumos.get(l.iccid);
    return {
      iccid: l.iccid,
      msisdn: l.msisdn,
      ultimaConexao: c?.ultima_conexao ?? null,
      consumoMb: c?.consumo_mb ?? null,
      operadora: c?.operadora ?? null,
      dataAtivacao: l.data_ativacao,
      mensalidade: l.planos?.custo_mensal ?? null,
      plano: l.planos?.nome ?? null,
      fornecedor: l.brokers?.nome ?? 'Desconhecido',
      status: l.status,
      protegida: l.protegida,
      referenciaMes: c?.referencia_mes ?? null,
    };
  });
}
