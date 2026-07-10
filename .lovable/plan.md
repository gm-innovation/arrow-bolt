## Correções Área do Coordenador — 4 bugs

### Bug 1 — Embed inválido em `useCorpGroups.ts` (HTTP 400)
**Causa:** `.select('*, profiles:profiles!corp_group_join_requests_user_id_fkey(...)')` tenta embutir `profiles` via um FK que aponta para `auth.users` (não para `profiles`). PostgREST rejeita com 400.

**Correção:** Trocar o embed por duas etapas:
1. Buscar apenas `corp_group_join_requests` filtrando por `status='pending'`.
2. Buscar em paralelo `profiles(id, full_name, avatar_url)` com `.in('id', userIds)` e fazer merge no cliente.

Alternativa mais limpa: criar view `corp_group_join_requests_with_profile` (LEFT JOIN profiles) — mas o merge no cliente já resolve sem migration.

Arquivo: `src/hooks/useCorpGroups.ts` (linhas ~52-64).

---

### Bug 2 — `ServiceCalendar.tsx` — "TypeError: Failed to fetch"
**Causa provável:** consulta pesada de `service_orders` (join amplo com técnicos) sofrendo statement timeout intermitente do banco, igual ao problema já visto em Medição.

**Correção em 2 frentes:**
1. **Query enxuta:** reduzir o `select(...)` de `ServiceCalendar.tsx:83+` removendo joins desnecessários; buscar só o range do mês visível (`.gte('scheduled_date', ...).lte(...)`) em vez de tudo.
2. **Resiliência:** wrap em try/catch com retry exponencial + fallback silencioso (não spamar toast). Log estruturado.
3. **Índice:** verificar se existe índice em `service_orders(company_id, scheduled_date)`; se não, criar via migration.

Arquivos: `src/components/admin/calendar/ServiceCalendar.tsx`.

---

### Bug 3 — `Clients.tsx:114` — mesmo Failed to fetch
**Causa:** listagem de clientes carrega todos os registros com joins pesados (vessels/contacts).

**Correção:** paginar (limit 50) + usar a view leve `crm_client_options` para o combo já existente, e para a listagem carregar só colunas essenciais. Não trazer vessels/contacts na lista — só no detalhe.

Arquivo: `src/pages/admin/Clients.tsx` (fetchClients).

---

### Bug 4 — Push notifications VAPID (baixa prioridade)
**Causa:** edge function `get-vapid-key` falha em fetch inicial (possivelmente sem `VAPID_PUBLIC_KEY` configurada ou função ausente).

**Correção:** verificar `supabase/functions/get-vapid-key` — se secret existe, se está registrada em `config.toml`. Se push não é prioridade, silenciar o erro no cliente (try/catch sem console.error) e desabilitar o registro do service worker até configurar.

Arquivo a investigar: `src/hooks/usePushNotifications.ts` (ou similar).

---

## Ordem de execução
1. **Bug 1** (1 min, alta prioridade, afeta modais/sino de grupos).
2. **Bug 3** (paginação clientes — reduz carga do banco imediatamente).
3. **Bug 2** (calendar — depende de query mais enxuta).
4. **Bug 4** (silenciar/consertar push).

## Validação
Ao final, re-rodar a suíte Playwright do coordenador e confirmar:
- Zero 400 em `corp_group_join_requests`.
- Zero `Failed to fetch` em `service_orders` e `clients` em 3 recargas seguidas.
- Console limpo (exceto avisos não-erro).
