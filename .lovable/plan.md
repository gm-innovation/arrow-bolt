## Diagnóstico

Investiguei a página `/hr/recruitment` (aba "Link público") e o storage:

**Causa raiz do bug**: A tabela `companies` só tem política de UPDATE para `super_admin`. Não existe política permitindo que perfis **HR / director / admin** atualizem a própria empresa. Por isso:

- Salvar "Domínio público do site" (`public_site_base_url`) → falha silenciosa via RLS (linha 91-94 de `Recruitment.tsx`).
- Upload da logo: o arquivo até sobe para o bucket `company-logos` (as políticas do storage já permitem HR/director/admin), mas o `UPDATE companies SET logo_url = ...` (linha 127-130) é bloqueado pelo RLS. Resultado: a logo fica órfã no bucket e a UI continua mostrando "Sem logo configurada".

**O que já está correto** (não precisa mexer):
- Bucket `company-logos` existe, é público e tem policies de INSERT/UPDATE/DELETE para HR/director/admin.
- Componente `Recruitment.tsx` faz as chamadas corretas.

## Correção

Migration única adicionando policy de UPDATE em `public.companies`:

```sql
CREATE POLICY "HR/director/admin can update own company"
ON public.companies FOR UPDATE
TO authenticated
USING (
  id = user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'hr'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  id = user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'hr'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
```

Escopo: qualquer coluna da própria empresa. Isso destrava tanto o "Salvar domínio" quanto o vínculo `logo_url` do upload da logo, e permite futuras edições de dados da empresa por HR/diretoria sem novas migrations.

## Validação

Após aplicar a migration:
1. Login como HR → `/hr/recruitment` → aba "Link público" → editar domínio → **Salvar** → toast "Domínio público atualizado" e valor persiste ao recarregar.
2. Enviar logo (PNG/JPG ≤2MB) → toast "Logo atualizada", thumbnail aparece, aviso "Sem logo configurada" some.
3. Sem regressão: super_admin continua com acesso total via policy existente.
