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
  const { brokerId, referenciaMes, mapeamentoId } = req.body as {
    brokerId?: string;
    referenciaMes?: string;
    mapeamentoId?: string;
  };
  if (typeof brokerId !== 'string' || brokerId === '') {
    throw badRequest('Campo "brokerId" é obrigatório');
  }
  if (typeof referenciaMes !== 'string' || !isReferenciaMesValida(referenciaMes)) {
    throw badRequest('Campo "referenciaMes" inválido (esperado YYYY-MM)');
  }
  if (typeof mapeamentoId !== 'string' || mapeamentoId === '') {
    throw badRequest('Campo "mapeamentoId" é obrigatório');
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

  const { data: mapeamento, error: erroMap } = await supabase
    .from('mapeamentos_colunas')
    .select('*')
    .eq('id', mapeamentoId)
    .eq('broker_id', brokerId)
    .single();
  if (erroMap || mapeamento === null) {
    throw notFound('Mapeamento não encontrado para este broker');
  }

  const { rows } = lerPlanilha(req.file.buffer, req.file.originalname);
  const resumo = await ingerirPlanilha({
    brokerId,
    brokerNome: broker.nome as string,
    referenciaMes,
    mapeamento: mapeamento as MapeamentoColunasRow,
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
