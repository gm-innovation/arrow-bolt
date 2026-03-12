

## Adicionar logo da empresa na página pública de onboarding

### O que fazer
Buscar o `logo_url` da tabela `companies` usando o `company_id` do onboarding e exibir a logo centralizada acima do card.

### Alterações

**`src/hooks/useOnboarding.ts`** (hook `usePublicOnboarding`):
- Adicionar query para buscar `logo_url` da empresa (`companies`) usando `onboarding.company_id`
- Retornar `companyLogoUrl` no hook

**`src/pages/onboarding/PublicOnboarding.tsx`**:
- Receber `companyLogoUrl` do hook
- Renderizar `<img>` com a logo centralizada acima do `<Card>`, usando a URL pública do storage quando for um path relativo
- Fallback: não exibir nada se não houver logo configurada

### Layout resultante
```text
┌──────────────────────────┐
│                          │
│       [LOGO EMPRESA]     │  ← logo centralizada
│                          │
│  ┌────────────────────┐  │
│  │ Bem-vindo(a), ...  │  │
│  │ Documentos...      │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

