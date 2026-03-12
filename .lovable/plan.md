

## Transformar "Novo Técnico" em "Novo Colaborador"

### Problema
1. O botão diz "Novo Técnico" e o formulário é específico para técnicos
2. O `role` no formulário é um campo texto livre para especialidade (ex: "Técnico de Eletrônica"), mas na chamada ao `create-user` sempre envia `role: 'technician'`
3. O filtro de cargos só mostra roles que já existem nos colaboradores atuais — comportamento correto, mas se só existe RH, só aparece RH

### Solução

#### 1. Criar novo formulário `NewEmployeeForm`
- Campo **Cargo** (select obrigatório) com todas as opções: Técnico, Coordenador, RH, Comercial, Diretor, Suprimentos, Qualidade, Financeiro
- Campos comuns a todos: Nome, Email, Telefone, CPF, RG, Data Nascimento, Gênero, Senha
- Campos **condicionais** (só aparecem se cargo = Técnico): Especialidade, ASO, Dados Médicos, Upload de documentos (ASO/Certificações), Foto
- Reutilizar lógica de upload e classificação de documentos do `NewTechnicianForm`

#### 2. Atualizar `Employees.tsx`
- Botão: "Novo Colaborador" em vez de "Novo Técnico"
- Dialog title: "Cadastrar Novo Colaborador"
- Lógica de criação: enviar o cargo selecionado ao `create-user` (não mais hardcoded `'technician'`)
- Campos técnicos (specialty, ASO, docs) só processados se cargo = technician

#### 3. Atualizar `create-user` edge function
- Já suporta todos os roles — nenhuma alteração necessária

#### 4. Filtro de cargos na listagem
- Manter o comportamento atual (mostrar apenas cargos existentes) — é o correto. Os cargos aparecerão conforme colaboradores forem cadastrados com diferentes funções.

### Arquivos
- **Criar**: `src/components/hr/NewEmployeeForm.tsx` — formulário genérico baseado no `NewTechnicianForm`, com seções condicionais para técnico
- **Alterar**: `src/pages/hr/Employees.tsx` — usar `NewEmployeeForm`, atualizar labels e lógica de criação
- **Não altera**: edge function `create-user` (já suporta todos os roles)

