import type {
  Broker,
  LinhaAnalytics,
  MapeamentoColunas,
  PreviewPlanilha,
  ResumoBroker,
  ResumoIngestao,
  ResumoMes,
} from './types';

const BASE = '/api';

async function req<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${caminho}`, init);
  if (!resp.ok) {
    let mensagem = `Erro ${resp.status}`;
    try {
      const corpo = (await resp.json()) as { erro?: string };
      if (corpo.erro) {
        mensagem = corpo.erro;
      }
    } catch {
      // resposta sem JSON — mantém mensagem genérica
    }
    throw new Error(mensagem);
  }
  if (resp.status === 204) {
    return undefined as T;
  }
  return (await resp.json()) as T;
}

export const api = {
  listarBrokers: () => req<Broker[]>('/brokers'),
  criarBroker: (nome: string, tipo_ingestao = 'planilha') =>
    req<Broker>('/brokers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, tipo_ingestao }),
    }),

  listarMapeamentos: (brokerId?: string) =>
    req<MapeamentoColunas[]>(`/mapeamentos${brokerId ? `?brokerId=${brokerId}` : ''}`),
  criarMapeamento: (corpo: Partial<MapeamentoColunas>) =>
    req<MapeamentoColunas>('/mapeamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    }),
  atualizarMapeamento: (id: string, corpo: Partial<MapeamentoColunas>) =>
    req<MapeamentoColunas>(`/mapeamentos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    }),
  removerMapeamento: (id: string) => req<void>(`/mapeamentos/${id}`, { method: 'DELETE' }),

  previewPlanilha: (arquivo: File) => {
    const fd = new FormData();
    fd.append('arquivo', arquivo);
    return req<PreviewPlanilha>('/ingestao/preview', { method: 'POST', body: fd });
  },
  importarPlanilha: (params: {
    arquivo: File;
    brokerId: string;
    referenciaMes: string;
    mapeamentoId: string;
  }) => {
    const fd = new FormData();
    fd.append('arquivo', params.arquivo);
    fd.append('brokerId', params.brokerId);
    fd.append('referenciaMes', params.referenciaMes);
    fd.append('mapeamentoId', params.mapeamentoId);
    return req<ResumoIngestao>('/ingestao/importar', { method: 'POST', body: fd });
  },

  meses: () => req<string[]>('/analytics/meses'),
  resumoMes: (mes: string) => req<ResumoMes>(`/analytics/resumo?mes=${mes}`),
  resumoPorBroker: (mes: string) => req<ResumoBroker[]>(`/analytics/por-broker?mes=${mes}`),
  altoConsumo: (mes: string) => req<LinhaAnalytics[]>(`/analytics/alto-consumo?mes=${mes}`),
  linhas: (mes: string, filtros: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ mes, ...filtros }).toString();
    return req<LinhaAnalytics[]>(`/analytics/linhas?${qs}`);
  },
};
