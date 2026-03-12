

## Problemas identificados

### 1. Botão "Adicionar" não funciona
Mesmo bug anterior: linha 24 usa `user?.user_metadata?.company_id` que é vazio. Precisa usar `profile?.company_id` do `useAuth()`.

### 2. Diferenciar documentos por vaga/posição
Atualmente todos os tipos de documento são globais para a empresa. Precisamos permitir que alguns sejam universais (todas as vagas) e outros específicos por posição/cargo.

## Solução

### Migration SQL
- Adicionar coluna `position_tag` (text, nullable) na tabela `onboarding_document_types`
  - `NULL` = documento padrão para todas as posições
  - Valor preenchido (ex: "Motorista", "Engenheiro") = específico daquela posição
- Adicionar coluna `position_tag` (text, nullable) na tabela `employee_onboarding` para indicar a posição do candidato

### `src/pages/hr/OnboardingSettings.tsx`
- Corrigir `companyId` → usar `profile?.company_id`
- Adicionar campo "Posição/Cargo" (input texto) ao formulário — deixar vazio = padrão para todos
- Na tabela, mostrar coluna "Aplicável a" com badge "Todas" ou nome da posição
- Filtro por posição na listagem

### `src/pages/hr/Onboarding.tsx`
- Adicionar campo "Cargo/Posição" ao criar processo de admissão

### `src/pages/onboarding/PublicOnboarding.tsx`
- Filtrar tipos de documento: mostrar os globais (`position_tag IS NULL`) + os da posição específica do candidato

### `src/hooks/useOnboarding.ts`
- Ajustar query de `usePublicOnboarding` para filtrar por `position_tag`

### Arquivos alterados
- 1 migration SQL (adicionar `position_tag`)
- `src/pages/hr/OnboardingSettings.tsx` (fix companyId + campo posição)
- `src/pages/hr/Onboarding.tsx` (campo cargo)
- `src/pages/onboarding/PublicOnboarding.tsx` (filtro por posição)
- `src/hooks/useOnboarding.ts` (query ajustada)

