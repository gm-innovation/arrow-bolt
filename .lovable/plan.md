

## Problema

O fluxo atual de admissão exige selecionar um usuário já cadastrado no sistema. Mas admissão é para candidatos que **ainda não têm conta**. O RH precisa:
1. Preencher nome e email do candidato
2. Gerar um link público de acesso
3. Enviar o link ao candidato
4. O candidato acessa o link, vê o checklist de documentos e faz upload sem precisar de conta

## Solução

### 1. Alterar a tabela `employee_onboarding`
- Tornar `user_id` nullable (candidato não tem conta ainda)
- Adicionar campos: `candidate_name`, `candidate_email`, `access_token` (UUID único para o link público)
- O `access_token` é o que permite acesso público sem autenticação

### 2. Criar rota pública `/onboarding/:token`
Página acessível sem login onde o candidato:
- Vê seu nome e a lista de documentos obrigatórios
- Faz upload de cada documento
- Vê status (pendente/aprovado/rejeitado) dos documentos já enviados

### 3. Atualizar o dialog "Nova Admissão" (HR)
Substituir os selects de Departamento/Colaborador por campos simples:
- **Nome do candidato** (texto)
- **Email do candidato** (texto)
- **Observações** (texto)

Após criar, exibir o link gerado com botão de copiar.

### 4. Atualizar a listagem de processos
Mostrar `candidate_name` em vez de buscar perfil do `user_id`.

### 5. RLS para acesso público
- Criar política `anon` na tabela `employee_onboarding` para SELECT usando `access_token`
- Criar política `anon` na tabela `onboarding_documents` para INSERT/SELECT vinculado ao `onboarding_id` acessível via token
- Política `anon` em `onboarding_document_types` para SELECT (já é pública para authenticated, precisa incluir anon)

### 6. Bucket de storage
Ajustar política do bucket `corp-documents` para permitir uploads anônimos no path `onboarding/*`.

### Arquivos alterados
- 1 migration SQL (alterar `employee_onboarding`, adicionar políticas anon)
- `src/pages/hr/Onboarding.tsx` -- novo formulário com nome/email, exibir link
- `src/hooks/useOnboarding.ts` -- adaptar createProcess e listagem
- `src/pages/onboarding/PublicOnboarding.tsx` -- **criar** página pública do candidato
- `src/App.tsx` -- adicionar rota pública `/onboarding/:token`
- `src/components/hr/OnboardingDetailDialog.tsx` -- mostrar link copiável

