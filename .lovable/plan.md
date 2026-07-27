## Objetivo
Transformar a lista de colaboradores em `/admin/employee-documents` num **acordeão**: cada colaborador vira uma linha compacta que expande para revelar a tabela de documentos que já existe hoje.

## Escopo
Somente `src/pages/admin/EmployeeDocuments.tsx` (componente `Directory`). Nenhuma alteração de dados, hooks, RLS ou fluxo de "Criar pacote".

## Como fica

```text
▸ FILIPE FRANCISCO DE SOUSA       Técnico   6 docs • 2 vencidos     [2 selecionados]
▸ ADRIANO MOURA VALE              Auxiliar  4 docs                  
▾ RAYANE SILVA                    RH        5 docs • 1 a vencer     [1 selecionado]
   ┌─ Tipo ─────── Emissão ── Validade ── Situação ── Ações ─┐
   │ ASO           2026-01-07 2027-01-05  Disponível  Baixar │
   │ NR 33         2025-01-24 2026-01-24  Vencido     Baixar │
   │ ...                                                     │
   └─────────────────────────────────────────────────────────┘
```

## Mudanças

1. Trocar o `map` que renderiza um `<Card>` por colaborador por um `<Accordion type="multiple">` do shadcn (`@/components/ui/accordion`).
2. Cada `AccordionItem` (um por colaborador) mostra no **trigger**:
   - Nome (bold) e cargo em muted à direita.
   - Badges resumo calculados em memo: total de docs disponíveis, quantos vencidos, quantos "a vencer em 30 dias", quantos "sem arquivo".
   - Contador de itens selecionados daquele colaborador (quando > 0), para não perder o feedback ao colapsar.
3. Dentro de `AccordionContent`, renderizar a `<Table>` existente (mesmas colunas, mesmo checkbox, mesmo botão "Baixar", mesma lógica de `getSignedDocUrl` e `toggle`).
4. Manter busca (`q`), botão "Criar pacote (N)" no topo e o `PackageDialog` como estão.
5. Comportamento de expansão:
   - Estado `expanded: string[]` controlado (para permitir que a busca auto-expanda resultados quando `q` não estiver vazio).
   - Quando `q` vazio: todos colapsados por padrão.
   - Quando `q` não vazio: expande automaticamente os filtrados.
6. Estados vazios preservados (loading e "nenhum colaborador com documentos").

## Detalhes técnicos
- Sem novas dependências: `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` já existem em `src/components/ui/accordion.tsx`.
- `useMemo` para os contadores por colaborador evita recomputar a cada render.
- Nenhuma mudança no tipo do array retornado por `useCoordinatorEmployeeDocs`.
- Sem alteração no `EmployeeDetailSheet` (ficha do colaborador do RH).
