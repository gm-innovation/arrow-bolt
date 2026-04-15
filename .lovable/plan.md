
## Unificar Gestão de Colaboradores e Adicionar Contato de Emergência

### Problema
- Upload de documentos no cadastro só funciona para técnicos
- Tipos de documentos limitados (faltam CPF, certidão de casamento, comprovante de residência, etc.)
- Não existe campo de contato de emergência

### Alterações

**1. Migration SQL** — Adicionar ao `profiles`:
- `emergency_contact_name` (text, nullable)
- `emergency_contact_phone` (text, nullable)

**2. `src/components/hr/NewEmployeeForm.tsx`**:
- Mover seção de upload de documentos para FORA do bloco `isTechnician` — disponível para todos os cargos
- Adicionar campos de contato de emergência (nome e telefone)
- Expandir tipos de documento reconhecidos (manter lógica de ASO/certificações apenas se técnico, mas permitir upload genérico para todos)
- Ajustar texto do upload para ser genérico: "Documentos pessoais (CPF, RG, comprovante de residência, certidão, etc.)"

**3. `src/components/hr/EmployeeDetailSheet.tsx`**:
- `PersonalTab`: Adicionar campos editáveis de contato de emergência (nome + telefone)
- `DocumentsTab`: Expandir os tipos de documento no select para incluir: `cpf_doc`, `rg_doc`, `certidao_casamento`, `comprovante_residencia`, `ctps`, `titulo_eleitor`, `reservista`, `cnh`, além dos existentes
- Salvar/buscar `emergency_contact_name` e `emergency_contact_phone` do profiles

**4. `src/pages/hr/Employees.tsx`**:
- Adicionar `emergency_contact_name` e `emergency_contact_phone` ao select e ao tipo `EmployeeRow`

### Arquivos editados:
1. Migration SQL — `emergency_contact_name`, `emergency_contact_phone` no profiles
2. `src/components/hr/NewEmployeeForm.tsx` — upload para todos, contato de emergência
3. `src/components/hr/EmployeeDetailSheet.tsx` — campos de emergência + tipos de doc expandidos
4. `src/pages/hr/Employees.tsx` — tipo e query atualizados
