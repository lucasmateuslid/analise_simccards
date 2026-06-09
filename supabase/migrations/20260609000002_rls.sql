-- ════════════════════════════════════════════════════════════════════════
-- RLS — modelo single-tenant (uma empresa)
--
-- - `authenticated`: acesso total (todos os usuários da empresa veem os
--   mesmos dados).
-- - `anon`: nenhum acesso (RLS habilitado sem policy = bloqueado).
-- - Backend/worker usam service_role (bypassa RLS) via chave em env/Vault.
-- ════════════════════════════════════════════════════════════════════════

alter table public.brokers          enable row level security;
alter table public.planos           enable row level security;
alter table public.linhas           enable row level security;
alter table public.consumo_mensal   enable row level security;
alter table public.veiculos_vinculo enable row level security;
alter table public.ingestoes        enable row level security;
alter table public.app_config       enable row level security;

create policy "authenticated_acesso_total" on public.brokers
  for all to authenticated using (true) with check (true);

create policy "authenticated_acesso_total" on public.planos
  for all to authenticated using (true) with check (true);

create policy "authenticated_acesso_total" on public.linhas
  for all to authenticated using (true) with check (true);

create policy "authenticated_acesso_total" on public.consumo_mensal
  for all to authenticated using (true) with check (true);

create policy "authenticated_acesso_total" on public.veiculos_vinculo
  for all to authenticated using (true) with check (true);

create policy "authenticated_acesso_total" on public.ingestoes
  for all to authenticated using (true) with check (true);

create policy "authenticated_acesso_total" on public.app_config
  for all to authenticated using (true) with check (true);
