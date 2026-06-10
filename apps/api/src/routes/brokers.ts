import { Router } from 'express';
import type { TipoIngestaoBroker } from '@m2m/core';
import { badRequest } from '../http.js';
import { getSupabaseAdmin } from '../supabase.js';

export const brokersRouter = Router();

const TIPOS_VALIDOS: readonly TipoIngestaoBroker[] = ['planilha', 'scraping', 'api'];

brokersRouter.get('/', async (_req, res) => {
  const { data, error } = await getSupabaseAdmin()
    .from('brokers')
    .select('id, nome, tipo_ingestao, planos ( id, nome, franquia_mb, custo_mensal ), linhas ( count )')
    .order('nome');
  if (error) {
    throw new Error(error.message);
  }
  // achata o agregado linhas(count) → qtdLinhas
  const comContagem = (data ?? []).map((b) => {
    const linhas = b.linhas as { count: number }[] | null;
    const { linhas: _linhas, ...resto } = b;
    return { ...resto, qtdLinhas: linhas?.[0]?.count ?? 0 };
  });
  res.json(comContagem);
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

brokersRouter.delete('/:id', async (req, res) => {
  const supabase = getSupabaseAdmin();
  // bloqueia exclusão se houver linhas vinculadas (evita perder histórico).
  const { count, error: erroContagem } = await supabase
    .from('linhas')
    .select('iccid', { count: 'exact', head: true })
    .eq('broker_id', req.params.id);
  if (erroContagem) {
    throw new Error(erroContagem.message);
  }
  if ((count ?? 0) > 0) {
    throw badRequest(
      `Não é possível excluir: o fornecedor tem ${count} linha(s). Remova/migre as linhas antes.`,
    );
  }
  // planos e mapeamentos saem em cascata (FK on delete cascade).
  const { error } = await supabase.from('brokers').delete().eq('id', req.params.id);
  if (error) {
    throw badRequest(error.message);
  }
  res.status(204).end();
});
