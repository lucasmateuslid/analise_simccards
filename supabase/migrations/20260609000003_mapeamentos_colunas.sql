-- ════════════════════════════════════════════════════════════════════════
-- mapeamentos_colunas — templates de "coluna do arquivo → campo canônico"
-- por broker. Evita hardcode: cada broker tem seu layout de planilha e o
-- usuário configura/salva o mapeamento na UI.
-- ════════════════════════════════════════════════════════════════════════

create table public.mapeamentos_colunas (
  id              uuid primary key default gen_random_uuid(),
  broker_id       uuid not null references public.brokers (id) on delete cascade,
  nome            text not null check (nome <> ''),
  -- { "iccid": "ICCID", "consumo": "Consumo (KB)", ... } — campo canônico → cabeçalho da coluna
  mapeamento      jsonb not null,
  unidade_consumo text not null default 'MB'
                  check (unidade_consumo in ('bytes', 'KB', 'MB', 'GB')),
  -- mapeia rótulos de status do broker → status canônico, ex.: { "ATIVADO": "ativo" }
  status_map      jsonb not null default '{}',
  -- plano fixo quando o arquivo não traz a coluna de plano
  plano_fixo      text,
  -- template padrão usado quando o broker é detectado automaticamente
  padrao          boolean not null default false,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (broker_id, nome)
);

create index mapeamentos_colunas_broker_id_idx on public.mapeamentos_colunas (broker_id);
-- garante no máximo um template padrão por broker
create unique index mapeamentos_colunas_padrao_idx
  on public.mapeamentos_colunas (broker_id) where padrao;

create trigger mapeamentos_colunas_atualizado_em
  before update on public.mapeamentos_colunas
  for each row execute function public.set_atualizado_em();

alter table public.mapeamentos_colunas enable row level security;

create policy "authenticated_acesso_total" on public.mapeamentos_colunas
  for all to authenticated using (true) with check (true);
