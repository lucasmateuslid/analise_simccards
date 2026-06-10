-- ════════════════════════════════════════════════════════════════════════
-- Campos de apoio ao motor de cancelamento (Fase 3).
-- - data_ativacao: regra "ativada há menos de N dias"
-- - fidelidade_ate: regra "dentro do período de fidelidade"
-- A proteção manual ("manter" / "chip reserva") já usa linhas.protegida +
-- motivo_protecao; o veículo ativo vem de veiculos_vinculo.
-- ════════════════════════════════════════════════════════════════════════

alter table public.linhas
  add column data_ativacao date,
  add column fidelidade_ate date;

comment on column public.linhas.data_ativacao is 'Data de ativação da linha (proteção "recém-ativada")';
comment on column public.linhas.fidelidade_ate is 'Fim do período de fidelidade (proteção "fidelidade")';
