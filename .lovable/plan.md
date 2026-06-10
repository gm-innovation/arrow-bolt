# Onda 1 — Passo 2: Catálogo de Documentos Obrigatórios por Cargo (v2)

## Ajustes em relação à v1
Incorpora as duas observações:
1. **Fonte única de cargos** = `profiles.position` (campo texto). Hoje essa coluna não existe — vamos criá-la nesta migração para eliminar a ambiguidade.
2. **`applies_to_all` explícito** na tabela principal, em vez de inferir "todos" pela ausência de linhas na junção.

## Objetivo
Catálogo central de tipos de documento que o RH define uma única vez:
- quais são exigidos (RG, CPF, ASO, NR-10, CNH, etc.),
- para **quais cargos** se aplicam (ou para todos),
- validade e periodicidade de renovação,
- quem é responsável pelo alerta de vencimento (RH ou gestor direto).

## Mudanças no banco

### 1. Campo de cargo formal em `profiles`
```text
ALTER TABLE profiles ADD COLUMN position TEXT;
```
Texto livre (sem enum), preenchido pelo RH no perfil do colaborador. Será a **única fonte de verdade** para listar cargos.

### 2. Catálogo
```text
hr_document_catalog
  - company_id, name, code, description
  - category (identificacao | saude | seguranca | habilitacao | fiscal | contrato | outro)
  - is_required (bool, default true)
  - has_expiry (bool, default false)
  - default_validity_months (int, nullable)
  - renewal_warning_days (int, default 30)
  - responsible_role (hr | direct_manager | both)
  - applies_to_all (bool, default false)   -- explícito (Observação 2)
  - is_active (bool, default true)
```

### 3. Junção catálogo × cargos
```text
hr_document_catalog_positions
  - catalog_id (FK cascade)
  - position (text)         -- valor que casa com profiles.position
  - UNIQUE (catalog_id, position)
```

### Regra de aplicabilidade (documentada no banco via comment)
- `applies_to_all = true` → exigido de todos os colaboradores; tabela de junção é ignorada.
- `applies_to_all = false` e há linhas em `hr_document_catalog_positions` → exigido somente de colaboradores cujo `profiles.position` está na lista.
- `applies_to_all = false` e **sem** linhas → catálogo ainda **não configurado**; nenhuma pendência é gerada.

Trigger leve garante: se `applies_to_all = true`, apaga linhas órfãs na junção (evita estado inconsistente).

### RLS / GRANTs
- `SELECT` para `authenticated` da mesma empresa.
- `INSERT/UPDATE/DELETE` restritos a `hr`, `director`, `super_admin` via `has_role`.
- GRANTs padrão para `authenticated` e `service_role`.

## Front-end

1. **Hook** `src/hooks/useHRDocumentCatalog.ts`
   - `list`, `create`, `update`, `delete`.
   - `usePositions()` → `SELECT DISTINCT position FROM profiles WHERE position IS NOT NULL AND company_id = ... ORDER BY position` (única fonte).

2. **Componente** `src/components/hr/DocumentCatalog.tsx`
   - Tabela: Nome, Categoria, Aplicável a (`"Todos"` quando `applies_to_all`, senão badges dos cargos), Obrigatório, Validade, Alerta (dias), Responsável, Ações.
   - Filtros: busca, categoria, cargo.
   - Dialog de criação/edição:
     - Campos básicos (nome, código, descrição, categoria).
     - Switch **"Aplicar a todos os cargos"** (mapeia `applies_to_all`); quando ligado, esconde o multi-select de cargos.
     - Multi-select (Combobox com chips) de cargos vindos do hook `usePositions()`; obrigatório quando `applies_to_all = false`.
     - Switches `Obrigatório` e `Tem validade`; campo `Validade (meses)` condicional a `has_validade`.
     - Campo numérico `Alertar (dias antes)`.
     - Select `Responsável` (RH / Gestor direto / Ambos).

3. **Página de Configurações de RH** (`src/pages/hr/Settings.tsx`)
   - Nova aba **"Catálogo de Documentos"** ao lado de "Hierarquia".

4. **Cadastro de colaborador** (escopo mínimo desta entrega)
   - Adicionar input "Cargo" (`profiles.position`) no formulário de edição de colaborador em RH, para que o catálogo tenha cargos para listar.

## Fora do escopo
- Atribuir/gerar pendências automaticamente para colaboradores (Passo 3).
- Migração dos `onboarding_document_types` legados para o catálogo (depois que o RH validar).
- Job de alertas de vencimento (vai junto com a infraestrutura de notificações).

## Ordem de execução
1. Migração: `profiles.position` + 2 tabelas + RLS + grants + trigger.
2. Hook `useHRDocumentCatalog` + `usePositions`.
3. Componente `DocumentCatalog` + dialog.
4. Nova aba em `pages/hr/Settings.tsx`.
5. Input `position` no formulário de edição de colaborador.

Posso seguir?
