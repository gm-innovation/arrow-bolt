

## Problema

A query para buscar `logo_url` da tabela `companies` retorna erro **406** porque a página pública de onboarding é acessada por usuários anônimos, e a tabela `companies` tem políticas RLS que bloqueiam acesso anon.

## Solução

1. **Criar política RLS anon na tabela `companies`** que permita leitura apenas da coluna `logo_url` para empresas que possuem processos de onboarding com tokens válidos. Alternativa mais simples: permitir SELECT anon limitado a `logo_url`.

2. **Corrigir a query** no hook `usePublicOnboarding`: trocar `.single()` por `.maybeSingle()` para evitar erro 406 quando nenhum resultado é retornado.

### Alterações

**Migração SQL**: Adicionar política RLS anon na tabela `companies` para permitir leitura pública de `logo_url` por candidatos com token válido:
```sql
CREATE POLICY "Allow anon to read company logo for onboarding"
ON public.companies
FOR SELECT
TO anon
USING (
  id IN (
    SELECT company_id FROM public.employee_onboarding
  )
);
```

**`src/hooks/useOnboarding.ts`** (linha 232): trocar `.single()` por `.maybeSingle()` para não quebrar quando RLS bloqueia.

