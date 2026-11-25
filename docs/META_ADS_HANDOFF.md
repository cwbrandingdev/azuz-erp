# Handoff — Meta Ads no Atria (novo chat)

Cole este arquivo ou `@docs/META_ADS_HANDOFF.md` ao abrir um chat novo.

## Objetivo

Painel de relatório **Meta Ads** para agência: um token lista todas as contas de anúncio e exibe KPIs, gráficos, campanhas, público, posicionamento e funil. Foco em **`/ads`** — não confundir com **`/insights`** (métricas orgânicas de Instagram por cliente).

## Onde está no código

| Área | Caminho |
|------|---------|
| Página | `frontend-atria/app/(main)/ads/page.tsx` |
| UI principal | `frontend-atria/components/meta-analytics/meta-ads-report-panel.tsx` |
| Seletor conta (busca) | `frontend-atria/components/meta-analytics/meta-client-selector.tsx` → `SearchableSelect` |
| API client | `frontend-atria/services/meta-analytics.service.ts` |
| Backend | `backend-atria/src/integrations/meta-analytics/` |
| Relatório completo | `GET /insights/client/:clientId/report` |
| Listar contas | `GET /insights/clients` |
| Resumo agência | `GET /insights/agency` |

Menu: **Visão geral → Meta Ads** (`/ads`), roles admin/master.

## Meta API — configuração

1. App Meta com caso de uso **API de Marketing** (app **CW API** no projeto).
2. Permissões: **`ads_read`**, **`business_management`** (leitura de relatório).
3. Token: **usuário** ou **usuário do sistema** no Business Manager — **não** token só de **Página**.
4. Teste no Graph Explorer: `GET me/adaccounts?fields=id,name,account_status,currency` com **Token do usuário**.
5. Erro `(#100) field (adaccounts)` = selecionou Página em vez de usuário.

## Token no Atria (ordem de prioridade)

**Relatório `/ads` usa `.env` do backend antes das Integrações:**

- `META_ACCESS_TOKEN` — obrigatório para ads
- `META_APP_ID`, `META_APP_SECRET`, `META_API_VERSION` (v19.0 no código)
- `META_AD_ACCOUNT_ID` — fallback quando nenhuma conta é escolhida no painel

**Configurações → Integrações / APIs:** `metaPageAccessToken` e `metaAdAccountId` só entram se o `.env` estiver vazio (útil para Instagram; não usar token de página para ads).

Após mudar `.env`, **reiniciar** `npm run start:dev` no `backend-atria`.

## UI atual (layout tipo dashboard pago)

- Header: conta, período, seletor com busca, **Atualizar dados**
- 7 KPIs: investimento, impressões, cliques, CTR, CPC, resultados (compras+leads), CPL
- Gráfico: gasto (barras) + resultados (linha)
- Dois gráficos: cliques/dia, CTR/dia
- Abas: campanhas, anúncios, público, posicionamento, funil; objetivos na visão geral
- Tabela “todas as contas” em `<details>` no rodapé

Cores: tema Atria (`--atria-primary`), sem roxo do mock de referência.

## Erros conhecidos

| Sintoma | Causa provável |
|---------|----------------|
| `user logged out` / token inválido | Token antigo, token de página, ou Integrações sobrescrevendo antes da mudança de prioridade |
| Lista vazia de contas | Token sem contas atribuídas no BM |
| Cron `crm_reminder_tasks.user_id` | Migration pendente no banco — não bloqueia `/ads` |

## Dev local

- Backend: `backend-atria` porta **3001**
- Frontend: `frontend-atria` porta **3000**
- Teste: login admin → `/ads`

## Contexto de tokens (Composer)

Para chats longos: novo Composer + este handoff; não reexplicar Meta setup a cada turno.