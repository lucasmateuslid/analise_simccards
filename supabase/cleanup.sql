-- Cleanup script para apagar dados do banco local (USE COM CAUTELA)
-- Executa TRUNCATE nas tabelas da aplicação. Mantém schema/migrations.
-- Roda localmente com: psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/cleanup.sql

BEGIN;

-- Remove dados da aplicação (respeita FKs via CASCADE)
TRUNCATE TABLE
  public.consumo_mensal,
  public.veiculos_vinculo,
  public.ingestoes,
  public.mapeamentos_colunas,
  public.linhas,
  public.planos,
  public.brokers,
  public.app_config
RESTART IDENTITY CASCADE;

COMMIT;

-- Fim do script
