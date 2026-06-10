
# Onda 2 — Revisão de documentos enviados (aprovar / rejeitar) — v2

Fecha o ciclo do Passo 3: hoje qualquer envio feito pelo próprio colaborador fica preso em `pending_review` para sempre. Esta onda dá ao RH a tela e as ações para validar ou recusar, alimentando corretamente os status `valid` / `missing` e os alertas.

## Escopo

1. Fila central de revisão para RH/Diretoria.
2. Ações de **aprovar** e **rejeitar** com motivo.
3. Visualização do arquivo antes da decisão.
4. Reflexo imediato no dashboard de Conformidade e nas pendências do colaborador.
5. Notificação in-app ao colaborador quando o documento é aprovado ou rejeitado (com motivo).
6. Página do colaborador para acompanhar e reenviar.

Fora de escopo desta onda: e-mail/WhatsApp (Passo 4), múltiplos aprovadores em cadeia, comentários encadeados.

## Mudanças de banco

Campos já existem em `hr_employee_documents` (`review_status`, `reviewed_by`, `reviewed_at`, `rejection_reason`). Adições:

### Trigger `hr_employee_documents_on_review` (BEFORE UPDATE) — versão segura

Só age em **transições legítimas** de revisão. Nunca em INSERT, nunca em uploads, nunca sobrescreve quem já veio preenchido:

```sql
IF TG_OP = 'UPDATE'
   AND NEW.review_status IN ('approved', 'rejected')
   AND OLD.review_status = 'pending_review'
   AND NEW.review_status IS DISTINCT FROM OLD.review_status
THEN
  IF NEW.reviewed_by IS NULL THEN
    NEW.reviewed_by := auth.uid();
  END IF;
  IF NEW.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
  END IF;
END IF;
```

Isso elimina o risco do `auth.uid()` do colaborador vazar para `reviewed_by` em uploads ou em qualquer caminho onde `review_status` já venha preenchido pelo cliente.

### Trigger de rejeição → versão (BEFORE UPDATE)

Quando `review_status` muda de `pending_review` para `rejected`, marca a linha como `is_current = false`. Libera o slot do índice parcial para o colaborador reenviar sem violar a unique, e preserva o histórico.

### RPC `hr_pending_reviews(_company_id)`

Retorna a fila com join de colaborador, cargo e item do catálogo. Checa `has_role(auth.uid(), 'hr'|'director'|'super_admin')` no início; caso contrário, `RAISE EXCEPTION`. Evita N+1 no front.

### Policy UPDATE em `hr_employee_documents`

Permite a `hr`/`director`/`super_admin` atualizar `review_status` e `rejection_reason`. Policies de SELECT/INSERT existentes permanecem.

### Trigger de notificação ao colaborador (AFTER UPDATE)

Quando `review_status` transiciona para `approved` ou `rejected`, insere em `notifications` (`type = 'document_review'`, `user_id = employee_id`) com link para `/hr/my-documents`. Mensagem inclui motivo quando rejeitado.

## Hook (`useHRDocumentCompliance.ts`)

Adicionar:
- `usePendingReviews()` — consome a RPC.
- `useReviewDocument()` — mutation `{ document_id, decision: 'approve'|'reject', rejection_reason? }`. Invalida `hr-compliance-overview`, `hr-pending-reviews`, `hr-employee-documents`.
- `useDocumentFileUrl(path)` — signed URL temporária do bucket `corp-documents`.
- `useMyDocuments()` — lista os documentos do próprio usuário (inclui histórico, mais recentes primeiro), usado por `MyDocuments`.

## UI

### Nova página `src/pages/hr/DocumentReviews.tsx` (acesso restrito)
- Rota `/hr/document-reviews` — guard `hr | director | super_admin`.
- Header com contadores (Aguardando, Aprovados hoje, Rejeitados hoje).
- Tabela: Colaborador · Cargo · Documento · Enviado em · Quem enviou · Ações.
- Linha clicada abre **Sheet** com:
  - Metadados.
  - Visualizador (`PDFCanvasViewer` para PDF, `<img>` para imagem) via signed URL.
  - Campo de motivo (obrigatório só quando "Rejeitar").
  - Botões **Aprovar** (primary) e **Rejeitar** (destructive).

### Nova página `src/pages/hr/MyDocuments.tsx` (acesso aberto a qualquer colaborador)

**Regra explícita de rota:**
> `/hr/my-documents` é acessível a **qualquer usuário autenticado**. **Não requer** role `hr`/`director`. A rota deve ficar **fora** do guard de roles do módulo RH. A segurança é garantida pelo RLS de `hr_employee_documents` (`employee_id = auth.uid()`), que já existe. O item aparece no menu lateral para todos os autenticados (não apenas RH).

Conteúdo:
- Lista de itens aplicáveis (RPC `hr_employee_document_status` filtrada pelo próprio `employee_id`).
- Para cada item: status atual, expiração, motivo de rejeição (se houver), botão de envio/reenvio.
- Histórico colapsável por item (versões antigas, `is_current = false`).

### Atualizações em telas existentes
- `DocumentCompliance.tsx`: badge "X aguardando revisão" no header linkando para `/hr/document-reviews`; ações de aprovar/rejeitar inline também no drawer de detalhes do colaborador.
- `DashboardLayout.tsx`:
  - **Dentro do agrupador RH (guard hr/director/super_admin):** novo item **"Revisão de Documentos"** com badge de pendências.
  - **Fora do agrupador RH (visível para todos os autenticados):** item **"Meus Documentos"** apontando para `/hr/my-documents`. Pode ficar no grupo "Perfil" ou em um agrupador neutro — o importante é não estar atrás do guard de RH.

### Rotas em `src/App.tsx`
- `/hr/document-reviews` dentro do bloco protegido por roles RH.
- `/hr/my-documents` em bloco apenas com guard de autenticação.

## Regras de status reaplicadas

Com a rejeição marcando `is_current = false`, a RPC `hr_employee_document_status` passa a devolver `missing` corretamente para itens rejeitados, sem nenhuma alteração na própria RPC.

## Entregáveis

- Migration única: triggers (review seguro + rejeição → `is_current` + notificação), RPC `hr_pending_reviews`, policy UPDATE.
- `src/hooks/useHRDocumentCompliance.ts` ampliado.
- `src/pages/hr/DocumentReviews.tsx` (novo, restrito).
- `src/pages/hr/MyDocuments.tsx` (novo, aberto a autenticados).
- `src/components/DashboardLayout.tsx` (dois itens, em guards distintos).
- `src/App.tsx` (rotas em blocos de guard distintos).

## Próximo passo

Passo 4 — disparar e-mail (e WhatsApp opcional) nos eventos `document_rejected`, `document_expiring_soon`, `document_expired`, reutilizando `hr-document-compliance-check`.
