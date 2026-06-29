# Correção da edição de metadados do GED

## Diagnóstico

**1. "Não está salvando / não aplica as alterações"**
O `update.mutateAsync` em `useQualityDocuments.ts` invalida apenas a query da lista (`["quality_documents"]`). A página `DocumentDetail.tsx` lê de `useQualityDocument(id)`, cuja chave é `["quality_document", id]` — essa query **nunca é invalidada**, então o React Query devolve o cache antigo e a UI continua mostrando a data anterior (mesmo com o toast "Metadados atualizados" — o banco foi atualizado, só a tela não recarregou).

**2. "Não aplicou ao que já foi criado"**
A correção do `approveAndPublish` calcula `next_review_date` somente em publicações novas. Documentos já publicados (como a "Política da Qualidade" com data 20/06/2026) mantêm o valor antigo. Hoje só dá para corrigir um a um pelo diálogo de edição — que está com o bug acima e por isso parece "não funcionar".

## O que será feito

### 1. Corrigir invalidação de cache no `update`
Em `src/hooks/useQualityDocuments.ts`, ajustar o `onSuccess` da mutation `update` para invalidar também a query do detalhe:

```ts
onSuccess: (data) => {
  qc.invalidateQueries({ queryKey: ["quality_documents"] });
  if (data?.id) qc.invalidateQueries({ queryKey: ["quality_document", data.id] });
}
```

Mesmo tratamento para `markObsolete` e `reactivate` (já invalidam via `invalidate()` interno — confirmar). Resultado: ao salvar metadados, a página atualiza imediatamente.

### 2. Botão "Recalcular próxima revisão" no detalhe
Em `DocumentDetail.tsx`, ao lado do botão "Editar metadados", adicionar ação **"Recalcular próxima revisão"** (visível apenas para `qualidade`/`director`/`coordinator` e quando o documento estiver `published`). Comportamento:

- Lê `document_review_months` de `quality_settings` (default 12).
- Calcula `published_at + N meses` usando `addMonths` do `date-fns` e `format(..., 'yyyy-MM-dd')` (evita drift de timezone — regra do projeto).
- Chama o `update` com o novo `next_review_date`.
- Mostra confirmação no toast com a nova data.

Isso destrava a correção retroativa dos documentos já publicados sem precisar editar manualmente.

### 3. Pequenos ajustes no diálogo de edição
- Usar `addMonths`/`date-fns` em vez de manipulação manual de `Date` (consistência com a regra de timezone).
- Garantir `aria-describedby` no `DialogContent` (warning atual no console).
- Após salvar, o diálogo já fecha; com a correção do cache, o card de "Próxima revisão" reflete o novo valor sem refresh.

## Arquivos afetados

- `src/hooks/useQualityDocuments.ts` — invalidação correta no `update` (e revisar `markObsolete`/`reactivate`).
- `src/pages/quality/DocumentDetail.tsx` — botão "Recalcular próxima revisão".
- `src/components/quality/EditDocumentMetadataDialog.tsx` — ajuste menor de acessibilidade.

## Fora de escopo

- Migração em massa recalculando `next_review_date` de todos os documentos publicados de uma vez. Pode ser feita depois se a Qualidade preferir um botão "Recalcular todos" em `/quality/settings` — me avise se quiser incluir.
