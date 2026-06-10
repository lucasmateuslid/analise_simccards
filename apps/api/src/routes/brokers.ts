import { Router } from 'express';
import type { TipoIngestaoBroker } from '@m2m/core';
import { badRequest } from '../http.js';
import { getSupabaseAdmin } from '../supabase.js';

export const brokersRouter = Router();

const TIPOS_VALIDOS: readonly TipoIngestaoBroker[] = ['planilha', 'scraping', 'api'];

brokersRouter.get('/', async (_req, res) => {
  const { data, error } = await getSupabaseAdmin()
    .from('brokers')
    .select('id, nome, tipo_ingestao, planos ( id, nome, franquia_mb, custo_mensal )')
    .order('nome');
  if (error) {
    throw new Error(error.message);
  }
  res.json(data);
});

brokersRouter.post('/', async (req, res) => {
  const { nome, tipo_ingestao } = req.body as { nome?: unknown; tipo_ingestao?: unknown };
  if (typeof nome !== 'string' || nome.trim() === '') {
    throw badRequest('Campo "nome" é obrigatório');
  }
  const tipo = typeof tipo_ingestao === 'string' ? tipo_ingestao : 'planilha';
  if (!TIPOS_VALIDOS.includes(tipo as TipoIngestaoBroker)) {
    throw badRequest(`tipo_ingestao inválido (use: ${TIPOS_VALIDOS.join(', ')})`);
  }
  const { data, error } = await getSupabaseAdmin()
    .from('brokers')
    .insert({ nome: nome.trim(), tipo_ingestao: tipo })
    .select()
    .single();
  if (error) {
    throw badRequest(error.message);
  }
  res.status(201).json(data);
});
