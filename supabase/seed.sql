-- Seed de desenvolvimento — dados fictícios para validar schema e dashboard.
-- NÃO aplicar em produção.

insert into public.brokers (id, nome, tipo_ingestao) values
  ('11111111-1111-1111-1111-111111111111', 'Arqia', 'planilha'),
  ('22222222-2222-2222-2222-222222222222', 'Transmobi', 'planilha');

insert into public.planos (id, broker_id, nome, franquia_mb, custo_mensal) values
  ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'M2M 10MB', 10, 4.90),
  ('aaaaaaaa-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'M2M 50MB', 50, 7.90),
  ('bbbbbbbb-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Frota 30MB', 30, 5.50);

insert into public.linhas (iccid, msisdn, broker_id, plano_id, status, protegida, motivo_protecao) values
  -- linha saudável, conectando normalmente
  ('8955170110001000001', '5511990000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'ativo', false, null),
  -- linha com overage (consumo acima da franquia)
  ('8955170110001000002', '5511990000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-1111-1111-1111-111111111111', 'ativo', false, null),
  -- linha ociosa há ~120 dias, sem veículo ativo → candidata a cancelamento
  ('8955170110001000003', '5511990000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-2222-2222-2222-222222222222', 'ativo', false, null),
  -- linha ociosa mas protegida manualmente
  ('8955170110001000004', '5511990000004', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-1111-1111-1111-111111111111', 'ativo', true, 'Chip reserva/backup'),
  -- linha ociosa porém veículo segue ativo no rastreamento (parado ≠ cancelado)
  ('8955170110001000005', '5511990000005', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-1111-1111-1111-111111111111', 'ativo', false, null);

-- Linhas que exercitam as proteções por data (Fase 3).
insert into public.linhas
  (iccid, msisdn, broker_id, plano_id, status, protegida, motivo_protecao, data_ativacao, fidelidade_ate) values
  -- ociosa, sem veículo, mas ativada há poucos dias → protegida (recém-ativada)
  ('8955170110001000006', '5511990000006', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-1111-1111-1111-111111111111', 'ativo', false, null, '2026-05-25', null),
  -- ociosa, sem veículo, mas dentro da fidelidade → protegida (fidelidade)
  ('8955170110001000007', '5511990000007', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-1111-1111-1111-111111111111', 'ativo', false, null, '2025-08-01', '2026-12-31');

insert into public.consumo_mensal (iccid, referencia_mes, consumo_mb, custo, ultima_conexao, operadora, fonte) values
  -- março/2026 — 3 chips
  ('8955170110001000001', '2026-03', 6.10, 4.90, '2026-03-28T10:00:00Z', 'Vivo', 'planilha'),
  ('8955170110001000002', '2026-03', 9.00, 7.90, '2026-03-30T12:00:00Z', 'Claro', 'planilha'),
  ('8955170110001000003', '2026-03', 1.20, 7.90, '2026-03-15T09:00:00Z', 'Vivo', 'planilha'),
  -- abril/2026 — 4 chips
  ('8955170110001000001', '2026-04', 7.30, 4.90, '2026-04-29T18:00:00Z', 'Vivo', 'planilha'),
  ('8955170110001000002', '2026-04', 15.00, 9.20, '2026-04-30T07:00:00Z', 'Claro', 'planilha'),
  ('8955170110001000003', '2026-04', 0.00, 7.90, '2026-02-08T03:15:00Z', 'Vivo', 'planilha'),
  ('8955170110001000004', '2026-04', 0.00, 5.50, '2026-01-20T11:00:00Z', 'TIM', 'planilha'),
  -- maio/2026 — 7 chips
  ('8955170110001000001', '2026-05', 8.42, 4.90, '2026-05-30T18:22:00Z', 'Vivo', 'planilha'),
  ('8955170110001000002', '2026-05', 23.70, 11.45, '2026-05-31T07:10:00Z', 'Claro', 'planilha'),
  ('8955170110001000003', '2026-05', 0.00, 7.90, '2026-02-08T03:15:00Z', 'Vivo', 'planilha'),
  ('8955170110001000004', '2026-05', 0.00, 5.50, '2026-01-20T11:00:00Z', 'TIM', 'planilha'),
  ('8955170110001000005', '2026-05', 0.12, 5.50, '2026-02-25T22:40:00Z', 'Claro', 'planilha'),
  ('8955170110001000006', '2026-05', 0.00, 5.50, null, 'TIM', 'planilha'),
  ('8955170110001000007', '2026-05', 0.00, 5.50, '2026-01-10T08:00:00Z', 'Vivo', 'planilha');

insert into public.veiculos_vinculo (iccid, placa, ativo) values
  ('8955170110001000001', 'ABC1D23', true),
  ('8955170110001000002', 'DEF4G56', true),
  ('8955170110001000003', 'GHI7J89', false),
  ('8955170110001000005', 'KLM0N12', true);

insert into public.ingestoes (fonte, broker_id, qtd_linhas, status, erros) values
  ('planilha', '11111111-1111-1111-1111-111111111111', 3, 'sucesso', '[]'),
  ('planilha', '22222222-2222-2222-2222-222222222222', 2, 'sucesso', '[]');

-- Templates de mapeamento de colunas (Fase 1) — exemplos para os layouts fictícios.
insert into public.mapeamentos_colunas
  (broker_id, nome, mapeamento, unidade_consumo, status_map, padrao) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Arqia — layout padrão',
    '{"iccid":"ICCID","msisdn":"Linha","plano":"Plano","consumo":"Consumo (KB)","custo":"Valor","status":"Situacao","ultimaConexao":"Ultima Conexao","operadora":"Operadora"}',
    'KB',
    '{"ATIVADO":"ativo","SUSPENSO":"suspenso","CANCELADO":"cancelado"}',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Transmobi — layout padrão',
    '{"iccid":"iccid","msisdn":"msisdn","plano":"plano","consumo":"consumo_mb","custo":"custo","status":"status","ultimaConexao":"ultima_conexao","operadora":"operadora"}',
    'MB',
    '{}',
    true
  );
