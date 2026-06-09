# Fechamento dos 2 gaps pendentes — v2 (com ajustes)

Ajustes incorporados: default permissivo, pg_cron confirmado disponível, índice obrigatório.

---

## ⚠️ Validação necessária com a Rayane ANTES de aplicar

Pergunta única e bloqueante para o Ponto 1:

> **"Documentos sem regra configurada em `quality_document_permissions` devem permitir impressão/download por padrão, ou devem bloquear até que alguém configure?"**
>
> - **Opção A (recomendada — alinhada ao comportamento atual)**: liberar por padrão. Bloqueio só entra quando há regra explícita restritiva (por role ou usuário). Documentos marcados como "cópia controlada" continuam controlados pelo fluxo de `quality_controlled_copies` (já existe).
> - **Opção B (mais restritiva)**: bloquear por padrão. Todo documento precisa ter regra configurada antes de ser impresso/baixado — pode quebrar fluxo atual em massa.

O plano abaixo assume **Opção A**. Se ela responder B, ajustar só a função `quality_doc_user_perms`.

---

## Parte 1 — Regras de impressão/download por perfil em GED

### Estado atual confirmado
- Tabela `quality_document_permissions` com `role` + `user_id` (opcional) + `can_view`/`can_print`/`can_download`. **Já existe.**
- `DocumentPermissionsPanel` (UI de configuração). **Já existe.**
- **Falta enforcement**: 3 botões em `src/pages/quality/DocumentDetail.tsx` não consultam as regras.

### O que será feito

1. **RPC `public.quality_doc_user_perms(_document_id uuid)`** — SECURITY DEFINER, STABLE
   - Retorna `{ can_view, can_print, can_download }` (boolean).
   - `director` / `super_admin` da empresa do documento → sempre `true/true/true`.
   - Demais usuários:
     - Se houver regra com `user_id = auth.uid()` → usar essa (override individual).
     - Senão, se houver regra com `user_id IS NULL` e `role` ∈ roles do usuário → consolidar via **OR** (qualquer role que conceda libera).
     - **Senão (sem registro algum) → `can_view=true, can_print=true, can_download=true`** (Opção A — não-restritivo, preserva fluxo atual).

2. **Hook `useDocumentPerms(documentId)`** — `src/hooks/useDocumentPerms.ts`
   - React Query consumindo o RPC.

3. **`DocumentDetail.tsx`** — gate nos 3 botões:
   - `downloadGeneratedPDF(null)` (Baixar PDF) → exige `can_download`.
   - `downloadGeneratedPDF("uncontrolled")` (Cópia não controlada) → exige `can_print`.
   - `downloadFile(activeVersion.file_path)` (Arquivo original) → exige `can_download`.
   - Quando `false`: botão `disabled` + tooltip "Sem permissão configurada para este documento". `onClick` também valida (defesa em profundidade) e dispara toast em violação.
   - Botão "Visualizar" continua livre quando `can_view = true`.

4. **Auditoria de tentativas negadas**
   - Inserir em `quality_document_access_log` com `action = 'denied_print'` ou `'denied_download'` (já existe a tabela).

---

## Parte 2 — Expiração automática de anexos normativos

### Estado atual confirmado
- `quality_reference_norms` tem `valid_from`, `valid_until`, `is_active`, `next_review_due_at`.
- Badge "Ativa/Inativa" usa só `is_active` (manual).
- **`pg_cron` e `pg_net` já habilitados** no projeto (confirmado).
- **Não há índice em `valid_until`** (confirmado — só PK e UNIQUE em code).

### O que será feito

1. **Índice obrigatório** (não opcional):
   ```sql
   CREATE INDEX IF NOT EXISTS idx_quality_reference_norms_valid_until
     ON public.quality_reference_norms (valid_until)
     WHERE valid_until IS NOT NULL;
   ```

2. **VIEW `quality_reference_norms_status`**
   - Mesmas colunas da tabela + coluna calculada `effective_status`:
     - `is_active = false` → `'inativa'`
     - `valid_until IS NOT NULL AND valid_until < CURRENT_DATE` → `'vencida'`
     - `valid_until IS NOT NULL AND valid_until <= CURRENT_DATE + INTERVAL '30 days'` → `'vence_em_breve'`
     - senão → `'vigente'`
   - `GRANT SELECT ... TO authenticated`.
   - `security_invoker = on` para herdar RLS da tabela base.
   - **Não usar `GENERATED STORED`** (incompatível com `CURRENT_DATE`, que é STABLE).

