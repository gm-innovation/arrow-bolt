
# Sprint 3.3 — Li e Ciente (frontend)

A migration de banco já foi aplicada (coluna `requires_strong_acknowledgement`, tabela `quality_document_acknowledgement_assignments` com RLS + GRANTs, função `quality_register_acknowledgement` com `SET search_path = public` e checagem 100% atômica, trigger de clone ao publicar, view `quality_acknowledgements_v`, notificação de atribuição). Resta o frontend.

## 1. `src/hooks/useQualityAcknowledgements.ts` (novo)
Dois hooks:
- `useMyAcknowledgements()` — lista da view `quality_acknowledgements_v` filtrada por `user_id`; expõe `pending`, `history`, e mutação `acknowledge` que chama a RPC `quality_register_acknowledgement` enviando `navigator.userAgent`. Mapeia erros do banco (`signature_required_but_missing`, `forbidden_not_assignee`, `assignment_cancelled`) para toasts amigáveis.
- `useDocumentAcknowledgements(documentId, versionId)` — para o Master: lista atribuições, mutações `assign(user_ids[], version_id, due_date?)`, `cancel(id)` (UPDATE status=cancelled), `setRequiresStrong(boolean)` (UPDATE em `quality_documents`). Calcula `total/acknowledged/pending/cancelled/progress`.

## 2. `src/pages/quality/MyAcknowledgements.tsx` (novo)
Tabs **Pendentes / Histórico**.
- Cada pendência mostra código + título + revisão, badges "Confirmação simples" ou "Assinatura eletrônica", prazo, atraso em vermelho.
- Botões "Abrir" (link para `/quality/documents/:id`) e "Li e estou ciente" / "Confirmar com assinatura".
- Para ciência forte: dialog confirmando uso da assinatura cadastrada; se o usuário não tiver `quality_signatures` ativa, mostra link para `/quality/signature`.
- Histórico lista ciências concluídas e atribuições canceladas.

## 3. `src/components/quality/DocumentAcknowledgementsPanel.tsx` (novo)
Painel da nova aba **Ciência** no `DocumentDetail`:
- Switch "Exige assinatura eletrônica" controlando `requires_strong_acknowledgement`.
- 4 indicadores: Atribuídos / Concluídos / Pendentes / Progresso (Progress bar + %).
- Busca de colaborador (mínimo 2 chars em `profiles`), multi-seleção via checkbox, campo de prazo opcional (`<input type="date">`), botão "Atribuir".
- Tabela das atribuições com colunas: colaborador, revisão (badge "Atual"/"Anterior"), prazo, status, data da ciência, botão lixeira (apenas para pendentes).

## 4. `src/pages/quality/DocumentDetail.tsx` (editar)
- Adicionar `import DocumentAcknowledgementsPanel from "@/components/quality/DocumentAcknowledgementsPanel"` e ícone `BadgeCheck` no `lucide-react`.
- Nova `<TabsTrigger value="acknowledgements">Ciência</TabsTrigger>` e `<TabsContent value="acknowledgements">` renderizando o painel com `documentId`, `currentVersionId={document.current_version_id}`, `requiresStrong={(document as any).requires_strong_acknowledgement}`.

## 5. `src/App.tsx` (editar)
- `const QualityMyAcknowledgements = lazy(() => import("./pages/quality/MyAcknowledgements"))`.
- `<Route path="/quality/my-acknowledgements" element={<QualityMyAcknowledgements />} />` no bloco de rotas Quality.

## 6. `src/components/DashboardLayout.tsx` (editar)
Em `qualidadeMenuItems`, inserir antes de "Voz do Cliente":
`{ title: "Minha Ciência", icon: BadgeCheck, path: "/quality/my-acknowledgements" }`
e importar `BadgeCheck` do `lucide-react` se ainda não estiver presente.

## 7. `src/pages/quality/Dashboard.tsx` (editar)
Novo card "Ciências pendentes" (consulta direta à view para a empresa do usuário, contagem por status=pending). Link para `/quality/my-acknowledgements`. Adicionado como 6ª coluna no grid (ajustar `lg:grid-cols-5` → `lg:grid-cols-6` ou empurrar para nova linha).

## Notas de execução
- A view `quality_acknowledgements_v` usa `security_invoker = true`; as RLS herdam das tabelas base — Master vê tudo da empresa, colaborador vê só o seu.
- A função RPC retorna o `signature_event_id` criado; o hook não precisa usá-lo (só invalida queries).
- O cliente Supabase ainda não tem tipos para a nova tabela/view/RPC — uso `as any` nos `from(...)` e `rpc(...)` (os tipos serão regenerados após o próximo build de schema).
- Nenhum edge function, nenhum bucket de storage tocado nesta sprint.

Quando aprovar, mudo para build mode e crio/edito esses 7 arquivos.
