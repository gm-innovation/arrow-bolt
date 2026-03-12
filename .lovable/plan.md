

## Problema

O botão "Criar" não faz nada porque o `companyId` está vazio. O código tenta buscar `user?.user_metadata?.company_id`, mas o `company_id` do usuário está no `profile` do AuthContext, não no `user_metadata`.

Linha 41 de `Onboarding.tsx`:
```typescript
const companyId = user?.user_metadata?.company_id || ...
```
Como não há processos existentes, o fallback também falha, e a condição `!companyId` na linha 44 faz o `handleCreate` retornar silenciosamente.

## Como funciona o fluxo do candidato

Sim, exatamente como você descreveu:
1. O RH preenche nome e email e clica "Criar"
2. O sistema gera um link público (ex: `https://arrow.lovable.app/onboarding/uuid-token`)
3. O RH copia e envia esse link ao candidato
4. O candidato acessa o link, vê o checklist de documentos e faz upload — **sem precisar de conta no sistema**

A rota `/onboarding/:token` e a página `PublicOnboarding.tsx` já existem. O problema é apenas que o processo não está sendo criado por causa do `companyId` vazio.

## Correção

### 1. `src/pages/hr/Onboarding.tsx`
- Importar `profile` do `useAuth()` em vez de depender de `user_metadata`
- Usar `profile?.company_id` como fonte do `companyId`

```typescript
const { user, profile } = useAuth();
const companyId = profile?.company_id || '';
```

Essa é a única alteração necessária. O resto do fluxo (criação, geração de link, página pública) já está implementado.

