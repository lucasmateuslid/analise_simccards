# Gestão de Consumo M2M

Sistema de gestão de consumo de linhas/chips M2M (rastreamento veicular): consolida dados de múltiplos brokers/operadoras, calcula custos e identifica linhas ociosas passíveis de cancelamento.

## Arquitetura

Toda fonte de dados passa por um **adapter** que converte o formato bruto para um **schema canônico único**. Regras de negócio e analytics leem apenas o canônico — nunca o formato cru.

```
[Planilha XLSX/CSV] ──┐
[Portal scraping]   ──┤──> [Adapter por fonte] ──> [Schema Canônico] ──> [Snapshot mensal] ──> [Analytics + Regras]
[API broker]        ──┘
```

O schema canônico (`LinhaConsumoCanonico`) vive em [`packages/core`](packages/core/src/types/canonico.ts). Invariantes garantidas pelos adapters:

- **Consumo sempre em MB** — conversão em [`normalize/unidades.ts`](packages/core/src/normalize/unidades.ts) (base binária: 1 GB = 1024 MB).
- **Datas sempre em ISO 8601 UTC** — conversão em [`normalize/datas.ts`](packages/core/src/normalize/datas.ts) (aceita formato brasileiro, ISO, serial Excel e epoch).
- Registros inválidos viram **erros-valor** (`Resultado<T>`), registrados em `ingestoes` — nunca exceptions que derrubam a importação.

## Estrutura

```
packages/core    Domínio puro: tipos canônicos, contrato SourceAdapter, normalizadores (+ testes)
apps/api         Express + TS — endpoints (health check pronto; ingestão/analytics nas Fases 1–2)
apps/web         React + Vite + Tailwind — dashboard (esqueleto; KPIs/gráficos na Fase 2)
apps/worker      BullMQ + Playwright — scraping (stub; implementação na Fase 4)
supabase/        Migrations (schema + RLS), seed de desenvolvimento e config local
```

## Pré-requisitos

- Node ≥ 20 e pnpm (`corepack enable pnpm`)
- Docker (para o Supabase local)

## Setup

```bash
pnpm install
pnpm db:start          # sobe o Supabase local (serviços pesados desabilitados no config.toml)
pnpm db:reset          # aplica migrations + seed
cp .env.example apps/api/.env   # preencha com os valores de `supabase status`
pnpm dev               # api (3001) + web (5173) em paralelo
```

Verificações:

```bash
pnpm build && pnpm typecheck && pnpm test && pnpm lint
curl http://localhost:3001/health/db   # deve responder {"ok":true,"brokers":2}
```

## Modelo de dados (Supabase)

| Tabela | Papel |
| --- | --- |
| `brokers` | Operadoras contratadas e tipo de ingestão (planilha/scraping/api) |
| `planos` | Plano por broker: franquia (MB) e custo mensal |
| `linhas` | Chips (PK = ICCID), status e flag/motivo de proteção |
| `consumo_mensal` | Snapshot por linha e mês — `UNIQUE(iccid, referencia_mes)` |
| `veiculos_vinculo` | ICCID ↔ placa, sincronizado do rastreamento (fonte de verdade p/ "veículo ativo") |
| `ingestoes` | Log de cada importação com erros por registro |
| `app_config` | Parâmetros de negócio (ex.: `limite_ociosidade_dias = 90`) |

**RLS (single-tenant):** `authenticated` tem acesso total; `anon` não acessa nada; backend/worker usam `service_role` via env.

## Convenções

- **Zero credenciais em código** — tudo em env (`.env`, fora do git) ou Supabase Vault.
- TypeScript estrito em todos os packages; `any` proibido no domínio (`packages/core`) via ESLint.
- Cancelamento **nunca é automático**: o motor de regras (Fase 3) apenas sinaliza candidatas para revisão.

## Roadmap

- **Fase 0 — Fundação** ✅ schema + RLS, tipos canônicos, normalizadores testados, esqueletos dos apps
- **Fase 1 — Ingestão por planilha**: upload XLSX/CSV, mapeamento de colunas configurável por broker, snapshot mensal
- **Fase 2 — Analytics + dashboard**: custo/consumo por broker, variação mensal, alto consumo (overage + P90), KPIs e gráficos
- **Fase 3 — Motor de cancelamento**: candidatas (ociosidade > limite, sem veículo ativo, não protegida) + sincronização com rastreamento
- **Fase 4 — Scraping piloto**: 1 broker via BullMQ + Playwright, retry/backoff e fallback para upload manual
