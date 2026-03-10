

## Plano: Fluxo de Aprovação Revisado (Diretoria Direta + Roteamento)

### Regras de negócio corrigidas

```text
PRODUTO / ASSINATURA (com valor):
  Criação → pending_director
  Diretoria aprova → pending_department
    - Produto → Suprimentos
    - Assinatura → Financeiro
  Se Suprimentos/Financeiro alterar valor → volta para pending_director
  Diretoria re-aprova → pending_department novamente

REEMBOLSO:
  Criação → pending_department (Financeiro direto, sem aprovação)
  Financeiro pode escalar → pending_director
  Diretoria aprova → retorna para pending_department (Financeiro)

DOCUMENTO / FOLGA:
  Criação → pending_department (RH direto)
```

### Alterações

**1. Banco de dados (UPDATE via insert tool)**
- `corp_request_types` — Produto e Assinatura: `requires_approval = false`, `requires_director_approval = true`, vincular `department_id` (Suprimentos / Financeiro)
- Reembolso: `requires_approval = false`, `requires_director_approval = false`, `department_id` = Financeiro
- Folga/Férias: `requires_approval = false`, `requires_director_approval = false`, `department_id` = RH
- Documento: idem RH

**2. Migração: novos status + coluna `approved_amount`**
- Adicionar coluna `approved_amount` em `corp_requests` para rastrear valor aprovado (detectar alteração)
- Adicionar status `pending_department` e `in_progress` ao statusMap

**3. `src/components/corp/NewRequestDialog.tsx`**
- `determineStatus()`: 
  - Se tipo tem `requires_director_approval` → `pending_director`
  - Se tipo tem `department_id` e não requer aprovação → `pending_department`
  - Senão → `open`

**4. `src/hooks/useCorpRequests.ts`**
- Remover `approveAsManager` (não existe mais gerente no fluxo)
- `approveAsDirector`: status final = `pending_department` (se tipo tem `department_id`), salvar `approved_amount`
- Nova mutation `escalateToDirector`: Financeiro escala reembolso → `pending_director`
- Nova mutation `updateDepartmentAmount`: atualiza valor e se diferente do `approved_amount` → volta para `pending_director`
- Novas mutations: `startDepartmentWork` (→ `in_progress`), `completeDepartmentWork` (→ `completed`)

**5. `src/components/corp/ApprovalActions.tsx`**
- Remover lógica de gerente
- Diretoria: pode aprovar quando `pending_director`
- Departamento executor (Suprimentos/Financeiro/RH): pode "Iniciar" e "Concluir" quando `pending_department`
- Financeiro: botão "Encaminhar para Diretoria" em reembolsos
- Suprimentos/Financeiro: campo para alterar valor (dispara retorno à diretoria)

**6. `src/components/corp/RequestDetailSheet.tsx`**
- Novos status no mapa: `pending_department`, `in_progress`
- Timeline ajustada: sem gerente, mostrar fluxo Diretoria → Departamento
- Remover referências a "Gerente"

**7. `src/pages/corp/Requests.tsx`**
- Aba "Recebidas": filtrar por `department_id` do departamento do usuário quando status = `pending_department` ou `in_progress`
- Remover lógica de `pending_manager` na filtragem de manager

### Arquivos alterados
- **DB Migration**: coluna `approved_amount` em `corp_requests`
- **DB Insert**: UPDATE nos `corp_request_types`
- `src/hooks/useCorpRequests.ts`
- `src/components/corp/NewRequestDialog.tsx`
- `src/components/corp/ApprovalActions.tsx`
- `src/components/corp/RequestDetailSheet.tsx`
- `src/pages/corp/Requests.tsx`

