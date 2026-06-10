import express, { type NextFunction, type Request, type Response } from 'express';
import { env } from './env.js';
import { HttpError } from './http.js';
import { getSupabaseAdmin } from './supabase.js';
import { analyticsRouter } from './routes/analytics.js';
import { brokersRouter } from './routes/brokers.js';
import { cancelamentoRouter, veiculosRouter } from './routes/cancelamento.js';
import { ingestaoRouter } from './routes/ingestao.js';
import { mapeamentosRouter } from './routes/mapeamentos.js';

const app = express();
app.use(express.json());

// CORS simples para o dev (o Vite também faz proxy via /api).
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'api', timestamp: new Date().toISOString() });
});

app.get('/health/db', async (_req, res) => {
  try {
    const { error, count } = await getSupabaseAdmin()
      .from('brokers')
      .select('id', { count: 'exact', head: true });
    if (error) {
      throw new Error(error.message);
    }
    res.json({ ok: true, brokers: count ?? 0 });
  } catch (erro) {
    res.status(503).json({ ok: false, erro: erro instanceof Error ? erro.message : String(erro) });
  }
});

app.use('/brokers', brokersRouter);
app.use('/mapeamentos', mapeamentosRouter);
app.use('/ingestao', ingestaoRouter);
app.use('/analytics', analyticsRouter);
app.use('/cancelamento', cancelamentoRouter);
app.use('/veiculos', veiculosRouter);

// Error handler central — precisa dos 4 parâmetros para o Express reconhecer.
app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (erro instanceof HttpError) {
    res.status(erro.status).json({ ok: false, erro: erro.message });
    return;
  }
  console.error(erro);
  res.status(500).json({ ok: false, erro: erro instanceof Error ? erro.message : String(erro) });
});

app.listen(env.port, () => {
  console.log(`API ouvindo em http://localhost:${env.port}`);
});
