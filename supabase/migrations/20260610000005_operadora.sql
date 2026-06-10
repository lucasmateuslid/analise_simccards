-- ════════════════════════════════════════════════════════════════════════
-- Operadora conectada (rede móvel onde o chip está camped: Vivo/Claro/TIM…),
-- distinta do fornecedor/broker (de quem o chip é contratado). Chips M2M
-- multi-operadora podem trocar de rede, então é uma observação por mês.
-- ════════════════════════════════════════════════════════════════════════

alter table public.consumo_mensal add column operadora text;

comment on column public.consumo_mensal.operadora is 'Operadora/rede conectada no mês (ex.: Vivo, Claro, TIM)';
