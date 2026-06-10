import { Router } from 'express';
import { isReferenciaMesValida, type StatusLinha } from '@m2m/core';
import { badRequest } from '../http.js';
import {
  listarMeses,
  obterLinhasAnalytics,
  obterResumoMes,
  obterResumoPorBroker,
  obterTendencias,
} from '../services/analytics-service.js';

export const analyticsRouter = Router();

function exigirMes(valor: unknown): string {
  if (typeof valor !== 'string' || !isReferenciaMesValida(valor)) {
    throw badRequest('Parâmetro "mes" inválido (esperado YYYY-MM)');
  }
  return valor;
}

analyticsRouter.get('/meses', async (_req, res) => {
  res.json(await listarMeses());
});

analyticsRouter.get('/tendencias', async (_req, res) => {
  res.json(await obterTendencias());
});

analyticsRouter.get('/resumo', async (req, res) => {
  res.json(await obterResumoMes(exigirMes(req.query['mes'])));
});

analyticsRouter.get('/por-broker', async (req, res) => {
  res.json(await obterResumoPorBroker(exigirMes(req.query['mes'])));
});

analyticsRouter.get('/alto-consumo', async (req, res) => {
  const linhas = await obterLinhasAnalytics(exigirMes(req.query['mes']));
  res.json(linhas.filter((l) => l.altoConsumo).sort((a, b) => b.consumoMb - a.consumoMb));
});

analyticsRouter.get('/linhas', async (req, res) => {
  let linhas = await obterLinhasAnalytics(exigirMes(req.query['mes']));

  const broker = req.query['broker'];
  if (typeof broker === 'string' && broker !== '') {
    linhas = linhas.filter((l) => l.brokerId === broker);
  }
  const status = req.query['status'];
  if (typeof status === 'string' && status !== '') {
    linhas = linhas.filter((l) => l.status === (status as StatusLinha));
  }
  if (req.query['altoConsumo'] === 'true') {
    linhas = linhas.filter((l) => l.altoConsumo);
  }
  const ociosasMin = req.query['ociosasMinDias'];
  if (typeof ociosasMin === 'string' && ociosasMin !== '') {
    const min = Number(ociosasMin);
    if (Number.isFinite(min)) {
      linhas = linhas.filter((l) => l.diasSemConexao !== null && l.diasSemConexao >= min);
    }
  }

  res.json(linhas.sort((a, b) => b.consumoMb - a.consumoMb));
});
