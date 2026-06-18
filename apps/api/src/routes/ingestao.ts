import { Router } from 'express';
import multer from 'multer';
import { isReferenciaMesValida, type MapeamentoColunasRow } from '@m2m/core';
import { badRequest, notFound } from '../http.js';
import { getSupabaseAdmin } from '../supabase.js';
import { lerPlanilha } from '../services/planilha-parser.js';
import { ingerirPlanilha } from '../services/ingestao-service.js';

export const ingestaoRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const NUM_AMOSTRA = 5;
const UNIDADES = ['bytes', 'KB', 'MB', 'GB'] as const;

/** Monta um mapeamento efêmero (não salvo) a partir do JSON enviado no Upload. */
function montarMapeamentoInline(json: string): MapeamentoColunasRow {
  let corpo: {
    mapeamento?: Record<string, string>;
    unidade_consumo?: string;
    status_map?: Record<string, string>;
    plano_fixo?: string | null;
  };
  try {
    corpo = JSON.parse(json) as typeof corpo;
  } catch {
    throw badRequest('"mapeamentoInline" não é um JSON válido');
  }
  const mapeamento = corpo.mapeamento ?? {};
  if (typeof mapeamento['iccid'] !== 'string' || mapeamento['iccid'].trim() === '') {
    throw badRequest('O mapeamento precisa definir a coluna do "iccid"');
  }
  const unidade = typeof corpo.unidade_consumo === 'string' ? corpo.unidade_consumo : 'MB';
  if (!UNIDADES.includes(unidade as (typeof UNIDADES)[number])) {
    throw badRequest(`unidade_consumo inválida (use: ${UNIDADES.join(', ')})`);
  }
  return {
    id: 'inline',
    broker_id: '',
    nome: 'inline',
    mapeamento,
    unidade_consumo: unidade as (typeof UNIDADES)[number],
    status_map: (corpo.status_map ?? {}) as MapeamentoColunasRow['status_map'],
    plano_fixo: typeof corpo.plano_fixo === 'string' && corpo.plano_fixo !== '' ? corpo.plano_fixo : null,
    padrao: false,
    criado_em: '',
    atualizado_em: '',
  };
}

/** Sugere o broker pelo nome do arquivo (substring case-insensitive). */
async function detectarBroker(nomeArquivo: string): Promise<{ id: string; nome: string } | null> {
  const { data, error } = await getSupabaseAdmin().from('brokers').select('id, nome');
  if (error) {
    throw new Error(error.message);
  }
  const alvo = nomeArquivo.toLowerCase();
  const achado = (data ?? []).find((b) => alvo.includes((b.nome as string).toLowerCase()));
  return achado ? { id: achado.id as string, nome: achado.nome as string } : null;
}

// Preview: lê cabeçalhos + amostra para a tela de mapeamento.
ingestaoRouter.post('/preview', upload.single('arquivo'), async (req, res) => {
  if (req.file === undefined) {
    throw badRequest('Envie o arquivo no campo "arquivo"');
  }
  const { headers, rows } = lerPlanilha(req.file.buffer, req.file.originalname);
  const brokerDetectado = await detectarBroker(req.file.originalname);
  res.json({
    headers,
    amostra: rows.slice(0, NUM_AMOSTRA),
    totalLinhas: rows.length,
    brokerDetectado,
  });
});

// Importação efetiva: parse + normalização + snapshot.
ingestaoRouter.post('/importar', upload.single('arquivo'), async (req, res) => {
  if (req.file === undefined) {
    throw badRequest('Envie o arquivo no campo "arquivo"');
  }
  const { brokerId, referenciaMes, mapeamentoId, mapeamentoInline } = req.body as {
    brokerId?: string;
    referenciaMes?: string;
    mapeamentoId?: string;
    mapeamentoInline?: string;
  };
  if (typeof brokerId !== 'string' || brokerId === '') {
    throw badRequest('Campo "brokerId" é obrigatório');
  }
  if (typeof referenciaMes !== 'string' || !isReferenciaMesValida(referenciaMes)) {
    throw badRequest('Campo "referenciaMes" inválido (esperado YYYY-MM)');
  }
  const temId = typeof mapeamentoId === 'string' && mapeamentoId !== '';
  const temInline = typeof mapeamentoInline === 'string' && mapeamentoInline !== '';
  if (!temId && !temInline) {
    throw badRequest('Informe "mapeamentoId" (template salvo) ou "mapeamentoInline"');
  }

  const supabase = getSupabaseAdmin();
  const { data: broker, error: erroBroker } = await supabase
    .from('brokers')
    .select('id, nome')
    .eq('id', brokerId)
    .single();
  if (erroBroker || broker === null) {
    throw notFound('Broker não encontrado');
  }

  let mapeamento: MapeamentoColunasRow;
  if (temId) {
    const { data, error } = await supabase
      .from('mapeamentos_colunas')
      .select('*')
      .eq('id', mapeamentoId)
      .eq('broker_id', brokerId)
      .single();
    if (error || data === null) {
      throw notFound('Mapeamento não encontrado para este broker');
    }
    mapeamento = data as MapeamentoColunasRow;
  } else {
    mapeamento = montarMapeamentoInline(mapeamentoInline as string);
  }

  const { rows } = lerPlanilha(req.file.buffer, req.file.originalname);
  const resumo = await ingerirPlanilha({
    brokerId,
    brokerNome: broker.nome as string,
    referenciaMes,
    mapeamento,
    rows,
  });
  res.json(resumo);
});

// Histórico de ingestões.
ingestaoRouter.get('/historico', async (_req, res) => {
  const { data, error } = await getSupabaseAdmin()
    .from('ingestoes')
    .select('id, fonte, qtd_linhas, status, criado_em, erros, brokers ( nome )')
    .order('criado_em', { ascending: false })
    .limit(50);
  if (error) {
    throw new Error(error.message);
  }
  res.json(data);
});
