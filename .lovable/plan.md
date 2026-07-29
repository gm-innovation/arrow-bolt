## Diagnóstico (confirmado)

O item "Solicitações" aponta corretamente para `/corp/requests` (`src/components/corp/CorpLayout.tsx`). O problema está no guarda de rota:

- `src/components/corp/CorpRoute.tsx` define `ALL_CORP_ROLES` sem o papel `marketing`.
- `src/components/ProtectedRoute.tsx` redireciona quem não está na lista para `getRoleRedirectPath(role)`.
- `src/lib/roleRedirect.ts` mapeia `marketing → /commercial/dashboard`.

Resultado: usuário marketing clica em Solicitações e é jogado no Dashboard Comercial. Isso afeta **todo** o módulo Corp para marketing (feed, grupos, documentos, universidade, meus documentos), não só Solicitações.

Além disso, `roleToUserType` no mesmo arquivo não tem `marketing`, então o layout cairia no fallback `admin` (sidebar errada).

## Correção

1. **`src/components/corp/CorpRoute.tsx`**
   - Incluir `marketing` em `ALL_CORP_ROLES`.
   - Adicionar `marketing: "commercial"` em `roleToUserType`, alinhado ao que já é feito em `src/components/account/AccountLayoutRoute.tsx`.
   - Manter a tipagem do `Record` existente (o valor `"commercial"` já é aceito).

2. **Verificação de rotas Corp em `src/App.tsx`**
   - Conferir se as rotas `/corp/*` usam `CorpLayoutRoute`/`CorpRoute` (herdando a lista corrigida) ou se alguma passa `allowedRoles` própria que também precise incluir `marketing`. Rotas restritas de propósito (`CorpAdminLayoutRoute`, relatórios) permanecem inalteradas.

3. **Validação**
   - Rodar o typecheck.
   - Abrir a preview autenticada como usuário marketing e confirmar que `/corp/requests` renderiza a página de Solicitações com a sidebar comercial, sem redirecionamento.

## Fora de escopo

Nenhuma mudança de banco, RLS ou políticas: o acesso a `corp_requests` continua controlado pelas policies existentes por `company_id`/usuário. A correção é apenas na camada de roteamento do frontend, preservando pt-BR e os padrões atuais.