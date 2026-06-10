import { Router } from 'express';
import { isReferenciaMesValida } from '@m2m/core';
import { badRequest } from '../http.js';
import {
  aprovarCancelamento,
  listarCandidatas,
  listarProtegidas,
  protegerLinha,
  resumoCancelamento,
} from '../services/cancelamento-service.js';
import { criarTrackingSource, sincronizarVeiculos } from '../services/veiculos-service.js';

export const cancelamentoRouter = Router();

function exigirMes(valor: unknown): string {
  if (typeof valor !== 'string' || !isReferenciaMesValida(valor)) {
    throw badRequest('Parâmetro "mes" inválido (esperado YYYY-MM)');
  }
  return valor;
}

cancelamentoRouter.get('/candidatas', async (req, res) => {
  res.json(await listarCandidatas(exigirMes(req.query['mes'])));
});

cancelamentoRouter.get('/protegidas', async (req, res) => {
  res.json(await listarProtegidas(exigirMes(req.query['mes'])));
});

cancelamentoRouter.get('/resumo', async (req, res) => {
  res.json(await resumoCancelamento(exigirMes(req.query['mes'])));
});

cancelamentoRouter.post('/proteger', async (req, res) => {
  const { iccid, motivo } = req.body as { iccid?: unknown; motivo?: unknown };
  if (typeof iccid !== 'string' || iccid === '') {
    throw badRequest('Campo "iccid" é obrigatório');
  }
  if (typeof motivo !== 'string' || motivo.trim() === '') {
    throw badRequest('Campo "motivo" é obrigatório');
  }
  await protegerLinha(iccid, motivo.trim());
  res.json({ ok: true });
});

cancelamentoRouter.post('/aprovar', async (req, res) => {
  const { iccid } = req.body as { iccid?: unknown };
  if (typeof iccid !== 'string' || iccid === '') {
    throw badRequest('Campo "iccid" é obrigatório');
  }
  await aprovarCancelamento(iccid);
  res.json({ ok: true });
});

export const veiculosRouter = Router();

veiculosRouter.post('/sincronizar', async (_req, res) => {
  const resumo = await sincronizarVeiculos(criarTrackingSource());
  res.json(resumo);
});
