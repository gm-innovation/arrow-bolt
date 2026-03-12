

## Prontuário do Funcionário — Área HR

### Objetivo
Criar uma nova página `/hr/employees` com a ficha completa de cada colaborador da empresa, consolidando documentos, histórico e anotações do RH em um único lugar.

### O que existe hoje
- **`/hr/technicians`**: Lista apenas técnicos com documentos (ASO, certificações). Não cobre outros cargos.
- **Tabelas existentes**: `profiles`, `technicians`, `technician_documents`, `user_roles`, `corp_documents`, `technician_absences`, `time_entries`.
- **Não existe**: tabela de anotações/observações do RH sobre funcionários.

### O que será criado

#### 1. Nova tabela: `employee_notes`
```sql
CREATE TABLE employee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  note_type TEXT NOT NULL DEFAULT 'general', -- general, warning, praise, medical, administrative
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_confidential BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
Com RLS para HR/Director da mesma empresa.

#### 2. Nova página: `/hr/employees`

**Listagem principal:**
- Tabela com todos os colaboradores da empresa (não só técnicos)
- Colunas: Avatar, Nome, Cargo (role label), Departamento, Data de admissão, Status (ativo/inativo)
- Filtros por departamento, cargo e busca por nome
- Botão para abrir ficha completa

**Ficha do funcionário (Dialog/Sheet lateral):**
Organizada em abas:

- **Dados Pessoais**: Nome, email, telefone, CPF, RG, data nascimento, data admissão, departamento, cargo
- **Documentos**: Lista unificada de:
  - Documentos corporativos (`corp_documents` filtrado por `owner_user_id`)
  - Documentos técnicos (`technician_documents` se for técnico)
  - Download via blob (padrão já implementado)
- **Histórico**: Timeline consolidada com:
  - Ausências (`technician_absences`)
  - Mudanças de cargo (se houver)
  - Processos de onboarding (`employee_onboarding`)
- **Anotações**: CRUD de notas do RH com tipo (geral, advertência, elogio, médico, administrativo), marcação de confidencial

#### 3. Rota e menu
- Adicionar `/hr/employees` no `App.tsx` e no menu lateral (`DashboardLayout.tsx`)
- Ícone: `Users` — título: "Colaboradores"

### Arquivos a criar/alterar
- **Criar**: `src/pages/hr/Employees.tsx` (página principal + ficha)
- **Criar**: `src/hooks/useEmployeeNotes.ts` (CRUD de anotações)
- **Alterar**: `src/App.tsx` (nova rota)
- **Alterar**: `src/components/DashboardLayout.tsx` (novo item no menu)
- **Migration**: Criar tabela `employee_notes` + RLS policies