3. **Coluna `expiry_warning_sent_at TIMESTAMPTZ NULL`** em `quality_reference_norms`
   - Idempotência do aviso de "vence em breve".

4. **Função `public.quality_norms_expire_tick()`** — SECURITY DEFINER
   - Para normas com `valid_until < CURRENT_DATE AND is_active = true`:
     - `UPDATE quality_reference_norms SET is_active = false WHERE ...`.
     - Inserir notificação em `notifications` para `director` + `coordinator` da empresa: "Norma {code} venceu em {valid_until}".
   - Para normas `vence_em_breve` (≤30 dias) com `expiry_warning_sent_at IS NULL`:
     - Inserir notificação "Norma {code} vence em {N} dias".
     - `UPDATE ... SET expiry_warning_sent_at = now()`.

5. **Agendamento — usar `pg_cron` (disponível)**
   - **Sem fallback de trigger on-read** (rejeitado: causaria notificações duplicadas, timing inconsistente e mutação em SELECT).
   - SQL via tool `supabase--insert` (não migração, contém URL+anon key específicos do projeto):
     ```sql
     SELECT cron.schedule(
       'quality-norms-expire-tick',
       '0 3 * * *',
       $$ SELECT net.http_post(
            url := 'https://iyuypkfksxfsutubcpay.supabase.co/functions/v1/quality-norms-expire-tick',
            headers := '{"Content-Type":"application/json","apikey":"<ANON>"}'::jsonb,
            body := '{}'::jsonb
          ); $$
     );
     ```
   - **Edge Function `quality-norms-expire-tick`** (`verify_jwt = true`, registrada em `config.toml`) — apenas chama o RPC `quality_norms_expire_tick()` via service role.
   - Se preferirmos manter tudo dentro do Postgres (sem Edge Function), o cron pode chamar diretamente `SELECT public.quality_norms_expire_tick();` — mais simples; vou adotar essa variante por default.

6. **`NormsTab.tsx` — UI**
   - Consumir a VIEW `quality_reference_norms_status` (via hook `useQualityReferenceNorms`).
   - Substituir badge "Ativa/Inativa" por `effective_status`:
     - `vigente` → Badge verde "Vigente".
     - `vence_em_breve` → Badge amarelo + ícone alerta + "vence em N dias".
     - `vencida` → Badge vermelho "VENCIDA desde DD/MM/AAAA".
     - `inativa` → Badge cinza "Inativa".
   - Linha com `opacity-70` quando `vencida` ou `inativa`.

7. **Bloqueio funcional em selects**
   - Novo seletor `activeNorms` no hook = filtra `effective_status IN ('vigente','vence_em_breve')`.
   - Selects de "Norma aplicável" em RNCs / Auditorias / Documentos passam a usar `activeNorms` — normas vencidas não aparecem em novos cadastros.

---

## Arquivos tocados

**Migração SQL (uma):**
- RPC `quality_doc_user_perms`
- Índice `idx_quality_reference_norms_valid_until`
- VIEW `quality_reference_norms_status` + GRANT
- Coluna `expiry_warning_sent_at`
- Função `quality_norms_expire_tick()`

**`supabase--insert` (separado, não migração — contém URL/anon):**
- `cron.schedule('quality-norms-expire-tick', '0 3 * * *', ...)`

**Frontend:**
- `src/hooks/useDocumentPerms.ts` (novo)
- `src/pages/quality/DocumentDetail.tsx` (gate nos 3 botões + log de negação)
- `src/hooks/useQualityIsoStructure.ts` (consumir VIEW; expor `activeNorms`)
- `src/components/quality/norms/NormsTab.tsx` (badge por `effective_status`)

**Sem mudanças em:** RLS atual, storage, sidemenu, Edge Functions.

---

## Validações pós-implementação

- Coordinator com regra `can_download=false` em doc X → botão desabilitado, tooltip ok, log `denied_download` registrado.
- Director em qualquer doc → todos os botões habilitados.
- Documento sem regras → todos os botões habilitados (Opção A).
- Norma com `valid_until = ontem` → aparece "VENCIDA" imediatamente (via VIEW) e some dos selects.
- Após cron rodar: norma vencida tem `is_active = false` e notificação criada para director/coordinator.
- Norma com `valid_until = hoje + 15` → "vence em 15 dias", notificação criada uma única vez (idempotência via `expiry_warning_sent_at`).

