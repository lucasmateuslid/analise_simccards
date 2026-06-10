import { Router } from 'express';
import type { StatusLinha } from '@m2m/core';
import { listarLinhas, type FiltrosLinhas } from '../services/linhas-service.js';

export const linhasRouter = Router();

linhasRouter.get('/', async (req, res) => {
  const filtros: FiltrosLinhas = {};
  const busca = req.query['busca'];
  if (typeof busca === 'string' && busca.trim() !== '') {
    filtros.busca = busca.trim();
  }
  const brokerId = req.query['broker'];
  if (typeof brokerId === 'string' && brokerId !== '') {
    filtros.brokerId = brokerId;
  }
  const status = req.query['status'];
  if (typeof status === 'string' && status !== '') {
    filtros.status = status as StatusLinha;
  }
  res.json(await listarLinhas(filtros));
});
