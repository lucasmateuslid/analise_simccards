-- ════════════════════════════════════════════════════════════════════════
-- Schema inicial — Gestão de Consumo M2M
-- Convenções: consumo sempre em MB; datas timestamptz (UTC);
-- referencia_mes sempre 'YYYY-MM'.
-- ════════════════════════════════════════════════════════════════════════

-- Trigger genérico de atualizado_em
create or replace function public.set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ── brokers ───────────────────────────────────────────────────────────────
create table public.brokers (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null unique check (nome <> ''),
  tipo_ingestao text not null check (tipo_ingestao in ('planilha', 'scraping', 'api')),
  config_json   jsonb not null default '{}',
  criado_em     timestamptz not null default now()
);

comment on table public.brokers is 'Operadoras/brokers de chips M2M contratados';
comment on column public.brokers.config_json is 'Config específica da fonte (ex.: URL do portal, template de mapeamento padrão). NUNCA credenciais.';

-- ── planos ────────────────────────────────────────────────────────────────
create table public.planos (
  id           uuid primary key default gen_random_uuid(),
  broker_id    uuid not null references public.brokers (id) on delete cascade,
  nome         text not null check (nome <> ''),
  franquia_mb  numeric(12, 2) check (franquia_mb >= 0),
  custo_mensal numeric(12, 2) not null check (custo_mensal >= 0),
  criado_em    timestamptz not null default now(),
  unique (broker_id, nome)
);

comment on column public.planos.franquia_mb is 'Franquia em MB; null = sem franquia definida/ilimitado';

-- ── linhas ────────────────────────────────────────────────────────────────
create table public.linhas (
  iccid           text primary key check (iccid <> ''),
  msisdn          text,
  broker_id       uuid not null references public.brokers (id),
  plano_id        uuid references public.planos (id),
  status          text not null default 'desconhecido'
                  check (status in ('ativo', 'suspenso', 'cancelado', 'desconhecido')),
  protegida       boolean not null default false,
  motivo_protecao text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  -- proteção sem motivo é inauditável; motivo sem proteção é lixo
  check (protegida = false or motivo_protecao is not null)
);

create index linhas_broker_id_idx on public.linhas (broker_id);
create index linhas_status_idx on public.linhas (status);
create index linhas_protegida_idx on public.linhas (protegida) where protegida;

create trigger linhas_atualizado_em
  before update on public.linhas
  for each row execute function public.set_atualizado_em();

-- ── consumo_mensal (snapshot por mês) ─────────────────────────────────────
create table public.consumo_mensal (
  id             uuid primary key default gen_random_uuid(),
  iccid          text not null references public.linhas (iccid) on delete cascade,
  referencia_mes text not null check (referencia_mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  consumo_mb     numeric(14, 2) not null check (consumo_mb >= 0),
  custo          numeric(12, 2) not null check (custo >= 0),
  ultima_conexao timestamptz,
  fonte          text not null check (fonte in ('planilha', 'scraping', 'api')),
  criado_em      timestamptz not null default now(),
  unique (iccid, referencia_mes)
);

create index consumo_mensal_referencia_mes_idx on public.consumo_mensal (referencia_mes);
create index consumo_mensal_ultima_conexao_idx on public.consumo_mensal (ultima_conexao);

comment on table public.consumo_mensal is 'Snapshot mensal por linha — sempre em MB e UTC, emitido pelos adapters';

-- ── veiculos_vinculo (sincronizado do rastreamento — fonte de verdade
--    para a regra "veículo ativo" do motor de cancelamento) ────────────────
create table public.veiculos_vinculo (
  iccid         text not null references public.linhas (iccid) on delete cascade,
  placa         text not null check (placa <> ''),
  ativo         boolean not null default true,
  atualizado_em timestamptz not null default now(),
  primary key (iccid, placa)
);

create index veiculos_vinculo_ativo_idx on public.veiculos_vinculo (ativo) where ativo;

create trigger veiculos_vinculo_atualizado_em
  before update on public.veiculos_vinculo
  for each row execute function public.set_atualizado_em();

-- ── ingestoes (log de importações) ────────────────────────────────────────
create table public.ingestoes (
  id         uuid primary key default gen_random_uuid(),
  fonte      text not null check (fonte in ('planilha', 'scraping', 'api')),
  broker_id  uuid references public.brokers (id),
  qtd_linhas integer not null default 0 check (qtd_linhas >= 0),
  status     text not null check (status in ('sucesso', 'parcial', 'erro')),
  erros      jsonb not null default '[]',
  criado_em  timestamptz not null default now()
);

create index ingestoes_criado_em_idx on public.ingestoes (criado_em desc);

-- ── app_config (parâmetros de negócio — evita hardcode) ──────────────────
create table public.app_config (
  chave         text primary key,
  valor         jsonb not null,
  atualizado_em timestamptz not null default now()
);

create trigger app_config_atualizado_em
  before update on public.app_config
  for each row execute function public.set_atualizado_em();

insert into public.app_config (chave, valor) values
  ('limite_ociosidade_dias', '90'::jsonb),
  ('dias_minimos_pos_ativacao', '30'::jsonb);
