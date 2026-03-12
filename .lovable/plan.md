

## Problema

O erro `null value in column "uploaded_by"` ocorre porque a página pública do candidato não tem usuário autenticado. A coluna `uploaded_by` é `NOT NULL`, mas no fluxo público não existe `auth.uid()`.

## Correção

### 1. Migration SQL
- Tornar `uploaded_by` nullable na tabela `onboarding_documents` (candidatos externos não têm conta)

```sql
ALTER TABLE onboarding_documents ALTER COLUMN uploaded_by DROP NOT NULL;
```

### 2. `src/hooks/useOnboarding.ts`
- No `uploadDocument` do `usePublicOnboarding`, o insert já não envia `uploaded_by` — com a coluna nullable, vai funcionar.

### 3. RLS
- Verificar se as políticas de insert/storage permitem acesso anon para o fluxo público.

### Arquivos alterados
- 1 migration SQL
- Nenhuma alteração de código necessária (o hook público já não envia `uploaded_by`)

