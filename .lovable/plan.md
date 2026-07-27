# Nova categoria "Materiais de Marketing" + departamento "Marketing"

## Contexto verificado

- Tipos de solicitação vivem em `corp_request_types` com uma coluna `category` (texto). Hoje há 6 categorias hardcoded: `product`, `subscription`, `document`, `time_off`, `reimbursement`, `general`, criadas por `auto_create_corp_request_types_for_company()` em cada nova empresa.
- O formulário `src/components/corp/NewRequestDialog.tsx` mapeia rótulo/ícone/ordem por categoria (`categoryLabels`, `categoryIcons`, `CATEGORY_ORDER`) e escolhe o departamento destinatário via `useDepartments()` (tabela `departments`).
- Não existe seed automático de "Marketing" em `departments`. O trigger `auto_assign_department_on_role` mapeia roles → nomes de departamento, mas **não inclui** a role `marketing` (que já existe no enum `app_role`), então usuários de marketing nunca alimentam esse departamento e ele não aparece no dropdown.

## Escopo

### 1. Backend (uma migration)

- Atualizar `auto_create_corp_request_types_for_company()` para incluir a nova linha:
  `('Materiais de Marketing', 'marketing_materials', true, true)`.
- Backfill: inserir o tipo `marketing_materials` para todas as empresas existentes que ainda não o tenham.
- Atualizar `auto_assign_department_on_role()` (nos dois blocos CASE, INSERT e cleanup do UPDATE) para mapear `marketing` → `'Marketing'`.
- Backfill: para cada empresa, criar o departamento `Marketing` se não existir, e popular `department_members` com todos os `user_roles` que tenham role `marketing`.

Sem novas tabelas → nenhum GRANT/RLS novo é necessário (usa infra existente).

### 2. Frontend (`src/components/corp/NewRequestDialog.tsx`)

- Adicionar `marketing_materials` em:
  - `categoryLabels` → "Materiais de Marketing"
  - `categoryIcons` → ícone `Megaphone` (lucide-react)
  - `CATEGORY_ORDER` → posicionar logo após `product` (ex.: product=0, marketing_materials=1, document=2, ...)
- Incluir `marketing_materials` no array `showTarget` para exibir o seletor de departamento/destinatário (o dropdown de departamentos já mostrará "Marketing" automaticamente após o backfill).
- Reaproveitar a mesma UX de "Produto / Material" (lista de itens com nome/quantidade/valor/link) para materiais de marketing — condicionar `productItems`/`showAmount` também à categoria `marketing_materials`.

### 3. Sem mudanças de tipo TS

`corp_request_types.category` é `text`; nada precisa ser regenerado. O valor `marketing_materials` já é aceito pela coluna.

## Critérios de aceite mapeados

1. Dropdown "Categoria" em `/admin/requests` (Nova Solicitação) mostra "Materiais de Marketing" ✔ — vem do seed/backfill em `corp_request_types` + `categoryLabels`.
2. Ao selecionar a categoria, o campo "Departamento destinatário" mostra "Marketing" ✔ — vem do backfill em `departments` + `showTarget`.
3. Persistência: a solicitação salva em `corp_requests` com `request_type_id` apontando para o tipo `marketing_materials` e `department_id` do departamento "Marketing" ✔ — o fluxo de submit atual já cobre.

## Ordem de execução

1. Migration (schema function + backfills de tipos, departamento e membros).
2. Edit em `NewRequestDialog.tsx` (labels, ícone, ordem, showTarget, condicionais de produto).
3. Verificação manual rápida no preview: abrir Nova Solicitação, confirmar categoria e departamento.
