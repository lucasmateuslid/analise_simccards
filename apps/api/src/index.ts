import express from 'express';
import { env } from './env.js';
import { getSupabaseAdmin } from './supabase.js';

const app = express();
app.use(express.json());

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

app.listen(env.port, () => {
  console.log(`API ouvindo em http://localhost:${env.port}`);
});
