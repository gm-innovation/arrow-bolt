

## Plano: Corrigir persistência do toggle Omie e sincronização incompleta

### Problema 1 — Toggle não persiste
O toggle "Sincronização Omie" atualiza apenas o estado local. O valor só é salvo quando o usuário clica "Salvar Credenciais". Ao sair da página sem salvar, o valor se perde. No banco, `omie_sync_enabled` está `false`.

**Solução**: Tornar o toggle auto-save — ao mudar o switch, salvar imediatamente no banco via edge function, sem precisar clicar "Salvar Credenciais".

### Problema 2 — Apenas 450 de 2558 clientes sincronizados
A sincronização percorre páginas de 50 clientes cada (2558 ÷ 50 = ~52 páginas). Cada cliente é inserido/atualizado individualmente (1 query por cliente). Isso resulta em ~2600+ queries sequenciais, excedendo o timeout da edge function (~60s). A função para silenciosamente na página ~9.

**Solução**: Usar upsert em lote (batch) — inserir/atualizar até 50 clientes por operação ao invés de 1 por 1. Isso reduz de ~2600 queries para ~52, completando dentro do timeout.

### Alterações

**1. `OmieSettingsTab.tsx`**
- Toggle chama `saveCredentials` imediatamente ao ser alterado com os valores atuais de `appKey` e `appSecret`
- Feedback visual de "salvando" no toggle

**2. `supabase/functions/omie-proxy/index.ts`**
- `handleSyncClients`: substituir loop individual por upsert em batch usando `.upsert()` com `onConflict: 'company_id, omie_client_id'`
- Aumentar `registros_por_pagina` de 50 para 500 (máximo permitido pela API Omie), reduzindo de 52 para 6 páginas
- Requer índice unique em `(company_id, omie_client_id)` na tabela `clients`

**3. Migração SQL**
- Criar índice unique em `clients(company_id, omie_client_id)` para suportar upsert nativo do banco

