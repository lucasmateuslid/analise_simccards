import { Router } from 'express';
import type { StatusLinha } from '@m2m/core';
import { badRequest, notFound } from '../http.js';
import { getSupabaseAdmin } from '../supabase.js';

export const mapeamentosRouter = Router();

const UNIDADES = ['bytes', 'KB', 'MB', 'GB'] as const;

interface CorpoMapeamento {
  broker_id?: unknown;
  nome?: unknown;
  mapeamento?: unknown;
  unidade_consumo?: unknown;
  status_map?: unknown;
  plano_fixo?: unknown;
  padrao?: unknown;
}

function validar(corpo: CorpoMapeamento, exigeBroker: boolean): {
  broker_id?: string;
  nome: string;
  mapeamento: Record<string, string>;
  unidade_consumo: (typeof UNIDADES)[number];
  status_map: Record<string, StatusLinha>;
  plano_fixo: string | null;
  padrao: boolean;
} {
  if (typeof corpo.nome !== 'string' || corpo.nome.trim() === '') {
    throw badRequest('Campo "nome" é obrigatório');
  }
  if (typeof corpo.mapeamento !== 'object' || corpo.mapeamento === null) {
    throw badRequest('Campo "mapeamento" é obrigatório');
  }
  const mapeamento = corpo.mapeamento as Record<string, string>;
  if (typeof mapeamento['iccid'] !== 'string' || mapeamento['iccid'].trim() === '') {
    throw badRequest('O mapeamento precisa definir a coluna do "iccid"');
  }
  const unidade = typeof corpo.unidade_consumo === 'string' ? corpo.unidade_consumo : 'MB';
  if (!UNIDADES.includes(unidade as (typeof UNIDADES)[number])) {
    throw badRequest(`unidade_consumo inválida (use: ${UNIDADES.join(', ')})`);
  }
  if (exigeBroker && (typeof corpo.broker_id !== 'string' || corpo.broker_id === '')) {
    throw badRequest('Campo "broker_id" é obrigatório');
  }
  return {
    broker_id: typeof corpo.broker_id === 'string' ? corpo.broker_id : undefined,
    nome: corpo.nome.trim(),
    mapeamento,
    unidade_consumo: unidade as (typeof UNIDADES)[number],
    status_map:
      typeof corpo.status_map === 'object' && corpo.status_map !== null
        ? (corpo.status_map as Record<string, StatusLinha>)
        : {},
    plano_fixo: typeof corpo.plano_fixo === 'string' && corpo.plano_fixo !== '' ? corpo.plano_fixo : null,
    padrao: corpo.padrao === true,
  };
}

mapeamentosRouter.get('/', async (req, res) => {
  const query = getSupabaseAdmin().from('mapeamentos_colunas').select('*').order('nome');
  const brokerId = req.query['brokerId'];
  if (typeof brokerId === 'string' && brokerId !== '') {
    query.eq('broker_id', brokerId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  res.json(data);
});

mapeamentosRouter.post('/', async (req, res) => {
  const dados = validar(req.body as CorpoMapeamento, true);
  const { data, error } = await getSupabaseAdmin()
    .from('mapeamentos_colunas')
    .insert(dados)
    .select()
    .single();
  if (error) {
    throw badRequest(error.message);
  }
  res.status(201).json(data);
});

mapeamentosRouter.put('/:id', async (req, res) => {
  const dados = validar(req.body as CorpoMapeamento, false);
  // broker_id não é alterável num update — descartado do payload.
  const { broker_id: _broker_id, ...atualizacao } = dados;
  const { data, error } = await getSupabaseAdmin()
    .from('mapeamentos_colunas')
    .update(atualizacao)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) {
    throw badRequest(error.message);
  }
  if (data === null) {
    throw notFound('Mapeamento não encontrado');
  }
  res.json(data);
});

mapeamentosRouter.delete('/:id', async (req, res) => {
  const { error } = await getSupabaseAdmin()
    .from('mapeamentos_colunas')
    .delete()
    .eq('id', req.params.id);
  if (error) {
    throw badRequest(error.message);
  }
  res.status(204).end();
});
