

## Plano: Gestão Documental do RH e Portal de Admissão

### Contexto
Duas necessidades distintas mas complementares:
1. **RH envia documentos proativamente** (holerites, informes de rendimentos, etc.) sem o funcionário solicitar
2. **Portal de Admissão** onde novos funcionários enviam documentação obrigatória para o RH, com acompanhamento de status

### Parte 1 — Envio proativo de documentos pelo RH

O sistema já possui `corp_documents` e o `DocumentUploadDialog` com mode `hr`. Ajustes necessários:

**1.1 Adicionar tipos de documento faltantes**
- Adicionar `income_report` (Informe de Rendimentos) e `contract` (Contrato) aos tipos disponíveis para HR

**1.2 Nova página dedicada no menu HR: "Documentos"**
- Rota `/hr/documents` com visão consolidada de todos documentos enviados pelo RH
- Filtros por colaborador, tipo, departamento e período
- Possibilidade de envio em lote (mesmo documento para vários colaboradores)
- Adicionar item "Documentos" ao `hrMenuItems` no DashboardLayout

### Parte 2 — Portal de Admissão (Onboarding)

**2.1 Nova tabela `employee_onboarding`**
```sql
CREATE TABLE employee_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, archived
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  notes text
);
```

**2.2 Nova tabela `onboarding_document_types`**
Define quais documentos são obrigatórios para admissão:
```sql
CREATE TABLE onboarding_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL, -- "RG", "CPF", "Comprovante de Residência", etc.
  description text,
  is_required boolean DEFAULT true,
  sort_order integer DEFAULT 0
);
```

**2.3 Nova tabela `onboarding_documents`**
Documentos enviados pelo funcionário no processo de admissão:
```sql
CREATE TABLE onboarding_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL REFERENCES employee_onboarding(id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES onboarding_document_types(id),
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  status text DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason text,
  uploaded_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);
```

**2.4 Páginas e componentes**

Para o **RH** (`/hr/onboarding`):
- Lista de processos de admissão ativos com progresso (X de Y documentos enviados)
- Criar novo processo de admissão (selecionar colaborador)
- Visualizar documentos de cada funcionário, aprovar ou rejeitar com motivo
- Configurar tipos de documentos obrigatórios (`/hr/onboarding/settings`)

Para o **Funcionário** (na área corp existente):
- Nova aba "Meus Documentos" no `/corp/dashboard` ou página dedicada
- Checklist visual mostrando quais documentos foram enviados e quais faltam
- Upload direto por tipo de documento
- Status de cada documento (Pendente, Aprovado, Rejeitado com motivo)

**2.5 Menu e rotas**
- Adicionar "Documentos" e "Admissão" ao menu HR
- Adicionar rota `/hr/documents` e `/hr/onboarding`
- Na área corp, link para a documentação pessoal do funcionário

### Parte 3 — Área pessoal de documentos do funcionário

Cada funcionário terá uma página `/corp/my-documents` com:
- Todos os documentos recebidos do RH (holerites, informes, etc.)
- Documentos de admissão com status
- Histórico completo da documentação pessoal

### Resumo de arquivos

| Ação | Arquivo |
|------|---------|
| Migração | Nova tabela `employee_onboarding`, `onboarding_document_types`, `onboarding_documents` + RLS |
| Criar | `src/pages/hr/Documents.tsx` — Gestão de documentos do RH |
| Criar | `src/pages/hr/Onboarding.tsx` — Portal de admissão (lado RH) |
| Criar | `src/pages/hr/OnboardingSettings.tsx` — Config. tipos de docs obrigatórios |
| Criar | `src/pages/corp/MyDocuments.tsx` — Área pessoal do funcionário |
| Criar | Componentes auxiliares (OnboardingChecklist, DocumentReviewDialog, etc.) |
| Editar | `src/components/DashboardLayout.tsx` — Adicionar itens ao menu HR |
| Editar | `src/App.tsx` — Novas rotas |
| Editar | `src/components/corp/DocumentUploadDialog.tsx` — Novos tipos de doc |

